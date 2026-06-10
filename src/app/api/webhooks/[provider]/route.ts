// Webhook receiver único — /api/webhooks/[provider]
//
// Fluxo:
// 1. Identifica o provider da URL
// 2. Busca a conexão de integração para esse provider (por operação/dashboard)
// 3. Valida assinatura com o segredo criptografado da Fase 7
// 4. Roteia ao adaptador correto e normaliza para SaleEvent
// 5. Grava em sales (idempotente via UNIQUE constraint)
// 6. Loga em webhook_logs para auditoria

import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptCredentials } from '@/lib/crypto/credentials';
import { getAdapter, SALE_PROVIDERS } from '@/lib/integrations/registry';
import { checkDuplicate } from '@/lib/integrations/dedup';

interface RouteParams { params: Promise<{ provider: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { provider } = await params;
  const rawBody = await request.text();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  // Identifica o adaptador
  if (!SALE_PROVIDERS.includes(provider as typeof SALE_PROVIDERS[number])) {
    await logWebhook(admin, provider, null, 'error', {}, null, `Provider desconhecido: ${provider}`);
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
  }

  const adapter = getAdapter(provider);
  if (!adapter) {
    return NextResponse.json({ error: 'No adapter' }, { status: 404 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    await logWebhook(admin, provider, null, 'error', {}, null, 'JSON inválido');
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Busca TODAS as conexões ativas para esse provider
  const { data: connections } = await admin
    .from('integration_connections')
    .select('id, operation_id, dashboard_id, config, credentials_encrypted, status')
    .eq('provider', provider)
    .eq('category', 'venda');

  if (!connections || connections.length === 0) {
    await logWebhook(admin, provider, null, 'ignored', payload as Record<string, unknown>, null, 'Sem conexão configurada');
    return NextResponse.json({ received: true, status: 'no_connection' });
  }

  // Processa cada conexão (geralmente 1, mas pode ser multi-tenant)
  for (const conn of connections as { id: string; operation_id: string; dashboard_id: string | null; config: Record<string, unknown>; credentials_encrypted: string | null; status: string }[]) {
    // Valida assinatura se houver secret configurado
    let secret = '';
    if (conn.credentials_encrypted) {
      try {
        const creds = JSON.parse(decryptCredentials(conn.credentials_encrypted)) as Record<string, string>;
        secret = creds['webhook_secret'] ?? creds['secret'] ?? '';
      } catch {
        // credenciais corrompidas — pula validação
      }
    }

    if (secret && !adapter.validateSignature(payload, rawBody, secret)) {
      await logWebhook(admin, provider, conn.operation_id, 'error', payload as Record<string, unknown>, null, 'Assinatura inválida');
      continue;
    }

    // Normaliza o evento
    const event = adapter.parse(payload);
    if (!event) {
      await logWebhook(admin, provider, conn.operation_id, 'ignored', payload as Record<string, unknown>, null, 'Evento ignorado pelo adaptador');
      continue;
    }

    // Verifica de-dup antes do INSERT
    const dup = await checkDuplicate(admin, conn.operation_id, provider, event.external_id, {
      buyer_email: event.buyer_email,
      amount: event.amount,
      occurred_at: event.occurred_at,
    });

    if (dup.isDuplicate) {
      await logWebhook(admin, provider, conn.operation_id, 'ignored', payload as Record<string, unknown>, event as unknown as Record<string, unknown>, `Duplicata (${dup.reason}): ${dup.existingId}`);
      continue;
    }

    // Grava a venda
    const { error: insertError } = await admin.from('sales').insert({
      operation_id: conn.operation_id,
      dashboard_id: conn.dashboard_id,
      external_id:  event.external_id,
      provider:     event.provider,
      status:       event.status,
      amount:       event.amount,
      fees:         event.fees,
      buyer_email:  event.buyer_email,
      utm:          event.utm,
      occurred_at:  event.occurred_at,
      raw:          event.raw,
    });

    if (insertError) {
      // UNIQUE violation = duplicate (tratada pela constraint, não é erro crítico)
      const isDupConstraint = insertError.code === '23505';
      await logWebhook(admin, provider, conn.operation_id, isDupConstraint ? 'ignored' : 'error',
        payload as Record<string, unknown>, event as unknown as Record<string, unknown>,
        isDupConstraint ? 'UNIQUE constraint (idempotente)' : insertError.message);
      continue;
    }

    // Drena a fila UTMify: se houver evento de atribuição aguardando, aplica agora.
    // Prioridade: external_id exato → fuzzy (email + janela de 10 min).
    await drainUtmifyQueue(admin, conn.operation_id, event.external_id, event.buyer_email, event.occurred_at);

    // Atualiza last_event_at na conexão
    await admin.from('integration_connections')
      .update({ last_event_at: new Date().toISOString(), status: 'conectada' })
      .eq('id', conn.id);

    await logWebhook(admin, provider, conn.operation_id, 'ok', payload as Record<string, unknown>, event as unknown as Record<string, unknown>, null);
  }

  // Sempre retorna 200 para não causar reenvio da plataforma
  return NextResponse.json({ received: true });
}

// Após gravar uma venda, verifica se há evento UTMify pendente na fila
// e aplica os dados UTM à venda recém-inserida.
async function drainUtmifyQueue(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  operationId: string,
  externalId: string,
  buyerEmail: string | null,
  occurredAt: string
) {
  const WINDOW_MS = 10 * 60 * 1000;

  // Check 1: external_id exato
  let queued: { id: string; utm: Record<string, unknown> } | null = null;

  if (externalId) {
    const { data: byId } = await admin
      .from('utmify_queue')
      .select('id, utm')
      .eq('operation_id', operationId)
      .eq('external_id', externalId)
      .maybeSingle();
    if (byId) queued = byId as { id: string; utm: Record<string, unknown> };
  }

  // Check 2: buyer_email + janela de tempo
  if (!queued && buyerEmail) {
    const t = new Date(occurredAt).getTime();
    const windowStart = new Date(t - WINDOW_MS).toISOString();
    const windowEnd   = new Date(t + WINDOW_MS).toISOString();

    const { data: byFuzzy } = await admin
      .from('utmify_queue')
      .select('id, utm')
      .eq('operation_id', operationId)
      .eq('buyer_email', buyerEmail)
      .gte('occurred_at', windowStart)
      .lte('occurred_at', windowEnd)
      .maybeSingle();
    if (byFuzzy) queued = byFuzzy as { id: string; utm: Record<string, unknown> };
  }

  if (!queued) return;

  // Aplica UTM na venda que acabou de ser inserida e remove da fila
  await admin.from('sales')
    .update({ utm: queued.utm })
    .eq('operation_id', operationId)
    .eq('external_id', externalId);

  await admin.from('utmify_queue').delete().eq('id', queued.id);
}

async function logWebhook(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  provider: string,
  operationId: string | null,
  status: 'ok' | 'error' | 'ignored',
  payload: Record<string, unknown>,
  normalized: Record<string, unknown> | null,
  errorMsg: string | null
) {
  await admin.from('webhook_logs').insert({
    provider,
    operation_id: operationId,
    status,
    payload,
    normalized,
    error_msg: errorMsg,
  }).then(() => {}); // fire and forget
}

// GET: log de validação (só em dev ou para head/dono autenticado)
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { provider } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  const { data: logs } = await admin
    .from('webhook_logs')
    .select('id, status, normalized, error_msg, received_at')
    .eq('provider', provider)
    .order('received_at', { ascending: false })
    .limit(20);

  return NextResponse.json({
    provider,
    note: 'Últimos 20 eventos recebidos (webhook_logs)',
    logs: logs ?? [],
  });
}
