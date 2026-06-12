// ============================================================
// FONTE ÚNICA DA VERDADE para cálculos financeiros.
// Todos os números de lucro, receita e despesa do sistema
// passam por aqui — dashboard, cards de produto, DRE, tudo.
// Nunca calcule lucro em outro lugar. Importe estas funções.
// ============================================================

export interface FinanceEntry {
  id: string;
  direction: 'entrada' | 'saida';
  category: string;
  amount: number;
  entry_date: string;
  status: 'pago' | 'a_pagar' | 'a_receber';
  dashboard_id: string | null;
}

// Categorias que mapeiam para cada linha do DRE
export const DRE_CATEGORIES: Record<string, DreLineKey> = {
  venda:           'receita_bruta',
  aporte:          'receita_bruta',
  outro_entrada:   'receita_bruta',
  taxa_plataforma: 'taxas_plataforma',
  reembolso:       'reembolsos',
  trafego:         'gasto_trafego',
  comissao:        'comissoes',
  custo_fixo:      'custos_fixos',
  salario:         'pagamentos_equipe',
  imposto:         'custos_fixos',
  outro_saida:     'outros',
};

export type DreLineKey =
  | 'receita_bruta'
  | 'taxas_plataforma'
  | 'reembolsos'
  | 'gasto_trafego'
  | 'comissoes'
  | 'custos_fixos'
  | 'pagamentos_equipe'
  | 'outros';

export interface DreResult {
  receita_bruta: number;
  taxas_plataforma: number;
  reembolsos: number;
  gasto_trafego: number;
  comissoes: number;
  custos_fixos: number;
  pagamentos_equipe: number;
  outros: number;
  lucro_liquido: number; // THE number — único cálculo no sistema
}

export interface AccountSummary {
  faturamento: number;      // receita_bruta (entradas pagas/a_receber)
  lucro_liquido: number;    // THE number
  a_receber: number;        // entradas com status 'a_receber'
  a_pagar: number;          // saídas com status 'a_pagar'
}

// Filtra entradas por período (início e fim inclusivos, formato YYYY-MM-DD)
export function filterByPeriod(
  entries: FinanceEntry[],
  from: string,
  to: string
): FinanceEntry[] {
  return entries.filter(e => e.entry_date >= from && e.entry_date <= to);
}

// Filtra entradas por dashboard (null = todas)
export function filterByDashboard(
  entries: FinanceEntry[],
  dashboardId: string | null
): FinanceEntry[] {
  if (!dashboardId) return entries;
  return entries.filter(e => e.dashboard_id === dashboardId || e.dashboard_id === null);
}

// DRE completo — cálculo central do sistema.
// Considera apenas lançamentos 'pago' (saídas) e 'pago'+'a_receber' (entradas)
// para o resultado realizado. A_pagar e a_receber aparecem separados no extrato.
export function calcDre(entries: FinanceEntry[]): DreResult {
  const dre: DreResult = {
    receita_bruta:     0,
    taxas_plataforma:  0,
    reembolsos:        0,
    gasto_trafego:     0,
    comissoes:         0,
    custos_fixos:      0,
    pagamentos_equipe: 0,
    outros:            0,
    lucro_liquido:     0,
  };

  for (const e of entries) {
    // Entradas: considerar pago + a_receber (receita realizada e comprometida)
    if (e.direction === 'entrada' && (e.status === 'pago' || e.status === 'a_receber')) {
      const line = DRE_CATEGORIES[e.category] ?? 'receita_bruta';
      (dre as unknown as Record<string, number>)[line] += e.amount;
    }
    // Saídas: considerar pago + a_pagar (comprometimento total)
    if (e.direction === 'saida' && (e.status === 'pago' || e.status === 'a_pagar')) {
      const line = DRE_CATEGORIES[e.category] ?? 'outros';
      (dre as unknown as Record<string, number>)[line] += e.amount;
    }
  }

  // Lucro líquido = receita bruta − todos os custos
  dre.lucro_liquido =
    dre.receita_bruta -
    dre.taxas_plataforma -
    dre.reembolsos -
    dre.gasto_trafego -
    dre.comissoes -
    dre.custos_fixos -
    dre.pagamentos_equipe -
    dre.outros;

  return dre;
}

// Resumo consolidado da conta (para cards de produto e header do /app)
export function calcAccountSummary(entries: FinanceEntry[]): AccountSummary {
  const dre = calcDre(entries);
  const a_receber = entries
    .filter(e => e.direction === 'entrada' && e.status === 'a_receber')
    .reduce((s, e) => s + e.amount, 0);
  const a_pagar = entries
    .filter(e => e.direction === 'saida' && e.status === 'a_pagar')
    .reduce((s, e) => s + e.amount, 0);

  return {
    faturamento: dre.receita_bruta,
    lucro_liquido: dre.lucro_liquido,
    a_receber,
    a_pagar,
  };
}

// ROAS: receita / gasto de tráfego. Retorna null se não houver tráfego.
export function calcRoas(dre: DreResult): number | null {
  if (dre.gasto_trafego === 0) return null;
  return dre.receita_bruta / dre.gasto_trafego;
}

