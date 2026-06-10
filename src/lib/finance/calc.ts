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
