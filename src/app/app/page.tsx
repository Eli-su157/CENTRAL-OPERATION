import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/auth/getPermissions';
import { createClient } from '@/lib/supabase/server';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { CreateDashboardButton } from '@/components/dashboard/CreateDashboardButton';
import { ActivityFeed, type FeedEvent } from '@/components/home/ActivityFeed';
import { PendingActions, type PendingActionItem } from '@/components/home/PendingActions';
import { KPICard, EmptyState, AlertBannerList, EvolutionChart } from '@/components/ui';
import type { AlertItem } from '@/components/ui';
import { formatCurrency } from '@/lib/utils/format';
import {
  calcDre,
  calcAccountSummary,
  calcRoas,
  calcEvolutionSeries,
  filterByDashboard,
  filterByPeriod,
  monthStart,
  monthEnd,
  todayIso,
  type FinanceEntry,
  type AccountSummary,
} from '@/lib/finance/calc';
import {
  fetchOperationSales,
  salesToFinanceEntries,
  SALES_CATEGORIES,
  type RawSale,
} from '@/lib/sales/metrics';
import {
  fetchOperationSpend,
  spendToFinanceEntries,
  SPEND_CATEGORIES,
  type RawSpend,
} from '@/lib/traffic/spend';

// Tipos de evento que geram alerta automático
const AUTO_ALERT_TYPES = new Set([
  'reembolso',
  'chargeback',
  'meta_em_risco',
  'conta_bloqueada',
  'plataforma_desconectada',
  'tracker_desconectado',
  'recurso_caiu',
]);

// Severidade do alerta por tipo de evento
function alertSeverity(type: string): 'danger' | 'warning' {
  if (['chargeback', 'conta_bloqueada', 'recurso_caiu', 'plataforma_desconectada'].includes(type)) return 'danger';
  return 'warning';
}

// Label legível para o alerta gerado por um evento
function alertMessage(type: string, payload: Record<string, unknown>): string {
  const fmt = (n: number) => formatCurrency(n);
  switch (type) {
    case 'reembolso':         return `Reembolso de ${fmt(Number(payload['amount'] ?? 0))} via ${payload['provider'] ?? '—'} — verificar.`;
    case 'chargeback':        return `Chargeback de ${fmt(Number(payload['amount'] ?? 0))} registrado.`;
    case 'meta_em_risco':     return `Meta de ${payload['tipo'] ?? ''} em risco — pace atual ${Number(payload['pct'] ?? 0).toFixed(0)}%.`;
    case 'conta_bloqueada':   return `Conta ${payload['account_name'] ?? ''} (${payload['platform'] ?? ''}) bloqueada.`;
    case 'plataforma_desconectada': return `${payload['provider'] ?? 'Plataforma'} desconectada — reconectar.`;
    case 'tracker_desconectado':    return `Tracker ${payload['provider'] ?? ''} sem sinal.`;
    case 'recurso_caiu':      return `${payload['label'] ?? 'Recurso'} ${payload['status'] === 'lento' ? 'lento' : 'fora do ar'}.`;
    default: return type;
  }
}

// Data daqui a N dias no formato YYYY-MM-DD
function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

// Data N meses atrás para busca histórica
function monthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

// Label de data no formato pt-BR "DD/MM"
function labelDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

// Label de mês curto pt-BR
const SHORT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
function labelMonth(iso: string): string {
  const [y, m] = iso.split('-');
  return `${SHORT_MONTHS[parseInt(m) - 1]}/${y.slice(2)}`;
}

// Prioridade da tarefa → badge
const PRIORITY_LABEL: Record<string, string> = {
  alta: '🔴 Alta', media: '🟡 Média', baixa: '🟢 Baixa',
};

