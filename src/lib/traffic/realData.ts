// Constrói TrafficData real a partir de ad_spend + sales.
// Mesma interface do mock — swap direto na página sem alterar os blocos.

import type {
  TrafficData,
  Campaign,
  AdAccount,
  DailyPoint,
  AdAccountStatus,
  CampaignSemaphore,
} from '@/lib/mock/traffic';
import type { RawSpend } from './spend';

// Shape de venda para o cálculo de ROAS e funil
interface SaleForTraffic {
  amount: number;
  status: string;    // aprovado | pix_gerado | pix_pago | reembolsado | chargeback
  occurred_at: string;
  utm: Record<string, string | null> | null;
}

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

function sumSpend(rows: RawSpend[]) {
  return rows.reduce((s, r) => s + Number(r.spend), 0);
}

function sumSalesAmount(rows: SaleForTraffic[]) {
  return rows.reduce((s, r) => s + Number(r.amount), 0);
}

// Calcula o semáforo baseado no ROAS real da campanha vs alvo
function semaphore(roas: number, roasAlvo: number): CampaignSemaphore {
  if (roas >= roasAlvo * 1.1) return 'escalar';
  if (roas >= roasAlvo * 0.85) return 'observar';
  return 'matar';
}

// Normaliza o nome da campanha UTM para matching (lowercase, trim)
function normCampaign(name: string | null | undefined): string {
  return (name ?? '').toLowerCase().trim();
}

// -----------------------------------------------------------------------
// Função principal
// -----------------------------------------------------------------------

export interface RealTrafficOptions {
  dashboardId: string;
  primaryProvider: string | null;
  period: string;       // YYYY-MM
  roasAlvo: number;
  spend: RawSpend[];    // todos os registros de ad_spend do período
  sales: SaleForTraffic[];  // vendas do período (com utm)
}

export interface RealTrafficResult extends TrafficData {
  fetched_at: string | null;  // max(fetched_at) do ad_spend
}