// ─── EXTENSÕES PARA O MÓDULO FINANCEIRO ─────────────────────────────────────

// Margem líquida %
export function calcMargem(dre: DreResult): number {
  if (dre.receita_bruta === 0) return 0;
  return (dre.lucro_liquido / dre.receita_bruta) * 100;
}

// Total de custos (todas as linhas de saída do DRE)
export function calcTotalCustos(dre: DreResult): number {
  return (
    dre.taxas_plataforma +
    dre.reembolsos +
    dre.gasto_trafego +
    dre.comissoes +
    dre.custos_fixos +
    dre.pagamentos_equipe +
    dre.outros
  );
}

// Comparativo entre dois períodos: retorna o DRE atual + deltas absolutos e %
export interface DreComparativo extends DreResult {
  prev: DreResult;
  /** Variação absoluta (atual - anterior) para cada linha */
  delta_abs: Record<keyof DreResult, number>;
  /** Variação percentual para cada linha (null se divisão por zero) */
  delta_pct: Record<keyof DreResult, number | null>;
}

export function calcDreComparativo(
  current: FinanceEntry[],
  prev: FinanceEntry[]
): DreComparativo {
  const curr = calcDre(current);
  const previous = calcDre(prev);

  const keys = Object.keys(curr) as (keyof DreResult)[];
  const delta_abs = {} as Record<keyof DreResult, number>;
  const delta_pct = {} as Record<keyof DreResult, number | null>;

  for (const k of keys) {
    delta_abs[k] = curr[k] - previous[k];
    delta_pct[k] = previous[k] !== 0 ? ((curr[k] - previous[k]) / Math.abs(previous[k])) * 100 : null;
  }

  return { ...curr, prev: previous, delta_abs, delta_pct };
}

// Ponto da série de evolução mensal
export interface EvolutionPoint {
  month: string;         // YYYY-MM
  month_label: string;   // "Jan", "Fev", …
  receita: number;
  custos: number;
  lucro: number;
}

const SHORT_MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// Série de evolução por mês para o EvolutionChart (últimos N meses)
export function calcEvolutionSeries(
  entries: FinanceEntry[],
  months = 6
): EvolutionPoint[] {
  const now = new Date();
  const points: EvolutionPoint[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const from = monthStart(d);
    const to   = monthEnd(d);
    const slice = filterByPeriod(entries, from, to);
    const dre = calcDre(slice);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    points.push({
      month,
      month_label: `${SHORT_MONTHS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
      receita: dre.receita_bruta,
      custos:  calcTotalCustos(dre),
      lucro:   dre.lucro_liquido,
    });
  }
  return points;
}

// Projeção de fluxo de caixa: próximos 30 dias com a_receber e a_pagar por data
export interface CashflowDay {
  date: string;          // YYYY-MM-DD
  a_receber: number;
  a_pagar: number;
  saldo_dia: number;     // receber - pagar
}

export function calcCashflow(entries: FinanceEntry[]): CashflowDay[] {
  const today = todayIso();
  const limit = new Date();
  limit.setDate(limit.getDate() + 30);
  const limitStr = limit.toISOString().split('T')[0];

  const pending = entries.filter(
    e => e.entry_date >= today && e.entry_date <= limitStr &&
         (e.status === 'a_receber' || e.status === 'a_pagar')
  );

  const byDate = new Map<string, { a_receber: number; a_pagar: number }>();
  for (const e of pending) {
    const cur = byDate.get(e.entry_date) ?? { a_receber: 0, a_pagar: 0 };
    if (e.status === 'a_receber') cur.a_receber += e.amount;
    else                          cur.a_pagar   += e.amount;
    byDate.set(e.entry_date, cur);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      a_receber: v.a_receber,
      a_pagar:   v.a_pagar,
      saldo_dia: v.a_receber - v.a_pagar,
    }));
}

// Margem líquida por produto (dashboard)
export interface DashboardMargin {
  dashboard_id: string | null;
  name: string;
  receita: number;
  custos: number;
  lucro: number;
  margem_pct: number;
}

export function calcMargemPorDashboard(
  entries: FinanceEntry[],
  dashboards: { id: string; name: string }[]
): DashboardMargin[] {
  const result: DashboardMargin[] = [];

  for (const dash of dashboards) {
    const slice = entries.filter(e => e.dashboard_id === dash.id || e.dashboard_id === null);
    const dre = calcDre(slice);
    result.push({
      dashboard_id: dash.id,
      name:        dash.name,
      receita:     dre.receita_bruta,
      custos:      calcTotalCustos(dre),
      lucro:       dre.lucro_liquido,
      margem_pct:  calcMargem(dre),
    });
  }

  // Adiciona linha "Operação total" se houver mais de 1 produto
  if (dashboards.length > 1) {
    const total = calcDre(entries);
    result.unshift({
      dashboard_id: null,
      name:        'Operação total',
      receita:     total.receita_bruta,
      custos:      calcTotalCustos(total),
      lucro:       total.lucro_liquido,
      margem_pct:  calcMargem(total),
    });
  }

  return result;
}

// Datas helpers
export function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

export function monthStart(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}

export function monthEnd(date = new Date()): string {
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
}
