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
          <p className="text-sm text-zinc-500 mt-1">Modo demo — dados simulados</p>
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

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="mb-8 pb-6 border-b border-white/[0.05] relative">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-orange-500/20 via-orange-500/5 to-transparent" />
        <div className="flex items-center gap-3 mb-1">
          <div className="w-1 h-6 bg-orange-500 rounded-full shrink-0" />
          <h1 className="text-2xl font-bold text-white tracking-tight">Visão Geral</h1>
        </div>
      </div>

      {/* Alertas ativos em destaque */}
      {activeAlerts.length > 0 && (
        <div className="mb-8">
          <AlertBannerList alerts={activeAlerts} />
        </div>
      )}

      {/* KPIs consolidados */}
      {dashboards.length > 0 && canSeeFinancial && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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
            label="Produtos ativos"
            value={String(dashboards.length)}
            sub="Mês atual · lançamentos manuais"
          />
        </div>
      )}

      {/* Gráfico de evolução dos últimos 6 meses */}
      {canSeeFinancial && evolutionSeries.length > 1 && (
        <div className="mb-8">
          <EvolutionChart
            title="EVOLUÇÃO — RECEITA E LUCRO"
            data={evolutionSeries.map(p => ({
              mes: p.month_label,
              receita: p.receita,
              lucro: p.lucro,
            }))}
            xKey="mes"
            bars={[
              { dataKey: 'receita', label: 'Receita', color: '#22c55e', fillOpacity: 0.5 },
            ]}
            lines={[
              { dataKey: 'lucro', label: 'Lucro', color: '#f97316', strokeWidth: 2 },
            ]}
            height={200}
            footnote="Últimos 6 meses · lançamentos manuais + integrações"
          />
        </div>
      )}

      {/* Ações pendentes + O que vem aí — lado a lado em telas maiores */}
      {(pendingActions.length > 0 || hasUpcoming) && (
        <div className={`grid gap-4 mb-8 ${pendingActions.length > 0 && hasUpcoming ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
          {/* Ações sugeridas — só dono/head */}
          {pendingActions.length > 0 && (
            <PendingActions actions={pendingActions} />
          )}

          {/* O que vem aí — próximos 7 dias */}
          {hasUpcoming && (
            <div className="relative bg-[#161616] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
              <div className="px-5 py-4 border-b border-white/[0.04]">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.1em]">
                  O que vem aí · próximos 7 dias
                </p>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {/* Tarefas com prazo */}
                {upcomingTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="text-sm shrink-0">✅</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-zinc-200 truncate">{task.title}</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">
                        Prazo: {labelDate(task.due_date)} · {PRIORITY_LABEL[task.priority] ?? task.priority}
                      </p>
                    </div>
                  </div>
                ))}
                {/* Financeiro a receber/pagar */}
                {canSeeFinancial && upcomingFinanceEntries.map(entry => (
                  <div key={entry.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="text-sm shrink-0">
                      {entry.status === 'a_receber' ? '💰' : '📤'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium ${entry.status === 'a_receber' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {entry.status === 'a_receber' ? 'A receber' : 'A pagar'}: {formatCurrency(Number(entry.amount))}
                      </p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">
                        {entry.category} · vence {labelDate(entry.entry_date)}
                      </p>
                    </div>
                  </div>
                ))}
                {upcomingTasks.length === 0 && (!canSeeFinancial || upcomingFinanceEntries.length === 0) && (
                  <div className="px-5 py-8 text-center">
                    <p className="text-xs text-zinc-600">Nenhum evento nos próximos 7 dias.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dashboards de produtos */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Produtos</h2>
            <p className="text-xs text-zinc-600 mt-0.5">
              {dashboards.length} / {maxDashboards} dashboards
            </p>
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

      {/* Feed de Atividade */}
      <ActivityFeed events={feedEvents.slice(0, 20)} />
    </div>
  );
}
