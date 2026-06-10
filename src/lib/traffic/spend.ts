// Motor de gastos de tráfego — consome a tabela ad_spend (dados reais do pull).
// Espelha o padrão de src/lib/sales/metrics.ts para consistência.

import type { FinanceEntry } from '@/lib/finance/calc';

// Categorias que ad_spend substitui em finance_entries quando há dados.
export const SPEND_CATEGORIES = new Set(['trafego']);

// Shape mínimo de uma linha de ad_spend para operações de finance
export interface RawSpend {
  id: string;
  dashboard_id: string | null;
  provider: string;
  account_id: string;
  account_name: string;
  account_status: string;
  campaign_id: string;
  campaign_name: string;
  campaign_status: string;
  spend: number;
  impressions: number;
  clicks: number;
  results: number;
  spend_date: string;    // YYYY-MM-DD
  fetched_at: string;    // ISO timestamp
}

// Resumo real de tráfego para o TrafficBlock no dashboard principal
export interface RealTrafficSummary {
  gasto_dia: number;
  roas_confirmado: number;
  roas_projetado: number;
  cpa: number;
  roi: number;
  has_data: boolean;
  fetched_at: string | null;
}

// -----------------------------------------------------------------------
// Funções de fetch
// -----------------------------------------------------------------------

export async function fetchDashboardSpend(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  dashboardId: string,
  from: string,  // YYYY-MM-DD
  to: string     // YYYY-MM-DD
): Promise<RawSpend[]> {
  const { data } = await supabase
    .from('ad_spend')
    .select('id, dashboard_id, provider, account_id, account_name, account_status, campaign_id, campaign_name, campaign_status, spend, impressions, clicks, results, spend_date, fetched_at')
    .eq('dashboard_id', dashboardId)
    .gte('spend_date', from)
    .lte('spend_date', to);
  return (data ?? []) as RawSpend[];
}

export async function fetchOperationSpend(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  operationId: string,
  from: string,
  to: string
): Promise<RawSpend[]> {
  const { data } = await supabase
    .from('ad_spend')
    .select('id, dashboard_id, provider, account_id, account_name, account_status, campaign_id, campaign_name, campaign_status, spend, impressions, clicks, results, spend_date, fetched_at')
    .eq('operation_id', operationId)
    .gte('spend_date', from)
    .lte('spend_date', to);
  return (data ?? []) as RawSpend[];
}

// -----------------------------------------------------------------------
// Conversão para FinanceEntry (calc.ts)
// -----------------------------------------------------------------------

// Converte linhas de ad_spend em FinanceEntry[] para o DRE via calc.ts.
// Uma entrada por (dashboard, dia) agrupada por data — mesma granularidade das entradas manuais.
export function spendToFinanceEntries(spend: RawSpend[]): FinanceEntry[] {
  // Agrega por dashboard_id + spend_date para evitar N linhas por campanha no DRE
  const grouped = new Map<string, { amount: number; dashboard_id: string | null; date: string }>();
  for (const row of spend) {
    const key = `${row.dashboard_id ?? 'null'}_${row.spend_date}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.amount += Number(row.spend);
    } else {
      grouped.set(key, {
        amount: Number(row.spend),
        dashboard_id: row.dashboard_id,
        date: row.spend_date,
      });
    }
  }

  return Array.from(grouped.entries()).map(([key, v]) => ({
    id: `spend_${key}`,
    direction: 'saida' as const,
    category: 'trafego',
    amount: v.amount,
    entry_date: v.date,
    status: 'pago' as const,
    dashboard_id: v.dashboard_id,
  }));
}

// Mescla finance_entries com entries derivadas de ad_spend.
// Se spendEntries.length > 0, exclui 'trafego' manual do dashboard — evita dupla contagem.
export function mergeEntriesWithSpend(
  financeEntries: FinanceEntry[],
  spendEntries: FinanceEntry[],
  dashboardId: string
): FinanceEntry[] {
  if (spendEntries.length === 0) return financeEntries;
  const filtered = financeEntries.filter(e => {
    if (e.dashboard_id !== dashboardId) return true;
    return !SPEND_CATEGORIES.has(e.category);
  });
  return [...filtered, ...spendEntries];
}

// -----------------------------------------------------------------------
// Resumo real para o TrafficBlock
// -----------------------------------------------------------------------

// sales mínimos necessários para o cálculo de ROAS/CPA
interface MinimalSale {
  amount: number;
  status: string;
  occurred_at: string;
}

// Computa o resumo de tráfego a partir de dados reais do dia atual.
// today = YYYY-MM-DD
export function computeTrafficSummary(
  spend: RawSpend[],
  sales: MinimalSale[],
  today: string
): RealTrafficSummary {
  const todaySpend = spend.filter(s => s.spend_date === today);
  const gasto_dia = todaySpend.reduce((sum, s) => sum + Number(s.spend), 0);

  const latestFetched = spend.reduce(
    (best, s) => (!best || s.fetched_at > best ? s.fetched_at : best),
    null as string | null
  );

  if (gasto_dia === 0) {
    return { gasto_dia: 0, roas_confirmado: 0, roas_projetado: 0, cpa: 0, roi: 0, has_data: spend.length > 0, fetched_at: latestFetched };
  }

  const todayIsoPrefix = today;
  const todaySalesApproved = sales.filter(
    s => s.status === 'aprovado' && s.occurred_at.startsWith(todayIsoPrefix)
  );
  const todayPixPending = sales.filter(
    s => (s.status === 'pix_gerado' || s.status === 'pix_pago') && s.occurred_at.startsWith(todayIsoPrefix)
  );

  const faturamento_dia = todaySalesApproved.reduce((sum, s) => sum + Number(s.amount), 0);
  // ROAS projetado: inclui pix gerado com taxa histórica de 75%
  const pixEstimado = todayPixPending.reduce((sum, s) => sum + Number(s.amount) * 0.75, 0);

  const roas_confirmado = gasto_dia > 0 ? faturamento_dia / gasto_dia : 0;
  const roas_projetado  = gasto_dia > 0 ? (faturamento_dia + pixEstimado) / gasto_dia : 0;
  const cpa  = todaySalesApproved.length > 0 ? gasto_dia / todaySalesApproved.length : 0;
  const roi  = gasto_dia > 0 ? ((faturamento_dia - gasto_dia) / gasto_dia) * 100 : 0;

  return {
    gasto_dia,
    roas_confirmado,
    roas_projetado,
    cpa,
    roi,
    has_data: true,
    fetched_at: latestFetched,
  };
}
