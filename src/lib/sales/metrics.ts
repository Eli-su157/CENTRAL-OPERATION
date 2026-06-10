// Motor de métricas de vendas — consome a tabela sales (dados reais de webhook).
// Respeita o primary_sale_provider do dashboard: se definido, só conta esse provider.
// Converte sales → FinanceEntry[] para o calc.ts (fonte única da verdade do lucro).

import type { FinanceEntry } from '@/lib/finance/calc';

export type SaleProviderKey = 'hotmart' | 'paradise' | 'vega' | 'shopify';

// Retornado por computeSalesMetrics — espelho dos campos usados pelo SalesBlock
export interface SalesMetrics {
  aprovadas_qtd: number;
  aprovadas_valor: number;
  ticket_medio: number;
  taxa_reembolso: number;   // %
  conversao_pix: number;    // % (aprovadas / total pix gerado+aprovado)
  has_data: boolean;
  no_primary_provider_warning: boolean; // true quando primary não está definido
}

// Shape mínimo de uma linha de sales vinda do banco
export interface RawSale {
  id: string;
  dashboard_id: string | null;
  provider: string;
  status: string;
  amount: number;
  fees: number;
  occurred_at: string;
}

// Categorias de receita que sales substitui em finance_entries quando há dados.
// Exportado para as pages poderem filtrar finance_entries antes de mergear.
export const SALES_CATEGORIES = new Set(['venda', 'taxa_plataforma', 'reembolso']);

// Busca todas as vendas de um dashboard no período.
// Se primaryProvider definido: filtra por provider.
// Se null: busca todos os providers e sinaliza aviso.
export async function fetchDashboardSales(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  dashboardId: string,
  primaryProvider: string | null,
  from: string, // YYYY-MM-DD
  to: string    // YYYY-MM-DD
): Promise<{ sales: RawSale[]; noPrimaryWarning: boolean }> {
  let query = supabase
    .from('sales')
    .select('id, dashboard_id, provider, status, amount, fees, occurred_at')
    .eq('dashboard_id', dashboardId)
    .gte('occurred_at', from)
    .lte('occurred_at', `${to}T23:59:59.999Z`);

  if (primaryProvider) {
    query = query.eq('provider', primaryProvider);
  }

  const { data } = await query;
  return {
    sales: (data ?? []) as RawSale[],
    noPrimaryWarning: !primaryProvider,
  };
}

// Busca todas as vendas de uma operação no período (para a visão consolidada).
export async function fetchOperationSales(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  operationId: string,
  from: string,
  to: string
): Promise<RawSale[]> {
  const { data } = await supabase
    .from('sales')
    .select('id, dashboard_id, provider, status, amount, fees, occurred_at')
    .eq('operation_id', operationId)
    .gte('occurred_at', from)
    .lte('occurred_at', `${to}T23:59:59.999Z`);

  return (data ?? []) as RawSale[];
}

export function computeSalesMetrics(
  sales: RawSale[],
  noPrimaryWarning: boolean
): SalesMetrics {
  const aprovadas  = sales.filter(s => s.status === 'aprovado');
  const reembolsadas = sales.filter(s => s.status === 'reembolsado');
  // Pix gerado = pix_gerado + pix_pago (gerados, ainda não confirmados como aprovados)
  const pixGerado  = sales.filter(s => s.status === 'pix_gerado' || s.status === 'pix_pago');

  const aprovadas_qtd  = aprovadas.length;
  const aprovadas_valor = aprovadas.reduce((s, v) => s + Number(v.amount), 0);
  const ticket_medio   = aprovadas_qtd > 0 ? aprovadas_valor / aprovadas_qtd : 0;
  const taxa_reembolso = aprovadas_qtd > 0 ? (reembolsadas.length / aprovadas_qtd) * 100 : 0;
  // Conversão Pix = aprovadas / (pix_gerado + pix_pago + aprovadas)
  const totalFunnel  = pixGerado.length + aprovadas_qtd;
  const conversao_pix = totalFunnel > 0 ? (aprovadas_qtd / totalFunnel) * 100 : 0;

  return {
    aprovadas_qtd,
    aprovadas_valor,
    ticket_medio,
    taxa_reembolso,
    conversao_pix,
    has_data: sales.length > 0,
    no_primary_provider_warning: noPrimaryWarning,
  };
}

// Converte sales aprovadas/reembolsadas em FinanceEntry[] para o calc.ts.
// Só status que impactam receita/custo: aprovado (entrada + taxa) e reembolsado (saida).
export function salesToFinanceEntries(sales: RawSale[]): FinanceEntry[] {
  const entries: FinanceEntry[] = [];

  for (const sale of sales) {
    const date = sale.occurred_at.split('T')[0];

    if (sale.status === 'aprovado') {
      entries.push({
        id: `${sale.id}_rev`,
        direction: 'entrada',
        category: 'venda',
        amount: Number(sale.amount),
        entry_date: date,
        status: 'pago',
        dashboard_id: sale.dashboard_id,
      });
      if (Number(sale.fees) > 0) {
        entries.push({
          id: `${sale.id}_fee`,
          direction: 'saida',
          category: 'taxa_plataforma',
          amount: Number(sale.fees),
          entry_date: date,
          status: 'pago',
          dashboard_id: sale.dashboard_id,
        });
      }
    }

    if (sale.status === 'reembolsado') {
      entries.push({
        id: `${sale.id}_ref`,
        direction: 'saida',
        category: 'reembolso',
        amount: Number(sale.amount),
        entry_date: date,
        status: 'pago',
        dashboard_id: sale.dashboard_id,
      });
    }
  }

  return entries;
}

// Mescla finance_entries com entries derivadas de sales.
// Se salesEntries.length > 0, exclui as categorias de receita/taxa/reembolso
// de finance_entries para o dashboard específico — evita dupla contagem.
// Entradas operation-wide (dashboard_id = null) nunca são deslocadas.
export function mergeEntriesWithSales(
  financeEntries: FinanceEntry[],
  salesEntries: FinanceEntry[],
  dashboardId: string
): FinanceEntry[] {
  if (salesEntries.length === 0) return financeEntries;

  const filtered = financeEntries.filter(e => {
    if (e.dashboard_id !== dashboardId) return true;
    return !SALES_CATEGORIES.has(e.category);
  });

  return [...filtered, ...salesEntries];
}
