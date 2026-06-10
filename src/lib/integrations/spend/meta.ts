// Adaptador Meta Ads — pull de gasto e métricas via Meta Marketing API v22.
//
// Credenciais esperadas (JSON em credentials_encrypted):
//   { "access_token": "...", "account_id": "act_12345" }
// Config (campo config da connection):
//   { "account_id": "act_12345" }  (fallback para credentials se ausente)
//
// Documentação: https://developers.facebook.com/docs/marketing-api/insights

import type { SpendAdapter, SpendRecord, AccountStatus, CampaignStatus } from './types';

const META_API_VERSION = 'v22.0';
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// Mapeia effective_status do Meta para nosso enum
function mapCampaignStatus(status: string): CampaignStatus {
  return status === 'ACTIVE' ? 'ativa' : 'pausada';
}

// Mapeia account_status do Meta (int) para nosso enum
function mapAccountStatus(code: number): AccountStatus {
  if (code === 1) return 'ativa';
  if (code === 3 || code === 7 || code === 8 || code === 9) return 'limitada';
  return 'bloqueada';
}

export const metaAdapter: SpendAdapter = {
  provider: 'meta_ads',

  async pull(credentials, config, dateFrom, dateTo): Promise<SpendRecord[]> {
    const accessToken = credentials['access_token'] ?? '';
    if (!accessToken) throw new Error('Meta: access_token não configurado');

    // account_id pode vir das credenciais ou do config
    const accountId = String(
      credentials['account_id'] ?? config['account_id'] ?? ''
    ).replace(/^act_/, '');
    if (!accountId) throw new Error('Meta: account_id não configurado');

    const actId = `act_${accountId}`;

    // 1. Busca status da conta de anúncio
    const acctUrl = `${BASE_URL}/${actId}?fields=name,account_status&access_token=${accessToken}`;
    const acctRes = await fetch(acctUrl);
    if (!acctRes.ok) {
      const err = await acctRes.json().catch(() => ({})) as Record<string, unknown>;
      throw new Error(`Meta account fetch failed: ${JSON.stringify(err)}`);
    }
    const acctData = await acctRes.json() as { name: string; account_status: number };
    const accountName   = acctData.name ?? accountId;
    const accountStatus = mapAccountStatus(acctData.account_status);

    // 2. Busca insights por campanha no período
    const fields = 'campaign_id,campaign_name,impressions,clicks,spend,actions,effective_status';
    const insightsUrl = new URL(`${BASE_URL}/${actId}/insights`);
    insightsUrl.searchParams.set('access_token', accessToken);
    insightsUrl.searchParams.set('level', 'campaign');
    insightsUrl.searchParams.set('fields', fields);
    insightsUrl.searchParams.set('time_range', JSON.stringify({ since: dateFrom, until: dateTo }));
    insightsUrl.searchParams.set('time_increment', '1');  // por dia
    insightsUrl.searchParams.set('limit', '500');

    const insightsRes = await fetch(insightsUrl.toString());
    if (!insightsRes.ok) {
      const err = await insightsRes.json().catch(() => ({})) as Record<string, unknown>;
      throw new Error(`Meta insights fetch failed: ${JSON.stringify(err)}`);
    }
    const insightsJson = await insightsRes.json() as {
      data: {
        campaign_id: string;
        campaign_name: string;
        impressions: string;
        clicks: string;
        spend: string;
        effective_status?: string;
        date_start: string;
        actions?: { action_type: string; value: string }[];
      }[];
    };

    const records: SpendRecord[] = (insightsJson.data ?? []).map(row => {
      // results = conversões (purchase ou lead dependendo do objetivo)
      const purchaseAction = (row.actions ?? []).find(
        a => a.action_type === 'purchase' || a.action_type === 'omni_purchase'
      );
      const results = purchaseAction ? parseInt(purchaseAction.value, 10) : 0;

      return {
        account_id:      accountId,
        account_name:    accountName,
        account_status:  accountStatus,
        campaign_id:     row.campaign_id,
        campaign_name:   row.campaign_name,
        campaign_status: mapCampaignStatus(row.effective_status ?? 'PAUSED'),
        spend:           parseFloat(row.spend ?? '0'),
        impressions:     parseInt(row.impressions ?? '0', 10),
        clicks:          parseInt(row.clicks ?? '0', 10),
        results,
        currency:        'BRL',
        spend_date:      row.date_start,
      };
    });

    return records;
  },
};
