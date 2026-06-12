// ============================================================
// CONSTRUTOR DE CONTEXTO PARA IA — SERVIDOR APENAS
// ============================================================
// PRINCÍPIO DE SEGURANÇA: a IA só recebe dados que o papel do
// usuário pode ver. getAuthContext/permissions é a fonte de verdade.
// Nunca importar em Client Components.
// ============================================================

import type { AuthContext } from '@/lib/auth/getPermissions';
import {
  calcDre, calcDreComparativo, calcEvolutionSeries,
  calcMargem, calcTotalCustos,
  filterByPeriod, monthStart, monthEnd,
  type FinanceEntry,
} from '@/lib/finance/calc';
import { formatCurrency } from '@/lib/utils/format';

// Contexto compacto que vai para a IA — < 3000 tokens na maioria dos casos
export interface AIContext {
  operacao: {
    nome: string;
    papel: string;        // dono/head/lider/executor
    setor: string | null;
  };
  periodo: {
    label: string;
    start: string;
    end: string;
  };
  // Dados financeiros — null se usuário não tem permissão
  financeiro: {
    receita_bruta:    string;
    lucro_liquido:    string;
    margem_pct:       string;
    total_custos:     string;
    a_receber:        string;
    a_pagar:          string;
    linhas_dre: {
      descricao: string;
      valor: string;
      pct_receita: string;
    }[];
    vs_mes_anterior?: {
      receita_delta_pct: string;
      lucro_delta_pct: string;
    };
  } | null;
  // Tarefas — filtradas pelo scope do usuário
  tarefas: {
    abertas:     number;
    atrasadas:   number;
    concluidas:  number;
    por_setor:   Record<string, number>;
  };
  // Alertas ativos (já são filtrados por visibilidade no AlertsBar)
  alertas_ativos: string[];
  // Tráfego — resumido (null se não tem acesso)
  trafego: {
    total_gasto:   string;
    total_receita: string;
    roas:          string;
  } | null;
  // Instruções de contexto para a IA
  _meta: {
    pode_ver_financeiro: boolean;
    pode_criar_tarefas:  boolean;
    data_consulta:       string;
  };
}

