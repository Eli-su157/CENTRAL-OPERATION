// Gerador de snapshot para relatórios da operação.
// Puxa dados REAIS de cada fonte: financeiro (calc.ts), tráfego (mock→swap 9d),
// materiais (DB), tarefas (DB).
// SERVER-ONLY — nunca importar em componentes client.

import { calcDre, calcAccountSummary, type FinanceEntry } from '@/lib/finance/calc';
import { getTrafficData } from '@/lib/mock/traffic';
import { getMaterialPerformance } from '@/lib/mock/materials';
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

  // ── TRÁFEGO (mock → swap real na Fase 9d) ────────────────
  // Usa o período atual como proxy pois o mock não filtra por data
  const trafficPeriod = periodType === 'mensal'
    ? periodRef
    : `${periodRef.split('-W')[0]}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const { data: dashboards } = await db
    .from('dashboards')
    .select('id')
    .eq('operation_id', operationId);

  const firstDashId = (dashboards as { id: string }[] | null)?.[0]?.id ?? 'demo';
  const traffic = getTrafficData(firstDashId, trafficPeriod);

  const trafego = {
    gasto_total:       traffic.gasto_dia * 30,
    faturamento_total: traffic.faturamento_dia * 30,
    roas_confirmado:   traffic.roas_confirmado,
    roas_projetado:    traffic.roas_projetado,
    campanhas_ativas:  traffic.campaigns.filter(c => c.status === 'ativa').length,
    note:              'dados mock — swap real na Fase 9d',
  };

  // ── PRODUÇÃO (materiais) ──────────────────────────────────
  const { data: matRows } = await db
    .from('materials')
    .select('id, type, status')
    .eq('operation_id', operationId)
    .gte('created_at', start + 'T00:00:00')
    .lte('created_at', end + 'T23:59:59');

  const mats = (matRows ?? []) as { id: string; type: string; status: string }[];
  const matNoAr = mats.filter(m => m.status === 'no_ar');

  // Criativo destaque: melhor ROAS entre os "no ar"
  let crDestaqueLabel: string | null = null;
  let crDestaqueRoas: number | null = null;
  for (const m of matNoAr) {
    const p = getMaterialPerformance(m.id);
    if (crDestaqueRoas === null || p.roas > crDestaqueRoas) {
      crDestaqueRoas = p.roas;
      crDestaqueLabel = m.id;
    }
  }

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
