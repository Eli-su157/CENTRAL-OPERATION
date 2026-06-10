// Pull Meta Ads a nível de anúncio (ad_id, adset_id).
// Módulo irmão de meta.ts — mesma autenticação, endpoint diferente (level=ad).
// ATENÇÃO: nível de anúncio gera muito mais linhas que campanha.
// Implementa paginação via cursor after do Meta; limita a MAX_PAGES por execução.

const META_API_VERSION = 'v22.0';
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;
const MAX_PAGES = 10;   // ~2500 registros por run (250 * 10)
const PAGE_SIZE = 250;

export interface AdLevelRecord {
  account_id:   string;
  account_name: string;
  campaign_id:  string;
  adset_id:     string;
  adset_name:   string;
  ad_id:        string;
  ad_name:      string;
  spend:        number;
  impressions:  number;
  clicks:       number;
  results:      number;
  spend_date:   string; // YYYY-MM-DD
}

// Response type dos insights do Meta
interface MetaInsightRow {
  ad_id: string;
  ad_name: string;
  adset_id: string;
  adset_name: string;
  campaign_id: string;
  campaign_name: string;
  impressions: string;
  clicks: string;
  spend: string;
  date_start: string;
  actions?: { action_type: string; value: string }[];
}

interface MetaPagedResponse {
  data: MetaInsightRow[];
  paging?: {
    cursors?: { after?: string };
    next?: string;
  };
}

export async function pullAdLevelInsights(
  accessToken: string,
  accountId: string,         // sem 'act_' prefix
  accountName: string,
  dateFrom: string,
  dateTo: string
): Promise<AdLevelRecord[]> {
  const actId = `act_${accountId}`;
  const fields = [
    'ad_id', 'ad_name',
    'adset_id', 'adset_name',
    'campaign_id', 'campaign_name',
    'impressions', 'clicks', 'spend', 'actions',
  ].join(',');

  const records: AdLevelRecord[] = [];
  let afterCursor: string | undefined;
  let pages = 0;

  while (pages < MAX_PAGES) {
    const url = new URL(`${BASE_URL}/${actId}/insights`);
    url.searchParams.set('access_token', accessToken);
    url.searchParams.set('level', 'ad');
    url.searchParams.set('fields', fields);
    url.searchParams.set('time_range', JSON.stringify({ since: dateFrom, until: dateTo }));
    url.searchParams.set('time_increment', '1');
    url.searchParams.set('limit', String(PAGE_SIZE));
    if (afterCursor) url.searchParams.set('after', afterCursor);

    const res = await fetch(url.toString());
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, unknown>;
      throw new Error(`Meta ad-level fetch failed (page ${pages}): ${JSON.stringify(err)}`);
    }

    const json = await res.json() as MetaPagedResponse;
    pages++;

    for (const row of json.data ?? []) {
      const purchaseAction = (row.actions ?? []).find(
        a => a.action_type === 'purchase' || a.action_type === 'omni_purchase'
      );
      records.push({
        account_id:   accountId,
        account_name: accountName,
        campaign_id:  row.campaign_id,
        adset_id:     row.adset_id,
        adset_name:   row.adset_name ?? '',
        ad_id:        row.ad_id,
        ad_name:      row.ad_name ?? '',
        spend:        parseFloat(row.spend ?? '0'),
        impressions:  parseInt(row.impressions ?? '0', 10),
        clicks:       parseInt(row.clicks ?? '0', 10),
        results:      purchaseAction ? parseInt(purchaseAction.value, 10) : 0,
        spend_date:   row.date_start,
      });
    }

    const nextCursor = json.paging?.cursors?.after;
    if (!nextCursor || !json.paging?.next) break;
    afterCursor = nextCursor;
  }

  return records;
}
