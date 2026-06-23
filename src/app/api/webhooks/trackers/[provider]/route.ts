// Webhook receiver genérico para Trackers de atribuição.
// Endpoint: POST /api/webhooks/trackers/[provider]
//
// Fluxo:
// 1. Identifica o provider (utmify, hyros, redtrack, …) e carrega o adaptador
// 2. Busca TODAS as conexões tracker para esse provider (category='tracker')
// 3. Valida assinatura, detecta tipo (sale | aggregate), persiste na tabela certa
// 4. Se sale: tenta casar com a venda em sales (enriquece utm); publica evento
// 5. Se aggregate: upsert em tracker_aggregates
// 6. Loga em webhook_logs (mesmo padrão dos outros webhooks)

import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptCredentials } from '@/lib/crypto/credentials';
import { getTrackerAdapter, isTrackerProvider } from '@/lib/integrations/trackers/registry';
import { publishEvent } from '@/lib/events/publish';

interface RouteParams { params: Promise<{ provider: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { provider } = await params;
  const rawBody = await request.text();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  if (!isTrackerProvider(provider)) {
    await logWebhook(admin, provider, null, 'error', {}, null, `Tracker provider desconhecido: ${provider}`);
    return NextResponse.json({ error: 'Unknown tracker provider' }, { status: 404 });
  }

  const adapter = getTrackerAdapter(provider);
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

  // Busca todas as conexões tracker para esse provider
  const { data: connections } = await admin
    .from('integration_connections')
    .select('id, operation_id, dashboard_id, config, credentials_encrypted, status')
    .eq('provider', provider)
    .eq('category', 'tracker');

  if (!connections || connections.length === 0) {
    await logWebhook(admin, provider, null, 'ignored', payload as Record<string, unknown>, null,
      'Sem conexão tracker configurada (category=tracker)');
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
        secret = creds['webhook_secret'] ?? creds['api_key'] ?? '';
      } catch { /* credenciais corrompidas */ }
    }

    if (secret && !adapter.validateSignature(payload, rawBody, secret)) {
      await logWebhook(admin, provider, conn.operation_id, 'error',
        payload as Record<string, unknown>, null, 'Assinatura inválida');
      continue;
    }

    const kind = adapter.detectKind(payload);
    if (!kind) {
      await logWebhook(admin, provider, conn.operation_id, 'ignored',
        payload as Record<string, unknown>, null, 'Evento ignorado pelo adaptador');
      continue;
    }

    if (kind === 'sale') {
      const event = adapter.parseSale(payload);
      if (!event) {
        await logWebhook(admin, provider, conn.operation_id, 'ignored',
          payload as Record<string, unknown>, null, 'parseSale retornou null');
        continue;
      }

      // Upsert em tracker_sales (idempotente por operation_id+provider+external_id)
      const { error: tsErr } = await admin.from('tracker_sales').upsert(
        {
          operation_id:   conn.operation_id,
          dashboard_id:   conn.dashboard_id,
          provider,
          external_id:    event.external_id,
          campaign_id:    event.campaign_id,
          campaign_name:  event.campaign_name,
          adset_id:       event.adset_id,
          adset_name:     event.adset_name,
          ad_id:          event.ad_id,
          ad_name:        event.ad_name,
          platform:       event.platform,
          utm_source:     event.utm_source,
          utm_medium:     event.utm_medium,
          utm_campaign:   event.utm_campaign,
          utm_content:    event.utm_content,
          utm_term:       event.utm_term,
          amount:         event.amount,
          status:         event.status,
          occurred_at:    event.occurred_at,
          raw:            event.raw,
        },
        { onConflict: 'operation_id,provider,external_id', ignoreDuplicates: false }
      );

      if (tsErr) {
        await logWebhook(admin, provider, conn.operation_id, 'error',
          payload as Record<string, unknown>, null, `tracker_sales upsert: ${tsErr.message}`);
        continue;
      }

      // Enriquece sales.utm se a venda já existe (mesmo padrão do utmify webhook)
      if (event.external_id) {
        const { data: saleRow } = await admin
          .from('sales')
          .select('id')
          .eq('operation_id', conn.operation_id)
          .eq('external_id', event.external_id)
          .maybeSingle();

        if (saleRow) {
          await admin.from('sales').update({
            utm: {
              source:   event.utm_source,
              medium:   event.utm_medium,
              campaign: event.utm_campaign,
              content:  event.utm_content,
              term:     event.utm_term,
            }
          }).eq('id', saleRow.id);

          // Publica evento no ERP
          await publishEvent(admin, {
            operation_id: conn.operation_id,
            dashboard_id: conn.dashboard_id,
            type: event.status === 'reembolsado' ? 'reembolso'
               : event.status === 'chargeback'   ? 'chargeback'
               : 'venda_aprovada',
            payload: {
              sale_id:      saleRow.id,
              external_id:  event.external_id,
              amount:       event.amount,
              provider,
              campaign_id:  event.campaign_id,
              campaign_name: event.campaign_name,
              ad_id:        event.ad_id,
              ad_name:      event.ad_name,
            },
          });
        }
      }

      // Atualiza conexão
      await admin.from('integration_connections')
        .update({ last_event_at: new Date().toISOString(), status: 'conectada' })
        .eq('id', conn.id);

      await logWebhook(admin, provider, conn.operation_id, 'ok',
        payload as Record<string, unknown>, event as unknown as Record<string, unknown>, null);

    } else if (kind === 'aggregate') {
      const agg = adapter.parseAggregate(payload);
      if (!agg) {
        await logWebhook(admin, provider, conn.operation_id, 'ignored',
          payload as Record<string, unknown>, null, 'parseAggregate retornou null');
        continue;
      }

      await admin.from('tracker_aggregates').upsert(
        {
          operation_id:    conn.operation_id,
          dashboard_id:    conn.dashboard_id,
          provider,
          aggregate_date:  agg.aggregate_date,
          campaign_id:     agg.campaign_id,
          campaign_name:   agg.campaign_name,
          adset_id:        agg.adset_id,
          ad_id:           agg.ad_id,
          ad_name:         agg.ad_name,
          spend:           agg.spend,
          revenue:         agg.revenue,
          attributed_sales: agg.attributed_sales,
          roas:            agg.roas,
          roi:             agg.roi,
          raw:             agg.raw,
          fetched_at:      new Date().toISOString(),
        },
        { onConflict: 'operation_id,provider,aggregate_date,campaign_id,adset_id,ad_id', ignoreDuplicates: false }
      );

      await admin.from('integration_connections')
        .update({ last_event_at: new Date().toISOString(), status: 'conectada' })
        .eq('id', conn.id);

      await logWebhook(admin, provider, conn.operation_id, 'ok',
        payload as Record<string, unknown>, agg as unknown as Record<string, unknown>, null);
    }
  }

  return NextResponse.json({ received: true });
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
    provider: `tracker:${provider}`,
    operation_id: operationId,
    status,
    payload,
    normalized,
    error_msg: errorMsg,
  }).then(() => {});
}

// GET: debug — restrito a requisições com CRON_SECRET
export async function GET(request: NextRequest, { params }: RouteParams) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization') ?? '';
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { provider } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { data: logs } = await admin
    .from('webhook_logs')
    .select('id, status, normalized, error_msg, received_at')
    .eq('provider', `tracker:${provider}`)
    .order('received_at', { ascending: false })
    .limit(20);

  return NextResponse.json({ provider, logs: logs ?? [] });
}