export async function buildAIContext(
  ctx: AuthContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  operacaoNome: string,
): Promise<AIContext> {
  const { permissions, profile } = ctx;
  const opId = profile.operation_id;
  const from  = monthStart();
  const to    = monthEnd();
  const prevFrom = monthStart(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1));
  const prevTo   = monthEnd(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1));

  const today = new Date().toISOString().split('T')[0];

  // ── Tarefas (filtradas por scope) ─────────────────────────────────────────
  let tasksQuery = supabase
    .from('tasks')
    .select('id, status, sector, due_date, assignee_user_id')
    .eq('operation_id', opId);

  if (permissions.pode_atribuir_tarefa === 'meu_setor' && profile.sector) {
    tasksQuery = tasksQuery.eq('sector', profile.sector);
  } else if (permissions.pode_atribuir_tarefa === 'nenhum') {
    tasksQuery = tasksQuery.eq('assignee_user_id', ctx.userId);
  }

  const [tasksRes, alertsRes] = await Promise.all([
    tasksQuery,
    supabase
      .from('alerts')
      .select('message, severity, visible_to')
      .eq('operation_id', opId)
      .eq('status', 'ativo')
      .limit(10),
  ]);

  const tasks = (tasksRes.data ?? []) as { id: string; status: string; sector: string; due_date: string | null }[];
  const atrasadas = tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'concluida').length;
  const porSetor: Record<string, number> = {};
  for (const t of tasks) {
    if (t.status !== 'concluida') {
      porSetor[t.sector] = (porSetor[t.sector] ?? 0) + 1;
    }
  }

  // Alertas filtrados por visibilidade do papel
  const allAlerts = (alertsRes.data ?? []) as { message: string; severity: string; visible_to: string }[];
  const visibleAlerts = allAlerts
    .filter(a => a.visible_to === 'todos' || permissions.pode_ver_financeiro)
    .map(a => `[${a.severity.toUpperCase()}] ${a.message}`)
    .slice(0, 8);

  // ── Financeiro (só se pode_ver_financeiro) ────────────────────────────────
  let financeiroCtx: AIContext['financeiro'] = null;
  if (permissions.pode_ver_financeiro) {
    const [currRes, prevRes, adSpendRes] = await Promise.all([
      supabase
        .from('finance_entries')
        .select('id, direction, category, amount, entry_date, status, dashboard_id')
        .eq('operation_id', opId)
        .gte('entry_date', from)
        .lte('entry_date', to),
      supabase
        .from('finance_entries')
        .select('id, direction, category, amount, entry_date, status, dashboard_id')
        .eq('operation_id', opId)
        .gte('entry_date', prevFrom)
        .lte('entry_date', prevTo),
      supabase
        .from('ad_spend')
        .select('spend, spend_date')
        .eq('operation_id', opId)
        .gte('spend_date', from)
        .lte('spend_date', to),
    ]);

    const toEntry = (rows: Record<string, unknown>[]): FinanceEntry[] =>
      rows.map(e => ({
        id: e.id as string,
        direction: e.direction as 'entrada' | 'saida',
        category: e.category as string,
        amount: Number(e.amount),
        entry_date: e.entry_date as string,
        status: e.status as 'pago' | 'a_pagar' | 'a_receber',
        dashboard_id: e.dashboard_id as string | null,
      }));

    const currEntries = toEntry(currRes.data ?? []);
    const prevEntries = toEntry(prevRes.data ?? []);
    const dre = calcDreComparativo(currEntries, prevEntries);
    const margem = calcMargem(dre);
    const totalCustos = calcTotalCustos(dre);
    const aReceber = currEntries.filter(e => e.direction === 'entrada' && e.status === 'a_receber').reduce((s, e) => s + e.amount, 0);
    const aPagar   = currEntries.filter(e => e.direction === 'saida'  && e.status === 'a_pagar').reduce((s, e) => s + e.amount, 0);

    const linhas = [
      { descricao: 'Receita bruta',          valor: dre.receita_bruta,     pct: 100 },
      { descricao: '(-) Taxas plataforma',   valor: -dre.taxas_plataforma, pct: dre.receita_bruta > 0 ? (dre.taxas_plataforma / dre.receita_bruta) * 100 : 0 },
      { descricao: '(-) Reembolsos',         valor: -dre.reembolsos,       pct: dre.receita_bruta > 0 ? (dre.reembolsos / dre.receita_bruta) * 100 : 0 },
      { descricao: '(-) Gasto tráfego',      valor: -dre.gasto_trafego,    pct: dre.receita_bruta > 0 ? (dre.gasto_trafego / dre.receita_bruta) * 100 : 0 },
      { descricao: '(-) Comissões',          valor: -dre.comissoes,        pct: dre.receita_bruta > 0 ? (dre.comissoes / dre.receita_bruta) * 100 : 0 },
      { descricao: '(-) Custos fixos',       valor: -dre.custos_fixos,     pct: dre.receita_bruta > 0 ? (dre.custos_fixos / dre.receita_bruta) * 100 : 0 },
      { descricao: '(-) Pagamentos equipe',  valor: -dre.pagamentos_equipe,pct: dre.receita_bruta > 0 ? (dre.pagamentos_equipe / dre.receita_bruta) * 100 : 0 },
      { descricao: '(-) Outros',             valor: -dre.outros,           pct: dre.receita_bruta > 0 ? (dre.outros / dre.receita_bruta) * 100 : 0 },
    ].filter(l => l.valor !== 0);

    // Tráfego com ad_spend real
    const totalGasto = ((adSpendRes.data ?? []) as { spend: number }[]).reduce((s, r) => s + Number(r.spend), 0);
    const roasVal = totalGasto > 0 && dre.receita_bruta > 0 ? dre.receita_bruta / totalGasto : 0;

    financeiroCtx = {
      receita_bruta:  formatCurrency(dre.receita_bruta),
      lucro_liquido:  formatCurrency(dre.lucro_liquido),
      margem_pct:     `${margem.toFixed(1)}%`,
      total_custos:   formatCurrency(totalCustos),
      a_receber:      formatCurrency(aReceber),
      a_pagar:        formatCurrency(aPagar),
      linhas_dre: linhas.map(l => ({
        descricao: l.descricao,
        valor: formatCurrency(Math.abs(l.valor)),
        pct_receita: `${l.pct.toFixed(1)}%`,
      })),
      vs_mes_anterior: dre.prev.receita_bruta > 0 ? {
        receita_delta_pct: `${(dre.delta_pct.receita_bruta ?? 0).toFixed(1)}%`,
        lucro_delta_pct:   `${(dre.delta_pct.lucro_liquido ?? 0).toFixed(1)}%`,
      } : undefined,
    };

    // Tráfego (inclui em financeiroCtx context via campo separado)
    return {
      operacao: { nome: operacaoNome, papel: profile.role, setor: profile.sector ?? null },
      periodo: { label: `Mês atual (${from} a ${to})`, start: from, end: to },
      financeiro: financeiroCtx,
      tarefas: { abertas: tasks.filter(t => t.status !== 'concluida').length, atrasadas, concluidas: tasks.filter(t => t.status === 'concluida').length, por_setor: porSetor },
      alertas_ativos: visibleAlerts,
      trafego: totalGasto > 0 ? {
        total_gasto:   formatCurrency(totalGasto),
        total_receita: formatCurrency(dre.receita_bruta),
        roas:          roasVal > 0 ? `${roasVal.toFixed(2)}x` : '—',
      } : null,
      _meta: {
        pode_ver_financeiro: true,
        pode_criar_tarefas:  permissions.pode_atribuir_tarefa !== 'nenhum',
        data_consulta:       new Date().toISOString(),
      },
    };
  }

  // Sem acesso financeiro — contexto reduzido
  return {
    operacao: { nome: operacaoNome, papel: profile.role, setor: profile.sector ?? null },
    periodo: { label: `Mês atual (${from} a ${to})`, start: from, end: to },
    financeiro: null,
    tarefas: { abertas: tasks.filter(t => t.status !== 'concluida').length, atrasadas, concluidas: tasks.filter(t => t.status === 'concluida').length, por_setor: porSetor },
    alertas_ativos: visibleAlerts,
    trafego: null,
    _meta: {
      pode_ver_financeiro: false,
      pode_criar_tarefas:  permissions.pode_atribuir_tarefa !== 'nenhum',
      data_consulta:       new Date().toISOString(),
    },
  };
}
