// Constrói TrackerMetrics a partir de tracker_sales (+ opcionalmente tracker_aggregates).
// Usado pelo painel de tráfego quando um tracker está conectado.
//
// ROAS/ROI são calculados como: attributed_revenue / spend
// — Spend vem de tracker_aggregates se disponível, caso contrário de ad_spend.
// — O cálculo local só ocorre quando o tracker não envia aggregates (ex: UTMify).

import type { TrackerMetrics, TrackerCampaignMetrics, TrackerDailySeries } from '@/lib/integrations/trackers/types';

interface RawTrackerSale {
  id: string;
  campaign_id: string | null;
  campaign_name: string | null;
  adset_id: string | null;
  ad_id: string | null;
  ad_name: string | null;
  platform: string | null;
  amount: number;
  status: string;
  occurred_at: string;
}

interface RawTrackerAggregate {
  aggregate_date: string;
  campaign_id: string | null;
  campaign_name: string | null;
  ad_id: string | null;
  ad_name: string | null;
  spend: number;
  revenue: number;
  attributed_sales: number;
  roas: number;
  roi: number;
}

interface RawAdSpend {
  campaign_id: string;
  campaign_name: string;
  spend: number;
  spend_date: string;
}

export interface BuildTrackerOptions {
  provider:     string;
  period:       string;       // YYYY-MM
  trackerSales: RawTrackerSale[];
  trackerAggs:  RawTrackerAggregate[];
  adSpend:      RawAdSpend[]; // fallback para spend quando tracker não traz
}

