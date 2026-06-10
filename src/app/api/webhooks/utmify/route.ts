// Webhook receiver UTMify — atribuição de origem de vendas.
//
// Fluxo:
// 1. Encontra a conexão UTMify configurada (category='atribuicao', provider='utmify')
// 2. Valida assinatura
// 3. Parseia o evento com utmifyAdapter
// 4. Tenta casar com uma venda existente em sales:
//    a. Por external_id (preferencial)
//    b. Por buyer_email + amount + janela de 10 min
// 5. Se casou: UPDATE sales SET utm = event.utm
// 6. Se não casou (race condition): INSERT em utmify_queue para casar depois
// 7. Loga em webhook_logs
//
// NUNCA cria venda nova. NUNCA altera amount/fees em sales.

import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptCredentials } from '@/lib/crypto/credentials';
import { utmifyAdapter } from '@/lib/integrations/adapters/utmify';
import type { AttributionEvent } from '@/lib/integrations/types';

// Janela para matching fuzzy (10 min)
const MATCH_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    await logWebhook(admin, null, 'error', {}, null, 'JSON inválido');
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Busca TODAS as conexões UTMify ativas (multi-tenant)
  const { data: connections } = await admin
    .from('integration_connections')
    .select('id, operation_id, dashboard_id, config, credentials_encrypted, status')
    .eq('provider', 'utmify')
    .eq('category', 'atribuicao');

  if (!connections || connections.length === 0) {
    await logWebhook(admin, null, 'ignored', payload as Record<string, unknown>, null, 'Sem conexão UTMify configurada');
    return NextResponse.json({ received: true, status: 'no_connection' });
  }

  for (const conn of connections as {
    id: string; operation_id: string; dashboard_id: string | null;
    config: Record<string, unknown>; credentials_encrypted: string | null; status: string;
  }[]) {
    let secret = '';
    if (conn.credentials_encrypted) {
      try {
        const creds = JSON.parse(decryptCredentials(conn.credentials_encrypted)) as Record<string, string>;
        secret = creds['webhook_secret'] ?? creds['secret'] ?? '';
      } catch { /* credenciais corrompidas */ }
    }

    if (secret && !utmifyAdapter.validateSignature(payload, rawBody, secret)) {
      await logWebhook(admin, conn.operation_id, 'error', payload as Record<string, unknown>, null, 'Assinatura inválida');
      continue;
    }

    const event = utmifyAdapter.parse(payload);
    if (!event) {
      await logWebhook(admin, conn.operation_id, 'ignored', payload as Record<string, unknown>, null, 'Sem dados UTM suficientes');
      continue;
    }

    // Tenta casar com venda existente
    const matched = await findMatchingSale(admin, conn.operation_id, conn.dashboard_id, event);

    if (matched) {
      // Enriquece a venda com os dados UTM
      await admin.from('sales').update({ utm: event.utm }).eq('id', matched.id);
      await admin.from('integration_connections')
        .update({ last_event_at: new Date().toISOString(), status: 'conectada' })
        .eq('id', conn.id);
      await logWebhook(admin, conn.operation_id, 'ok',
        payload as Record<string, unknown>,
        event as unknown as Record<string, unknown>,
        null
      );
    } else {
      // Race condition: venda ainda não chegou → enfileira para casar depois
      await admin.from('utmify_queue').insert({
        operation_id: conn.operation_id,
        external_id:  event.external_id,
        buyer_email:  event.buyer_email,
        amount:       event.amount > 0 ? event.amount : null,
        occurred_at:  event.occurred_at,
        utm:          event.utm,
        ad_data:      event.ad_data,
        raw:          event.raw,
      });
      await admin.from('integration_connections')
        .update({ last_event_at: new Date().toISOString(), status: 'conectada' })
        .eq('id', conn.id);
      await logWebhook(admin, conn.operation_id, 'ok',
        payload as Record<string, unknown>,
        event as unknown as Record<string, unknown>,
        'Venda não encontrada — enfileirado para casar depois'
      );
    }
  }

  return NextResponse.json({ received: true });
}

// Tenta encontrar a venda em sales pelo external_id ou por email+valor+janela de tempo.
// Prioriza external_id (exato). Fallback: fuzzy match.
async function findMatchingSale(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  operationId: string,
  dashboardId: string | null,
  event: AttributionEvent
): Promise<{ id: string } | null> {
  // Check 1: external_id exato
  if (event.external_id) {
    let q = admin
      .from('sales')
      .select('id')
      .eq('operation_id', operationId)
      .eq('external_id', event.external_id);
    if (dashboardId) q = q.eq('dashboard_id', dashboardId);
    const { data: byId } = await q.maybeSingle();
    if (byId) return byId as { id: string };
  }

  // Check 2: buyer_email + janela de 10 min
  if (event.buyer_email && event.amount > 0) {
    const t = new Date(event.occurred_at).getTime();
    const windowStart = new Date(t - MATCH_WINDOW_MS).toISOString();
    const windowEnd   = new Date(t + MATCH_WINDOW_MS).toISOString();

    let q = admin
      .from('sales')
      .select('id')
      .eq('operation_id', operationId)
      .eq('buyer_email', event.buyer_email)
      .gte('occurred_at', windowStart)
      .lte('occurred_at', windowEnd);
    if (dashboardId) q = q.eq('dashboard_id', dashboardId);
    const { data: byFuzzy } = await q.maybeSingle();
    if (byFuzzy) return byFuzzy as { id: string };
  }

  return null;
}

async function logWebhook(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  operationId: string | null,
  status: 'ok' | 'error' | 'ignored',
  payload: Record<string, unknown>,
  normalized: Record<string, unknown> | null,
  errorMsg: string | null
) {
  await admin.from('webhook_logs').insert({
    provider: 'utmify',
    operation_id: operationId,
    status,
    payload,
    normalized,
    error_msg: errorMsg,
  }).then(() => {});
}

// GET: últimos eventos (debug)
export async function GET() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { data: logs } = await admin
    .from('webhook_logs')
    .select('id, status, normalized, error_msg, received_at')
    .eq('provider', 'utmify')
    .order('received_at', { ascending: false })
    .limit(20);

  return NextResponse.json({
    provider: 'utmify',
    note: 'Últimos 20 eventos UTMify (webhook_logs)',
    logs: logs ?? [],
  });
}
