// Cron job: pull de gasto de tráfego a cada 15 min.
// Disparado pelo Vercel Cron (vercel.json) via GET com header Authorization: Bearer <CRON_SECRET>.
//
// Fluxo:
// 1. Valida o header de segurança (CRON_SECRET env var)
// 2. Busca todas as integration_connections de categoria 'trafego' com status 'conectada'
// 3. Para cada conexão: descriptografa credenciais → chama o spend adapter do provider
// 4. Upsert dos registros em ad_spend
// 5. Atualiza integration_connections.last_event_at e status
//
// Em caso de erro por conexão: marca status='erro' na conexão e continua com as outras.

import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptCredentials } from '@/lib/crypto/credentials';
import { metaAdapter } from '@/lib/integrations/spend/meta';
import { googleAdapter } from '@/lib/integrations/spend/google';
import { pullAdLevelInsights } from '@/lib/integrations/spend/meta-ad-level';
import type { SpendAdapter } from '@/lib/integrations/spend/types';

const ADAPTERS: Record<string, SpendAdapter> = {
  meta_ads:   metaAdapter,
  google_ads: googleAdapter,
};

export async function GET(request: NextRequest) {
  // Valida segredo do cron (Vercel envia Authorization: Bearer <CRON_SECRET>)
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization') ?? '';

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  // Período: hoje (para upsert idempotente por dia)
  const today = new Date().toISOString().split('T')[0];

  const { data: connections, error: connErr } = await admin
    .from('integration_connections')
    .select('id, operation_id, dashboard_id, provider, config, credentials_encrypted, status')
    .eq('category', 'trafego')
    .eq('status', 'conectada');

  if (connErr || !connections || connections.length === 0) {
    return NextResponse.json({ pulled: 0, skipped: 0, errors: 0 });
  }

  let pulled = 0, skipped = 0, errors = 0;

  for (const conn of connections as {
    id: string;
    operation_id: string;
    dashboard_id: string | null;
    provider: string;
    config: Record<string, unknown>;
    credentials_encrypted: string | null;
    status: string;
  }[]) {
    const adapter = ADAPTERS[conn.provider];
    if (!adapter) { skipped++; continue; }

    let credentials: Record<string, string> = {};
    try {
      if (conn.credentials_encrypted) {
        credentials = JSON.parse(decryptCredentials(conn.credentials_encrypted)) as Record<string, string>;
      }
    } catch {
      await markConnectionError(admin, conn.id, 'Erro ao decriptar credenciais');
      errors++;
      continue;
    }

    try {
      const records = await adapter.pull(credentials, conn.config, today, today);

      if (records.length === 0) { skipped++; continue; }

      // Upsert em lotes de 100 (evita payload gigante)
      const BATCH = 100;
      for (let i = 0; i < records.length; i += BATCH) {
        const batch = records.slice(i, i + BATCH).map(r => ({
          operation_id:    conn.operation_id,
          dashboard_id:    conn.dashboard_id,
          provider:        conn.provider,
          account_id:      r.account_id,
          account_name:    r.account_name,
          account_status:  r.account_status,
          campaign_id:     r.campaign_id,
          campaign_name:   r.campaign_name,
          campaign_status: r.campaign_status,
          spend:           r.spend,
          impressions:     r.impressions,
          clicks:          r.clicks,
          results:         r.results,
          currency:        r.currency,
          spend_date:      r.spend_date,
          fetched_at:      new Date().toISOString(),
        }));

        const { error: upsertErr } = await admin
          .from('ad_spend')
          .upsert(batch, {
            onConflict: 'operation_id,provider,account_id,campaign_id,spend_date',
            ignoreDuplicates: false,
          });

        if (upsertErr) throw new Error(`Upsert error: ${upsertErr.message}`);
      }

      // Atualiza conexão como ok
      await admin
        .from('integration_connections')
        .update({ last_event_at: new Date().toISOString(), status: 'conectada' })
        .eq('id', conn.id);

      pulled += records.length;

      // Fase 9e: pull a nível de anúncio (apenas Meta Ads)
      if (conn.provider === 'meta_ads') {
        await pullAndUpsertAdLevel(admin, conn, credentials, today);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await markConnectionError(admin, conn.id, msg.slice(0, 200));
      errors++;
    }
  }

  return NextResponse.json({ pulled, skipped, errors, date: today });
}

// Pull de nível de anúncio (Meta apenas): resiliência independente do pull de campanha.
// Falha silenciosa — não propaga erro para não cancelar o pull de campanha já feito.
async function pullAndUpsertAdLevel(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  conn: { id: string; operation_id: string; dashboard_id: string | null; config: Record<string, unknown> },
  credentials: Record<string, string>,
  today: string
) {
  try {
    const accessToken = credentials['access_token'] ?? '';
    const accountId = String(
      credentials['account_id'] ?? conn.config['account_id'] ?? ''
    ).replace(/^act_/, '');
    if (!accessToken || !accountId) return;

    // Conta name para enriquecimento — lido de ad_spend já gravado hoje
    const { data: accountRow } = await admin
      .from('ad_spend')
      .select('account_name')
      .eq('operation_id', conn.operation_id)
      .eq('account_id', accountId)
      .eq('spend_date', today)
      .limit(1)
      .maybeSingle();
    const accountName = accountRow?.account_name ?? accountId;

    const adRecords = await pullAdLevelInsights(accessToken, accountId, accountName, today, today);
    if (adRecords.length === 0) return;

    const fetchedAt = new Date().toISOString();
    const BATCH = 50;
    for (let i = 0; i < adRecords.length; i += BATCH) {
      const batch = adRecords.slice(i, i + BATCH).map(r => ({
        operation_id:  conn.operation_id,
        dashboard_id:  conn.dashboard_id,
        provider:      'meta_ads',
        account_id:    r.account_id,
        campaign_id:   r.campaign_id,
        adset_id:      r.adset_id,
        adset_name:    r.adset_name,
        ad_id:         r.ad_id,
        ad_name:       r.ad_name,
        spend:         r.spend,
        impressions:   r.impressions,
        clicks:        r.clicks,
        results:       r.results,
        spend_date:    r.spend_date,
        fetched_at:    fetchedAt,
      }));

      await admin
        .from('ad_performance')
        .upsert(batch, {
          onConflict: 'operation_id,ad_id,spend_date',
          ignoreDuplicates: false,
        });
    }
  } catch {
    // Falha silenciosa — log mas não propaga
    await admin.from('webhook_logs').insert({
      provider:  'cron_pull_ads_ad_level',
      status:    'error',
      payload:   { connection_id: conn.id },
      error_msg: 'Ad-level pull failed (silently)',
    }).then(() => {});
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function markConnectionError(admin: any, connectionId: string, reason: string) {
  await admin
    .from('integration_connections')
    .update({ status: 'erro', last_event_at: new Date().toISOString() })
    .eq('id', connectionId)
    .then(() => {});

  // Log simplificado no webhook_logs para rastreabilidade
  await admin.from('webhook_logs').insert({
    provider:    'cron_pull_ads',
    status:      'error',
    payload:     { connection_id: connectionId },
    error_msg:   reason,
  }).then(() => {});
}