export function buildTrackerMetrics(opts: BuildTrackerOptions): TrackerMetrics | null {
  const { provider, period, trackerSales, trackerAggs, adSpend } = opts;

  if (trackerSales.length === 0 && trackerAggs.length === 0) return null;

  const approvedSales = trackerSales.filter(s => s.status === 'aprovado');

  // ── Spend por campanha ────────────────────────────────────────────────────
  // Prioridade: tracker_aggregates > ad_spend (por campaign_name match)
  const spendByCampaign = new Map<string, number>();

  if (trackerAggs.length > 0) {
    for (const agg of trackerAggs) {
      const key = agg.campaign_id ?? agg.campaign_name ?? '';
      spendByCampaign.set(key, (spendByCampaign.get(key) ?? 0) + Number(agg.spend));
    }
  } else {
    for (const s of adSpend) {
      const key = s.campaign_id ?? s.campaign_name ?? '';
      spendByCampaign.set(key, (spendByCampaign.get(key) ?? 0) + Number(s.spend));
    }
  }

  const totalSpend = Array.from(spendByCampaign.values()).reduce((s, v) => s + v, 0);

  // ── Revenue e vendas por campanha ─────────────────────────────────────────
  const revenueByKey = new Map<string, { revenue: number; sales: number; name: string; ad_id: string | null; ad_name: string | null; platform: string | null }>();

  for (const s of approvedSales) {
    const key = s.campaign_id ?? s.campaign_name ?? 'sem_campanha';
    const existing = revenueByKey.get(key);
    if (!existing) {
      revenueByKey.set(key, {
        revenue:  Number(s.amount),
        sales:    1,
        name:     s.campaign_name ?? key,
        ad_id:    s.ad_id,
        ad_name:  s.ad_name,
        platform: s.platform,
      });
    } else {
      existing.revenue += Number(s.amount);
      existing.sales++;
    }
  }

  const totalRevenue = Array.from(revenueByKey.values()).reduce((s, v) => s + v.revenue, 0);
  const totalSales   = approvedSales.length;

  // ── Campaigns ─────────────────────────────────────────────────────────────
  const campaigns: TrackerCampaignMetrics[] = Array.from(revenueByKey.entries()).map(([key, v]) => {
    const spend   = spendByCampaign.get(key) ?? 0;
    const roas    = spend > 0 ? v.revenue / spend : 0;
    const roi     = spend > 0 ? ((v.revenue - spend) / spend) * 100 : 0;
    return {
      campaign_id:        key,
      campaign_name:      v.name,
      ad_id:              v.ad_id,
      ad_name:            v.ad_name,
      platform:           v.platform,
      attributed_revenue: v.revenue,
      attributed_sales:   v.sales,
      spend,
      roas,
      roi,
    };
  }).sort((a, b) => b.attributed_revenue - a.attributed_revenue);

  // ── Top criativo por revenue ──────────────────────────────────────────────
  const byAd = new Map<string, { ad_id: string; ad_name: string; revenue: number; sales: number }>();
  for (const s of approvedSales) {
    if (!s.ad_id) continue;
    const existing = byAd.get(s.ad_id);
    if (!existing) {
      byAd.set(s.ad_id, { ad_id: s.ad_id, ad_name: s.ad_name ?? s.ad_id, revenue: Number(s.amount), sales: 1 });
    } else {
      existing.revenue += Number(s.amount);
      existing.sales++;
    }
  }

  let topAd: TrackerMetrics['top_ad'] = null;
  if (byAd.size > 0) {
    const best = Array.from(byAd.values()).sort((a, b) => b.revenue - a.revenue)[0];
    const bestSpend = spendByCampaign.get(best.ad_id) ?? 0;
    topAd = {
      ad_id:   best.ad_id,
      ad_name: best.ad_name,
      revenue: best.revenue,
      sales:   best.sales,
      roas:    bestSpend > 0 ? best.revenue / bestSpend : 0,
    };
  }

  // ── Série temporal (por dia do período) ───────────────────────────────────
  const revenueByDate = new Map<string, number>();
  const salesByDate   = new Map<string, number>();
  for (const s of approvedSales) {
    const d = s.occurred_at.split('T')[0];
    if (!d.startsWith(period)) continue;
    revenueByDate.set(d, (revenueByDate.get(d) ?? 0) + Number(s.amount));
    salesByDate.set(d, (salesByDate.get(d) ?? 0) + 1);
  }

  const spendByDate = new Map<string, number>();
  if (trackerAggs.length > 0) {
    for (const agg of trackerAggs) {
      if (agg.aggregate_date.startsWith(period)) {
        spendByDate.set(agg.aggregate_date,
          (spendByDate.get(agg.aggregate_date) ?? 0) + Number(agg.spend));
      }
    }
  } else {
    for (const s of adSpend) {
      if (s.spend_date.startsWith(period)) {
        spendByDate.set(s.spend_date,
          (spendByDate.get(s.spend_date) ?? 0) + Number(s.spend));
      }
    }
  }

  const allDates = new Set([...revenueByDate.keys(), ...spendByDate.keys()]);
  const series: TrackerDailySeries[] = Array.from(allDates).sort().map(date => ({
    date,
    attributed_revenue: revenueByDate.get(date) ?? 0,
    attributed_sales:   salesByDate.get(date) ?? 0,
    spend:              spendByDate.get(date) ?? 0,
  }));

  const overallRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const overallRoi  = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0;

  const latestSale = trackerSales.sort((a, b) =>
    b.occurred_at > a.occurred_at ? 1 : -1)[0];

  return {
    provider,
    total_attributed_revenue: totalRevenue,
    total_attributed_sales:   totalSales,
    total_spend:              totalSpend,
    overall_roas:             overallRoas,
    overall_roi:              overallRoi,
    top_ad:                   topAd,
    campaigns,
    series,
    fetched_at: latestSale?.occurred_at ?? null,
  };
}

// Busca dados do tracker no banco para um dashboard + período
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchTrackerData(supabase: any, dashboardId: string, from: string, to: string) {
  const [salesRes, aggsRes] = await Promise.all([
    supabase
      .from('tracker_sales')
      .select('id, campaign_id, campaign_name, adset_id, ad_id, ad_name, platform, amount, status, occurred_at')
      .eq('dashboard_id', dashboardId)
      .gte('occurred_at', from)
      .lte('occurred_at', `${to}T23:59:59Z`)
      .order('occurred_at', { ascending: false }),
    supabase
      .from('tracker_aggregates')
      .select('aggregate_date, campaign_id, campaign_name, ad_id, ad_name, spend, revenue, attributed_sales, roas, roi')
      .eq('dashboard_id', dashboardId)
      .gte('aggregate_date', from)
      .lte('aggregate_date', to),
  ]);

  return {
    trackerSales: (salesRes.data ?? []) as RawTrackerSale[],
    trackerAggs:  (aggsRes.data  ?? []) as RawTrackerAggregate[],
    hasTracker:   (salesRes.data?.length ?? 0) > 0 || (aggsRes.data?.length ?? 0) > 0,
  };
}