export default async function AppPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/');

  const canSeeFinancial = ctx.permissions.pode_ver_financeiro;
  const isOwnerOrHead = ctx.profile.role === 'dono' || ctx.profile.role === 'head';

  // Modo demo: dados fixos com mock financeiro
  if (process.env.NEXT_PUBLIC_DEMO === 'true') {
    const { DEMO_DASHBOARDS } = await import('@/lib/demo');
    const { getDashboardMetrics } = await import('@/lib/mock/metrics');

    const dashboardsWithSummary = DEMO_DASHBOARDS.map(d => {
      const m = getDashboardMetrics(d.id);
      return {
        ...d,
        summary: {
          faturamento: m.summary.faturamento_dia * 30,
          lucro_liquido: m.summary.lucro_liquido * 30,
          roas: m.summary.roas,
        },
      };
    });
    const consolidated = {
      faturamento: dashboardsWithSummary.reduce((s, d) => s + d.summary.faturamento, 0),
      lucro_liquido: dashboardsWithSummary.reduce((s, d) => s + d.summary.lucro_liquido, 0),
      a_receber: 0, a_pagar: 0,
    };
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Visão Geral</h1>
        </div>
        {canSeeFinancial && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <KPICard label="Faturamento" value={formatCurrency(consolidated.faturamento)} accent="brand" />
            <KPICard label="Lucro Líquido" value={formatCurrency(consolidated.lucro_liquido)}
              accent={consolidated.lucro_liquido >= 0 ? 'positive' : 'negative'} />
            <KPICard label="Produtos" value={String(DEMO_DASHBOARDS.length)} />
          </div>
        )}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Produtos</h2>
              <p className="text-xs text-zinc-600 mt-0.5">{DEMO_DASHBOARDS.length} / 5 dashboards</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {dashboardsWithSummary.map(d => (
              <DashboardCard key={d.id} dashboard={d} summary={d.summary} canSeeFinancial={canSeeFinancial} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const supabase = await createClient();

  const today = todayIso();
  const in7Days = daysFromNow(7);
  const historicFrom = monthsAgo(6); // 6 meses para o gráfico de evolução

  // Dashboards — filtrado se usuário estiver restrito
  let dashQuery = supabase
    .from('dashboards')
    .select('id, name, primary_sale_provider')
    .eq('operation_id', ctx.profile.operation_id)
    .order('created_at');

  if (ctx.permissions.restrito_a_dashboard) {
    dashQuery = dashQuery.eq('id', ctx.permissions.restrito_a_dashboard);
  }

  const [
    dashboardsRes,
    operationRes,
    financeMonthRes,
    financeHistoricRes,
    salesRes,
    spendRes,
    eventsRes,
    pendingRes,
    upcomingTasksRes,
    upcomingFinanceRes,
  ] = await Promise.all([
    dashQuery,

    supabase
      .from('operations')
      .select('max_dashboards')
      .eq('id', ctx.profile.operation_id)
      .single(),

    // Lançamentos do mês atual (KPIs)
    canSeeFinancial
      ? supabase
          .from('finance_entries')
          .select('id, direction, category, amount, entry_date, status, dashboard_id')
          .eq('operation_id', ctx.profile.operation_id)
          .gte('entry_date', monthStart())
          .lte('entry_date', monthEnd())
      : Promise.resolve({ data: null, error: null }),

    // 6 meses histórico para gráfico de evolução
    canSeeFinancial
      ? supabase
          .from('finance_entries')
          .select('id, direction, category, amount, entry_date, status, dashboard_id')
          .eq('operation_id', ctx.profile.operation_id)
          .gte('entry_date', historicFrom)
          .lte('entry_date', monthEnd())
      : Promise.resolve({ data: null, error: null }),

    // Vendas reais do mês
    canSeeFinancial
      ? fetchOperationSales(supabase, ctx.profile.operation_id, monthStart(), monthEnd())
      : Promise.resolve([] as RawSale[]),

    // Gasto de tráfego do mês
    canSeeFinancial
      ? fetchOperationSpend(supabase, ctx.profile.operation_id, monthStart(), monthEnd())
      : Promise.resolve([] as RawSpend[]),

    // Feed de atividade — últimos 30 eventos da operação
    supabase
      .from('events')
      .select('id, type, payload, dashboard_id, created_at')
      .eq('operation_id', ctx.profile.operation_id)
      .order('created_at', { ascending: false })
      .limit(30),

    // Ações pendentes — só para dono/head
    isOwnerOrHead
      ? supabase
          .from('pending_actions')
          .select('id, type, title, description, link, target_sector, target_role, created_at')
          .eq('operation_id', ctx.profile.operation_id)
          .eq('status', 'pendente')
          .order('created_at', { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),

    // Tarefas com due_date nos próximos 7 dias
    supabase
      .from('tasks')
      .select('id, title, due_date, priority, status, dashboard_id')
      .eq('operation_id', ctx.profile.operation_id)
      .neq('status', 'concluida')
      .gte('due_date', today)
      .lte('due_date', in7Days)
      .order('due_date')
      .limit(10),

    // Financeiro a receber/pagar nos próximos 7 dias
    canSeeFinancial
      ? supabase
          .from('finance_entries')
          .select('id, direction, category, amount, entry_date, status')
          .eq('operation_id', ctx.profile.operation_id)
          .in('status', ['a_receber', 'a_pagar'])
          .gte('entry_date', today)
          .lte('entry_date', in7Days)
          .order('entry_date')
          .limit(20)
      : Promise.resolve({ data: null, error: null }),
  ]);

  // ── Estrutura de dados ────────────────────────────────────────────────────────

  const dashboards = (dashboardsRes.data ?? []) as {
    id: string; name: string; primary_sale_provider: string | null;
  }[];

  const feedEvents: FeedEvent[] = (eventsRes.data ?? []).map(e => ({
    id: e.id, type: e.type, payload: e.payload as Record<string, unknown>,
    dashboard_id: e.dashboard_id, created_at: e.created_at,
  }));

  const pendingActions: PendingActionItem[] = (pendingRes.data ?? []).map(a => ({
    id: a.id, type: a.type, title: a.title, description: a.description,
    link: a.link, target_sector: a.target_sector, target_role: a.target_role,
    created_at: a.created_at,
  }));

  const maxDashboards = operationRes.data?.max_dashboards ?? 5;
  const maxReached = dashboards.length >= maxDashboards;

  // Converte finance_entries para FinanceEntry tipado
  function toFinanceEntries(raw: unknown[] | null): FinanceEntry[] {
    return ((raw ?? []) as {
      id: string; direction: string; category: string; amount: number;
      entry_date: string; status: string; dashboard_id?: string | null;
    }[]).map(e => ({
      id: e.id,
      direction: e.direction as 'entrada' | 'saida',
      category: e.category,
      amount: Number(e.amount),
      entry_date: e.entry_date,
      status: e.status as 'pago' | 'a_pagar' | 'a_receber',
      dashboard_id: e.dashboard_id ?? null,
    }));
  }

  const allFinanceEntries = toFinanceEntries(financeMonthRes.data);
  const allHistoricEntries = toFinanceEntries(financeHistoricRes.data);
  const allSales = salesRes as RawSale[];
  const allSpend = spendRes as RawSpend[];

  // ── Deduplicação de categorias por integração ────────────────────────────────

  const dashboardsWithSalesIds = new Set(allSales.map(s => s.dashboard_id).filter(Boolean) as string[]);
  const dashboardsWithSpendIds = new Set(allSpend.map(s => s.dashboard_id).filter(Boolean) as string[]);

  const dashboardsWithSummary = dashboards.map(d => {
    const primaryProvider = d.primary_sale_provider ?? null;
    const dashFinanceEntries = filterByDashboard(allFinanceEntries, d.id);
    let mergedEntries: FinanceEntry[] = dashFinanceEntries;

    if (dashboardsWithSalesIds.has(d.id)) {
      const dashSales = allSales.filter(s =>
        s.dashboard_id === d.id && (!primaryProvider || s.provider === primaryProvider)
      );
      const salesEntries = salesToFinanceEntries(dashSales);
      const filtered = dashFinanceEntries.filter(e =>
        e.dashboard_id !== d.id || !SALES_CATEGORIES.has(e.category)
      );
      mergedEntries = [...filtered, ...salesEntries];
    }

    if (dashboardsWithSpendIds.has(d.id)) {
      const dashSpend = allSpend.filter(s => s.dashboard_id === d.id);
      const spendEntries = spendToFinanceEntries(dashSpend);
      const filtered = mergedEntries.filter(e =>
        e.dashboard_id !== d.id || !SPEND_CATEGORIES.has(e.category)
      );
      mergedEntries = [...filtered, ...spendEntries];
    }

    const dre = calcDre(mergedEntries);
    const summary = calcAccountSummary(mergedEntries);
    return {
      ...d,
      summary: {
        faturamento: summary.faturamento,
        lucro_liquido: summary.lucro_liquido,
        roas: calcRoas(dre),
      },
    };
  });

  // ── Consolidado financeiro do mês ────────────────────────────────────────────

  let consolidated: AccountSummary;
  if (canSeeFinancial) {
    const cleanedFinance = allFinanceEntries.filter(e => {
      if (e.dashboard_id === null) return true;
      if (SALES_CATEGORIES.has(e.category) && dashboardsWithSalesIds.has(e.dashboard_id)) return false;
      if (SPEND_CATEGORIES.has(e.category) && dashboardsWithSpendIds.has(e.dashboard_id)) return false;
      return true;
    });
    const allSalesEntries = salesToFinanceEntries(allSales.filter(s => {
      const dash = dashboards.find(d => d.id === s.dashboard_id);
      const primary = dash?.primary_sale_provider ?? null;
      return !primary || s.provider === primary;
    }));
    const allSpendEntries = spendToFinanceEntries(allSpend);
    consolidated = calcAccountSummary([...cleanedFinance, ...allSalesEntries, ...allSpendEntries]);
  } else {
    consolidated = { faturamento: 0, lucro_liquido: 0, a_receber: 0, a_pagar: 0 };
  }

  // ── Série de evolução (30 dias → últimos 6 meses mensais) ─────────────────────

  let evolutionSeries: { month: string; month_label: string; receita: number; custos: number; lucro: number }[] = [];
  if (canSeeFinancial && allHistoricEntries.length > 0) {
    evolutionSeries = calcEvolutionSeries(allHistoricEntries, 6);
  }

  // ── Alertas ativos derivados de eventos recentes ──────────────────────────────

  const activeAlerts: AlertItem[] = feedEvents
    .filter(ev => AUTO_ALERT_TYPES.has(ev.type))
    .slice(0, 5)
    .map(ev => ({
      id: ev.id,
      type: alertSeverity(ev.type),
      message: alertMessage(ev.type, ev.payload),
    }));

  // ── Próximos eventos (O que vem aí) ──────────────────────────────────────────

  const upcomingTasks = (upcomingTasksRes.data ?? []) as {
    id: string; title: string; due_date: string;
    priority: string; status: string; dashboard_id: string | null;
  }[];

  const upcomingFinanceEntries = (upcomingFinanceRes.data ?? []) as {
    id: string; direction: string; category: string;
    amount: number; entry_date: string; status: string;
  }[];

  const hasUpcoming = upcomingTasks.length > 0 || upcomingFinanceEntries.length > 0;

  // ── Cálculos adicionais para a visão geral ────────────────────────────────────

  const margem = canSeeFinancial && consolidated.faturamento > 0
    ? (consolidated.lucro_liquido / consolidated.faturamento) * 100
    : null;

  const tasksUrgentes = upcomingTasks.filter(t => t.priority === 'alta');
  const totalTarefasVencendo = upcomingTasks.length;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="mb-8 pb-6 border-b border-white/[0.06] relative anim-slide-down overflow-hidden border-bottom-run">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-orange-500/30 via-orange-500/8 to-transparent" />
        <div className="absolute -top-8 -left-8 w-64 h-64 bg-orange-500/[0.03] blur-3xl rounded-full pointer-events-none" />
        <div className="flex items-center justify-between flex-wrap gap-4 relative">
          <div className="flex items-center gap-4">
            <div className="w-1.5 h-10 bg-gradient-to-b from-orange-400 to-orange-600 rounded-full shrink-0 shadow-[0_0_16px_rgba(249,115,22,0.8)]" />
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Visão Geral</h1>
              <p className="text-[11px] text-zinc-500 font-mono mt-0.5 tracking-widest uppercase">Mês atual · dados consolidados</p>
            </div>
          </div>
          {/* Mini status strip no header */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="dot-live absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">Ao vivo</span>
            </div>
            <div className="text-[10px] text-zinc-700 font-mono">
              {dashboards.length} produto{dashboards.length !== 1 ? 's' : ''} · {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Alertas ativos ──────────────────────────────────────────────────── */}
      {activeAlerts.length > 0 && (
        <div className="mb-6 anim-slide-up delay-100">
          <AlertBannerList alerts={activeAlerts} />
        </div>
      )}

      {/* ── KPIs consolidados — 4 cards ─────────────────────────────────────── */}
      {dashboards.length > 0 && canSeeFinancial && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 anim-slide-up delay-150">
          <KPICard
            label="Faturamento"
            value={formatCurrency(consolidated.faturamento)}
            accent="brand"
            sub={`A receber: ${formatCurrency(consolidated.a_receber)}`}
          />
          <KPICard
            label="Lucro Líquido"
            value={formatCurrency(consolidated.lucro_liquido)}
            accent={consolidated.lucro_liquido >= 0 ? 'positive' : 'negative'}
            sub={`A pagar: ${formatCurrency(consolidated.a_pagar)}`}
          />
          <KPICard
            label="Margem Líquida"
            value={margem !== null ? `${margem.toFixed(1)}%` : '—'}
            accent={margem !== null ? (margem >= 20 ? 'positive' : margem >= 0 ? 'neutral' : 'negative') : 'neutral'}
            sub={margem !== null ? (margem >= 20 ? 'Margem saudável' : margem >= 0 ? 'Margem baixa' : 'Resultado negativo') : 'Sem lançamentos'}
          />
          <KPICard
            label="Produtos"
            value={String(dashboards.length)}
            accent="neutral"
            sub={`${maxDashboards - dashboards.length} slot${maxDashboards - dashboards.length !== 1 ? 's' : ''} disponível`}
          />
        </div>
      )}

      {/* ── Linha de saúde rápida ────────────────────────────────────────────── */}
      {canSeeFinancial && dashboards.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 anim-slide-up delay-200">
          {/* A receber */}
          <div className="bg-[#0c0c0f] border border-emerald-500/15 rounded-xl p-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono">A Receber</p>
              <p className="text-sm font-bold text-emerald-400 num truncate">{formatCurrency(consolidated.a_receber)}</p>
            </div>
          </div>
          {/* A pagar */}
          <div className="bg-[#0c0c0f] border border-red-500/15 rounded-xl p-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
                <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono">A Pagar</p>
              <p className="text-sm font-bold text-red-400 num truncate">{formatCurrency(consolidated.a_pagar)}</p>
            </div>
          </div>
          {/* Tarefas urgentes */}
          <div className={`bg-[#0c0c0f] border rounded-xl p-3.5 flex items-center gap-3 ${tasksUrgentes.length > 0 ? 'border-orange-500/20' : 'border-white/[0.06]'}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tasksUrgentes.length > 0 ? 'bg-orange-500/10' : 'bg-white/[0.03]'}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={tasksUrgentes.length > 0 ? '#f97316' : '#52525b'} strokeWidth="2">
                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono">Tarefas/7d</p>
              <p className={`text-sm font-bold num ${tasksUrgentes.length > 0 ? 'text-orange-400' : 'text-zinc-400'}`}>
                {totalTarefasVencendo} tarefa{totalTarefasVencendo !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          {/* Produtos com lucro positivo */}
          <div className="bg-[#0c0c0f] border border-white/[0.06] rounded-xl p-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2">
                <rect x="2" y="3" width="6" height="4" rx="1"/><rect x="9" y="3" width="6" height="4" rx="1"/>
                <rect x="16" y="3" width="6" height="4" rx="1"/><rect x="2" y="10" width="6" height="4" rx="1"/>
                <rect x="9" y="10" width="6" height="7" rx="1"/><rect x="16" y="10" width="6" height="7" rx="1"/>
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono">Lucrativos</p>
              <p className="text-sm font-bold text-zinc-300 num">
                {dashboardsWithSummary.filter(d => d.summary.lucro_liquido > 0).length} / {dashboards.length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Gráfico + Sidebar de eventos ────────────────────────────────────── */}
      {canSeeFinancial && evolutionSeries.length > 1 ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 mb-8 anim-slide-up delay-300">
          {/* Gráfico de evolução */}
          <div className="bg-[#0c0c0f] border border-white/[0.07] rounded-2xl p-5 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
            <div className="flex items-center justify-between mb-4">
              <p className="kpi-label">EVOLUÇÃO MENSAL · RECEITA E LUCRO</p>
              <span className="text-[10px] text-zinc-600 font-mono">últimos 6 meses</span>
            </div>
            <EvolutionChart
              data={evolutionSeries.map(p => ({
                mes: p.month_label,
                receita: p.receita,
                lucro: p.lucro,
              }))}
              xKey="mes"
              bars={[{ dataKey: 'receita', label: 'Receita', color: '#22c55e', fillOpacity: 0.45 }]}
              lines={[{ dataKey: 'lucro', label: 'Lucro', color: '#f97316', strokeWidth: 2 }]}
              height={200}
              footnote="Barra: receita · Linha: lucro líquido"
            />
          </div>

          {/* Painel lateral: próximos 7 dias */}
          <div className="bg-[#0c0c0f] border border-white/[0.07] rounded-2xl overflow-hidden flex flex-col">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent pointer-events-none" />
            <div className="px-4 py-3.5 border-b border-white/[0.05] flex items-center gap-2 shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Próximos 7 dias</p>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
              {upcomingTasks.map(task => (
                <div key={task.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors group">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                    task.priority === 'alta' ? 'bg-orange-400' :
                    task.priority === 'media' ? 'bg-amber-400' : 'bg-zinc-600'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-300 font-medium truncate group-hover:text-white transition-colors">{task.title}</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">vence {labelDate(task.due_date)}</p>
                  </div>
                </div>
              ))}
              {canSeeFinancial && upcomingFinanceEntries.map(entry => (
                <div key={entry.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${entry.status === 'a_receber' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${entry.status === 'a_receber' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {entry.status === 'a_receber' ? '+' : '-'}{formatCurrency(Number(entry.amount))}
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">{entry.category} · {labelDate(entry.entry_date)}</p>
                  </div>
                </div>
              ))}
              {upcomingTasks.length === 0 && upcomingFinanceEntries.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3f3f46" strokeWidth="1.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <p className="text-xs text-zinc-700">Agenda limpa 🎉</p>
                </div>
              )}
            </div>
            {/* Ações pendentes embaixo */}
            {pendingActions.length > 0 && (
              <div className="border-t border-white/[0.05] shrink-0">
                <PendingActions actions={pendingActions} />
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Sem gráfico: só painel de eventos se houver */
        (pendingActions.length > 0 || hasUpcoming) && (
          <div className="mb-8 anim-slide-up delay-300">
            <PendingActions actions={pendingActions} />
          </div>
        )
      )}

      {/* ── Produtos ─────────────────────────────────────────────────────────── */}
      <div className="mb-8 anim-slide-up delay-400">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-gradient-to-b from-orange-400 to-orange-600 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Produtos</h2>
              <p className="text-[10px] text-zinc-600 mt-0.5 font-mono">
                {dashboards.length} / {maxDashboards} dashboards
              </p>
            </div>
          </div>
          {ctx.permissions.pode_criar_dashboard && (
            <CreateDashboardButton maxReached={maxReached} maxDashboards={maxDashboards} />
          )}
        </div>

        {dashboards.length === 0 ? (
          <EmptyState
            title="Nenhum produto cadastrado"
            description={
              ctx.permissions.pode_criar_dashboard
                ? 'Crie seu primeiro dashboard para começar a monitorar vendas, tráfego e resultado financeiro.'
                : 'O Dono da operação ainda não criou nenhum dashboard. Aguarde ou solicite acesso.'
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {dashboardsWithSummary.map(d => (
              <DashboardCard
                key={d.id}
                dashboard={d}
                summary={d.summary}
                canSeeFinancial={canSeeFinancial}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Feed de Atividade ────────────────────────────────────────────────── */}
      <div className="anim-slide-up delay-500">
        <ActivityFeed events={feedEvents.slice(0, 20)} />
      </div>
    </div>
  );
}