export function buildRealTrafficData(opts: RealTrafficOptions): RealTrafficResult | null {
  const { spend, sales, period, roasAlvo } = opts;

  if (spend.length === 0) return null;

  // Data "hoje" dentro do período
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const periodPrefix = period;  // YYYY-MM

  // Vendas aprovadas do período
  const approvedSales = sales.filter(s => s.status === 'aprovado');
  const pixGeradoSales = sales.filter(s => s.status === 'pix_gerado');
  const pixPagoSales   = sales.filter(s => s.status === 'pix_pago');

  // ---- Totais do "dia" (hoje) ----
  const spendToday   = spend.filter(s => s.spend_date === todayStr);
  const salesToday   = approvedSales.filter(s => s.occurred_at.startsWith(todayStr));
  const pixToday     = [...pixGeradoSales, ...pixPagoSales].filter(s => s.occurred_at.startsWith(todayStr));

  const gasto_dia       = sumSpend(spendToday);
  const faturamento_dia = sumSalesAmount(salesToday);
  const pixEstimadoHoje = sumSalesAmount(pixToday) * 0.75;
  const roas_confirmado = gasto_dia > 0 ? faturamento_dia / gasto_dia : 0;
  const roas_projetado  = gasto_dia > 0 ? (faturamento_dia + pixEstimadoHoje) / gasto_dia : 0;
  const cpa             = salesToday.length > 0 ? gasto_dia / salesToday.length : 0;
  const roi             = gasto_dia > 0 ? ((faturamento_dia - gasto_dia) / gasto_dia) * 100 : 0;

  // ---- Mapa campanha → receita via UTM campaign ----
  const revenueByUtmCampaign = new Map<string, number>();
  const countByUtmCampaign   = new Map<string, number>();
  for (const s of approvedSales) {
    const camp = normCampaign(s.utm?.['campaign']);
    if (!camp) continue;
    revenueByUtmCampaign.set(camp, (revenueByUtmCampaign.get(camp) ?? 0) + Number(s.amount));
    countByUtmCampaign.set(camp, (countByUtmCampaign.get(camp) ?? 0) + 1);
  }

  // ---- Accounts (agrupados por account_id) ----
  const accountMap = new Map<string, {
    id: string; name: string; platform: string; status: AdAccountStatus; gasto: number;
  }>();
  for (const row of spend) {
    const key = row.account_id;
    const existing = accountMap.get(key);
    if (!existing) {
      accountMap.set(key, {
        id:       row.account_id,
        name:     row.account_name,
        platform: row.provider === 'meta_ads' ? 'Meta Ads' : 'Google Ads',
        status:   row.account_status as AdAccountStatus,
        gasto:    Number(row.spend),
      });
    } else {
      existing.gasto += Number(row.spend);
    }
  }

  const accounts: AdAccount[] = Array.from(accountMap.values()).map(a => ({
    id: a.id,
    name: a.name,
    platform: a.platform as AdAccount['platform'],
    status: a.status,
    gasto_dia: a.gasto,
    limite_dia: null,  // limite diário não vem da API (9e)
  }));

  // ---- Campaigns (agrupados por campaign_id) ----
  const campMap = new Map<string, {
    id: string; account_id: string; account_name: string; platform: string;
    name: string; status: string;
    spend: number; impressions: number; clicks: number;
  }>();
  for (const row of spendToday) {
    const key = row.campaign_id;
    const existing = campMap.get(key);
    if (!existing) {
      campMap.set(key, {
        id:           row.campaign_id,
        account_id:   row.account_id,
        account_name: row.account_name,
        platform:     row.provider === 'meta_ads' ? 'Meta Ads' : 'Google Ads',
        name:         row.campaign_name,
        status:       row.campaign_status,
        spend:        Number(row.spend),
        impressions:  Number(row.impressions),
        clicks:       Number(row.clicks),
      });
    } else {
      existing.spend       += Number(row.spend);
      existing.impressions += Number(row.impressions);
      existing.clicks      += Number(row.clicks);
    }
  }

  // Receita total para fallback de campanhas sem UTM match
  const totalSpendToday = gasto_dia > 0 ? gasto_dia : 1;
  const campaigns: Campaign[] = Array.from(campMap.values()).map(c => {
    const campRevByUtm = revenueByUtmCampaign.get(normCampaign(c.name)) ?? 0;
    // Se não há match por UTM, distribui receita proporcional ao gasto
    const campRevenue = campRevByUtm > 0
      ? campRevByUtm
      : faturamento_dia * (c.spend / totalSpendToday);
    const campVendas = countByUtmCampaign.get(normCampaign(c.name)) ?? 0;
    const campCpa    = campVendas > 0 ? c.spend / campVendas : (c.spend > 0 ? c.spend : 0);
    const campRoas   = c.spend > 0 ? campRevenue / c.spend : 0;
    const campRoasP  = c.spend > 0 ? (campRevenue + c.spend * 0.07) / c.spend : 0;
    const ctr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0;
    const cpc = c.clicks > 0 ? c.spend / c.clicks : 0;

    return {
      id:                c.id,
      account_id:        c.account_id,
      account_name:      c.account_name,
      platform:          c.platform,
      name:              c.name,
      status:            c.status === 'ativa' ? 'ativa' : 'pausada',
      gasto_dia:         c.spend,
      impressoes:        c.impressions,
      cliques:           c.clicks,
      ctr,
      cpc,
      checkout_iniciado: 0,  // pixel — Fase 9e
      pix_gerado:        pixGeradoSales.length,
      pix_pago:          pixPagoSales.length,
      cartao_aprovado:   0,  // sem diferenciação de método por ora
      vendas_confirmadas: campVendas || salesToday.length,
      roas_confirmado:   campRoas,
      roas_projetado:    campRoasP,
      cpa:               campCpa,
      semaforo:          semaphore(campRoas, roasAlvo),
    };
  });

  // ---- Funil (agregado) ----
  const totalImpressions = spendToday.reduce((s, r) => s + Number(r.impressions), 0);
  const totalClicks      = spendToday.reduce((s, r) => s + Number(r.clicks), 0);
  const funil: TrafficData['funil'] = {
    impressoes:         totalImpressions,
    cliques:            totalClicks,
    checkout_iniciado:  0,  // pixel — Fase 9e
    pix_gerado:         pixGeradoSales.length,
    pix_pago:           pixPagoSales.length,
    cartao_aprovado:    0,
    vendas_confirmadas: approvedSales.length,
  };

  // ---- Série temporal (30 dias) ----
  const spendByDate   = new Map<string, number>();
  const salesByDate   = new Map<string, number>();
  for (const row of spend) {
    spendByDate.set(row.spend_date, (spendByDate.get(row.spend_date) ?? 0) + Number(row.spend));
  }
  for (const s of approvedSales) {
    const d = s.occurred_at.split('T')[0];
    salesByDate.set(d, (salesByDate.get(d) ?? 0) + Number(s.amount));
  }

  const allDates = new Set([...spendByDate.keys(), ...salesByDate.keys()]);
  const series: DailyPoint[] = Array.from(allDates)
    .filter(d => d.startsWith(periodPrefix))
    .sort()
    .map(d => {
      const g = spendByDate.get(d) ?? 0;
      const f = salesByDate.get(d) ?? 0;
      return {
        date:             d,
        gasto:            g,
        faturamento:      f,
        roas_confirmado:  g > 0 ? f / g : 0,
        roas_projetado:   g > 0 ? (f * 1.07) / g : 0,
      };
    });

  // ---- Reconciliação ----
  const totalSpendPeriod = sumSpend(spend);
  const totalFatPeriod   = sumSalesAmount(approvedSales);

  // ---- Alertas automáticos ----
  const alertas: TrafficData['alertas'] = [];
  if (roas_confirmado < roasAlvo && gasto_dia > 0) {
    alertas.push({
      id: 'a_roas',
      type: 'danger',
      message: `ROAS confirmado (${roas_confirmado.toFixed(2)}x) abaixo do alvo (${roasAlvo.toFixed(2)}x).`,
    });
  }
  for (const acc of accounts) {
    if (acc.status === 'bloqueada') {
      alertas.push({
        id: `a_blocked_${acc.id}`,
        type: 'danger',
        message: `Conta ${acc.name} (${acc.platform}) está BLOQUEADA.`,
      });
    }
  }

  // ---- latest fetched_at ----
  const fetched_at = spend.reduce(
    (best, s) => (!best || s.fetched_at > best ? s.fetched_at : best),
    null as string | null
  );

  return {
    gasto_dia,
    faturamento_dia,
    roas_confirmado,
    roas_projetado,
    cpa,
    roi,
    tracker_faturamento:    totalFatPeriod,   // preenchido aqui; reconciliação fina = 9c
    plataforma_faturamento: totalFatPeriod,
    accounts,
    campaigns,
    funil,
    series,
    alertas,
    fetched_at,
  };
}

// Formata "atualizado há X min/h" a partir do fetched_at
export function formatFetchedAgo(fetchedAt: string | null): string {
  if (!fetchedAt) return '';
  const diffMs  = Date.now() - new Date(fetchedAt).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'atualizado agora';
  if (diffMin < 60) return `atualizado há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  return `atualizado há ${diffH}h`;
}
