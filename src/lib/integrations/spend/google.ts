// Adaptador Google Ads — pull de gasto e métricas via Google Ads REST API.
//
// Credenciais esperadas (JSON em credentials_encrypted):
//   {
//     "client_id": "...",
//     "client_secret": "...",
//     "refresh_token": "...",
//     "customer_id": "1234567890"  // sem hífens
//   }
// Config (campo config da connection):
//   { "customer_id": "1234567890", "manager_id": "..." (opcional, para MCC) }
//
// Documentação: https://developers.google.com/google-ads/api/docs/rest/overview

import type { SpendAdapter, SpendRecord, AccountStatus, CampaignStatus } from './types';

const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GADS_BASE = 'https://googleads.googleapis.com/v17';

// Renova o access_token usando o refresh_token
async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string> {
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      client_id:     clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error(`Google OAuth token refresh failed: ${JSON.stringify(err)}`);
  }
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

// Mapeia status da campanha Google para nosso enum
function mapCampaignStatus(status: string): CampaignStatus {
  return status === 'ENABLED' ? 'ativa' : 'pausada';
}

// Mapeia status da conta Google para nosso enum
function mapAccountStatus(status: string): AccountStatus {
  if (status === 'ENABLED') return 'ativa';
  if (status === 'SUSPENDED' || status === 'CANCELED') return 'bloqueada';
  return 'limitada';
}

// GAQL query para métricas de campanha
function buildQuery(dateFrom: string, dateTo: string): string {
  return `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      customer.id,
      customer.descriptive_name,
      customer.status,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      segments.date
    FROM campaign
    WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
      AND campaign.status != 'REMOVED'
    ORDER BY segments.date ASC
  `.trim();
}

export const googleAdapter: SpendAdapter = {
  provider: 'google_ads',

  async pull(credentials, config, dateFrom, dateTo): Promise<SpendRecord[]> {
    const clientId     = credentials['client_id'] ?? '';
    const clientSecret = credentials['client_secret'] ?? '';
    const refreshToken = credentials['refresh_token'] ?? '';
    const customerId   = String(
      credentials['customer_id'] ?? config['customer_id'] ?? ''
    ).replace(/-/g, '');

    if (!clientId || !clientSecret || !refreshToken || !customerId) {
      throw new Error('Google Ads: credenciais incompletas (client_id, client_secret, refresh_token, customer_id)');
    }

    const accessToken = await refreshAccessToken(clientId, clientSecret, refreshToken);

    // Cabeçalho de developer token é obrigatório para Google Ads API
    const devToken = credentials['developer_token'] ?? process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? '';
    if (!devToken) throw new Error('Google Ads: developer_token não configurado');

    const query = buildQuery(dateFrom, dateTo);
    const url = `${GADS_BASE}/customers/${customerId}/googleAds:searchStream`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization':  `Bearer ${accessToken}`,
        'developer-token': devToken,
        'Content-Type':   'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, unknown>;
      throw new Error(`Google Ads query failed: ${JSON.stringify(err)}`);
    }

    // searchStream retorna NDJSON com múltiplos chunks
    const text = await res.text();
    const records: SpendRecord[] = [];

    for (const line of text.split('\n').filter(l => l.trim().startsWith('{'))) {
      try {
        const chunk = JSON.parse(line) as {
          results?: {
            campaign: { id: string; name: string; status: string };
            customer: { id: string; descriptiveNme: string; status: string };
            metrics: { costMicros: string; impressions: string; clicks: string; conversions: string };
            segments: { date: string };
          }[];
        };
        for (const row of chunk.results ?? []) {
          records.push({
            account_id:      row.customer.id,
            account_name:    row.customer.descriptiveNme ?? row.customer.id,
            account_status:  mapAccountStatus(row.customer.status),
            campaign_id:     row.campaign.id,
            campaign_name:   row.campaign.name,
            campaign_status: mapCampaignStatus(row.campaign.status),
            spend:           parseInt(row.metrics.costMicros ?? '0', 10) / 1_000_000,
            impressions:     parseInt(row.metrics.impressions ?? '0', 10),
            clicks:          parseInt(row.metrics.clicks ?? '0', 10),
            results:         Math.round(parseFloat(row.metrics.conversions ?? '0')),
            currency:        'BRL',
            spend_date:      row.segments.date,
          });
        }
      } catch { /* ignora chunk malformado */ }
    }

    return records;
  },
};
