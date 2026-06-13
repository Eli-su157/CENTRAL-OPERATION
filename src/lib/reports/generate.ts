// Gerador de snapshot para relatórios da operação.
// Puxa dados REAIS de cada fonte: financeiro (calc.ts), tráfego (tracker_sales/ad_spend),
// materiais (DB), tarefas (DB).
// SERVER-ONLY — nunca importar em componentes client.

import { calcDre, calcAccountSummary, type FinanceEntry } from '@/lib/finance/calc';
import { fetchTrackerData } from '@/lib/traffic/trackerData';
import { fetchDashboardSpend } from '@/lib/traffic/spend';
import { getPeriodDates } from './periods';
import type { ReportData } from './types';

interface GenerateOptions {
  operationId: string;
  periodType: 'semanal' | 'mensal';
  periodRef: string;
  // Supabase client (any — compatibilidade postgrest-js 2.107+)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
}

export async function generateReportData(opts: GenerateOptions): Promise<ReportData> {
  const { operationId, periodType, periodRef, db } = opts;
  const { start, end } = getPeriodDates(periodType, periodRef);

  // ── FINANCEIRO ─────────────────────────────────────────────
  const { data: finRows } = await db
    .from('finance_entries')
    .select('id, direction, category, amount, entry_date, status, dashboard_id')
    .eq('operation_id', operationId)
    .gte('entry_date', start)
    .lte('entry_date', end);

  const entries: FinanceEntry[] = (finRows ?? []).map((e: Record<string, unknown>) => ({
    id: e.id as string,
    direction: e.direction as 'entrada' | 'saida',
    category: e.category as string,
    amount: Number(e.amount),
    entry_date: e.entry_date as string,
    status: e.status as 'pago' | 'a_pagar' | 'a_receber',
    dashboard_id: e.dashboard_id as string | null,
  }));

  const dre = calcDre(entries);
  const summary = calcAccountSummary(entries);

  const financeiro = {
    receita_bruta:    dre.receita_bruta,
    taxas_plataforma: dre.taxas_plataforma,
    reembolsos:       dre.reembolsos,
    gasto_trafego:    dre.gasto_trafego,
    comissoes:        dre.comissoes,
    custos_fixos:     dre.custos_fixos,
    outros_custos:    (dre.outros ?? 0) + (dre.pagamentos_equipe ?? 0),
    lucro_liquido:    dre.lucro_liquido,
    a_receber:        summary.a_receber,
    a_pagar:          summary.a_pagar,
    total_entradas:   entries.filter(e => e.direction === 'entrada').reduce((s, e) => s + e.amount, 0),
    total_saidas:     entries.filter(e => e.direction === 'saida').reduce((s, e) => s + e.amount, 0),
  };

  // ── TRÁFEGO — tracker real + ad_spend ────────────────────
  const { data: dashboards } = await db
    .from('dashboards')
    .select('id')
    .eq('operation_id', operationId);

  const dashIds = ((dashboards as { id: string }[] | null) ?? []).map(d => d.id);

  // Agrega tracker + spend de todos os dashboards da operação no período
  const trackerResults = await Promise.all(
    dashIds.map(id => fetchTrackerData(db, id, start, end))
  );
  const spendResults = await Promise.all(
    dashIds.map(id => fetchDashboardSpend(db, id, start, end))
  );

  const allTrackerSales = trackerResults.flatMap(r => r.trackerSales);
  const allTrackerAggs  = trackerResults.flatMap(r => r.trackerAggs);
  const allSpend        = spendResults.flat();
  const hasTracker      = allTrackerSales.length > 0 || allTrackerAggs.length > 0 || allSpend.length > 0;

  let trafego: import('./types').ReportTrafego | null = null;
  if (hasTracker) {
    const gastoTotal     = allSpend.reduce((s, r) => s + Number(r.spend), 0);
    const revenueTotal   = allTrackerSales
      .filter(s => (s as { status: string }).status === 'aprovado')
      .reduce((s, r) => s + Number((r as { amount: number }).amount), 0);
    const roas           = gastoTotal > 0 ? revenueTotal / gastoTotal : 0;

    // Campanhas ativas: campanhas com spend > 0 no período
    const campanhasAtivas = new Set(
      allSpend.filter(r => Number(r.spend) > 0).map(r => r.campaign_id).filter(Boolean)
    ).size;

    trafego = {
      gasto_total:      gastoTotal,
      faturamento_total: revenueTotal,
      roas_confirmado:  roas,
      roas_projetado:   roas,
      campanhas_ativas: campanhasAtivas,
    };
  }

  // ── PRODUÇÃO (materiais) ──────────────────────────────────
  const { data: matRows } = await db
    .from('materials')
    .select('id, type, status')
    .eq('operation_id', operationId)
    .gte('created_at', start + 'T00:00:00')
    .lte('created_at', end + 'T23:59:59');

  const mats = (matRows ?? []) as { id: string; type: string; status: string }[];
  const matNoAr = mats.filter(m => m.status === 'no_ar');

  // Criativo destaque: primeiro "no ar" por criação (sem performance mock)
  const crDestaqueLabel: string | null = matNoAr[0]?.id ?? null;
  const crDestaqueRoas: number | null = null;

  const porTipo: Record<string, number> = {};
  for (const m of mats) {
    porTipo[m.type] = (porTipo[m.type] ?? 0) + 1;
  }

  const producao = {
    materiais_entregues:       mats.filter(m => ['pronto', 'no_ar'].includes(m.status)).length,
    materiais_no_ar:           matNoAr.length,
    materiais_em_producao:     mats.filter(m => m.status === 'em_producao').length,
    criativo_destaque:         crDestaqueLabel,
    roas_criativo_destaque:    crDestaqueRoas,
    por_tipo:                  porTipo,
  };

  // ── OPERAÇÃO (tarefas) ────────────────────────────────────
  const { data: taskRows } = await db
    .from('tasks')
    .select('id, status, sector, due_date')
    .eq('operation_id', operationId)
    .gte('created_at', start + 'T00:00:00')
    .lte('created_at', end + 'T23:59:59');

  const tasks = (taskRows ?? []) as { id: string; status: string; sector: string; due_date: string | null }[];
  const today = new Date().toISOString().split('T')[0];

  const concluidas = tasks.filter(t => t.status === 'concluida').length;
  const atrasadas = tasks.filter(t => t.status !== 'concluida' && t.due_date && t.due_date < today).length;

  // Gargalos: setores com mais tarefas atrasadas
  const gargaloMap: Record<string, number> = {};
  for (const t of tasks) {
    if (t.status !== 'concluida' && t.due_date && t.due_date < today) {
      gargaloMap[t.sector] = (gargaloMap[t.sector] ?? 0) + 1;
    }
  }
  const gargalos = Object.entries(gargaloMap)
    .map(([setor, quantidade]) => ({ setor, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade);

  const operacao = {
    tarefas_concluidas: concluidas,
    tarefas_atrasadas:  atrasadas,
    tarefas_pendentes:  tasks.filter(t => t.status !== 'concluida').length,
    total_tarefas:      tasks.length,
    gargalos,
  };

  return {
    period_type:  periodType,
    period_ref:   periodRef,
    period_start: start,
    period_end:   end,
    financeiro,
    trafego,
    producao,
    operacao,
    gerado_em:    new Date().toISOString(),
  };
}
