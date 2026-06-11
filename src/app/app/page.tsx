import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/auth/getPermissions';
import { createClient } from '@/lib/supabase/server';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { CreateDashboardButton } from '@/components/dashboard/CreateDashboardButton';
import { formatCurrency } from '@/lib/utils/format';
import {
  calcDre,
  calcAccountSummary,
  calcRoas,
  filterByDashboard,
  monthStart,
  monthEnd,
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

export default async function AppPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/');

  const canSeeFinancial = ctx.permissions.pode_ver_financeiro;

  // Modo demo: dados fixos com mock financeiro
  if (process.env.NEXT_PUBLIC_DEMO === 'true') {
    const { DEMO_DASHBOARDS } = await import('@/lib/demo');
    const { getDashboardMetrics } = await import('@/lib/mock/metrics');
    const { calcDre: _calcDre, calcAccountSummary: _calcAccountSummary, calcRoas: _calcRoas } = await import('@/lib/finance/calc');

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
            <ConsolidatedKpi label="Faturamento" value={formatCurrency(consolidated.faturamento)} />
            <ConsolidatedKpi label="Lucro Líquido" value={formatCurrency(consolidated.lucro_liquido)} valueClass={consolidated.lucro_liquido >= 0 ? 'text-emerald-400' : 'text-red-400'} />
            <ConsolidatedKpi label="Produtos" value={String(DEMO_DASHBOARDS.length)} />
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

  // Busca dashboards — filtrado se usuário estiver restrito
  let query = supabase
    .from('dashboards')
    .select('id, name, primary_sale_provider')
    .eq('operation_id', ctx.profile.operation_id)
    .order('created_at');

  if (ctx.permissions.restrito_a_dashboard) {
    query = query.eq('id', ctx.permissions.restrito_a_dashboard);
  }

  const [dashboardsRes, operationRes, financeRes, salesRes, spendRes] = await Promise.all([
    query,
    supabase
      .from('operations')
      .select('max_dashboards')
      .eq('id', ctx.profile.operation_id)
      .single(),
    // Lançamentos do mês atual — só se pode_ver_financeiro (RLS também barra)
    canSeeFinancial
      ? supabase
          .from('finance_entries')
          .select('id, direction, category, amount, entry_date, status, dashboard_id')
          .eq('operation_id', ctx.profile.operation_id)
          .gte('entry_date', monthStart())
          .lte('entry_date', monthEnd())
      : Promise.resolve({ data: null, error: null }),
    // Vendas reais do mês — só se pode_ver_financeiro
    canSeeFinancial
      ? fetchOperationSales(supabase, ctx.profile.operation_id, monthStart(), monthEnd())
      : Promise.resolve([] as RawSale[]),
    // Gasto de tráfego do mês — só se pode_ver_financeiro
    canSeeFinancial
      ? fetchOperationSpend(supabase, ctx.profile.operation_id, monthStart(), monthEnd())
      : Promise.resolve([] as RawSpend[]),
  ]);

  const dashboards = (dashboardsRes.data ?? []) as { id: string; name: string; primary_sale_provider: string | null }[];
  const maxDashboards = operationRes.data?.max_dashboards ?? 5;
  const maxReached = dashboards.length >= maxDashboards;

  // Converte finance_entries para FinanceEntry tipado
  const allFinanceEntries: FinanceEntry[] = ((financeRes.data ?? []) as {
    id: string; direction: string; category: string; amount: number;
    entry_date: string; status: string; dashboard_id: string | null;
  }[]).map(e => ({
    id: e.id,
    direction: e.direction as 'entrada' | 'saida',
    category: e.category,
    amount: Number(e.amount),
    entry_date: e.entry_date,
    status: e.status as 'pago' | 'a_pagar' | 'a_receber',
    dashboard_id: e.dashboard_id,
  }));

  const allSales = salesRes as RawSale[];
  const allSpend = spendRes as RawSpend[];

  // Dashboards que têm sales neste período (para saber quais categorias excluir)
  const dashboardsWithSalesIds = new Set(allSales.map(s => s.dashboard_id).filter(Boolean) as string[]);
  // Dashboards que têm spend neste período
  const dashboardsWithSpendIds = new Set(allSpend.map(s => s.dashboard_id).filter(Boolean) as string[]);

  // Constrói entries para cada dashboard respeitando fontes primárias.
  // Sales substitui venda/taxa/reembolso; spend substitui trafego.
  const dashboardsWithSummary = dashboards.map(d => {
    const primaryProvider    = d.primary_sale_provider ?? null;
    const dashFinanceEntries = filterByDashboard(allFinanceEntries, d.id);

    let mergedEntries: FinanceEntry[] = dashFinanceEntries;

    if (dashboardsWithSalesIds.has(d.id)) {
      const dashSales    = allSales.filter(s =>
        s.dashboard_id === d.id && (!primaryProvider || s.provider === primaryProvider)
      );
      const salesEntries = salesToFinanceEntries(dashSales);
      const filtered     = dashFinanceEntries.filter(e =>
        e.dashboard_id !== d.id || !SALES_CATEGORIES.has(e.category)
      );
      mergedEntries = [...filtered, ...salesEntries];
    }

    if (dashboardsWithSpendIds.has(d.id)) {
      const dashSpend    = allSpend.filter(s => s.dashboard_id === d.id);
      const spendEntries = spendToFinanceEntries(dashSpend);
      const filtered     = mergedEntries.filter(e =>
        e.dashboard_id !== d.id || !SPEND_CATEGORIES.has(e.category)
      );
      mergedEntries = [...filtered, ...spendEntries];
    }

    const dre     = calcDre(mergedEntries);
    const summary = calcAccountSummary(mergedEntries);
    return {
      ...d,
      summary: {
        faturamento:   summary.faturamento,
        lucro_liquido: summary.lucro_liquido,  // THE number — mesmo do DRE
        roas:          calcRoas(dre),
      },
    };
  });

  // Consolidado: mesma lógica — deslocar categorias deslocadas por integration nos dashboards que as têm
  let consolidated: AccountSummary;
  if (canSeeFinancial) {
    const cleanedFinance = allFinanceEntries.filter(e => {
      if (e.dashboard_id === null) return true;
      if (SALES_CATEGORIES.has(e.category) && dashboardsWithSalesIds.has(e.dashboard_id)) return false;
      if (SPEND_CATEGORIES.has(e.category) && dashboardsWithSpendIds.has(e.dashboard_id)) return false;
      return true;
    });
    const allSalesEntries = salesToFinanceEntries(allSales.filter(s => {
      const dash    = dashboards.find(d => d.id === s.dashboard_id);
      const primary = dash?.primary_sale_provider ?? null;
      return !primary || s.provider === primary;
    }));
    const allSpendEntries = spendToFinanceEntries(allSpend);
    consolidated = calcAccountSummary([...cleanedFinance, ...allSalesEntries, ...allSpendEntries]);
  } else {
    consolidated = { faturamento: 0, lucro_liquido: 0, a_receber: 0, a_pagar: 0 };
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="mb-8 pb-6 border-b border-white/[0.05] relative">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-orange-500/20 via-orange-500/5 to-transparent" />
        <div className="flex items-center gap-3 mb-1">
          <div className="w-1 h-6 bg-orange-500 rounded-full shrink-0" />
          <h1 className="text-2xl font-bold text-white tracking-tight">Visão Geral</h1>
        </div>
        <p className="text-sm text-zinc-500 pl-4">
          {canSeeFinancial ? 'Consolidado do mês atual · dados reais' : 'Seus produtos'}
        </p>
      </div>

      {/* KPIs consolidados — só para quem pode ver financeiro */}
      {dashboards.length > 0 && canSeeFinancial && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <ConsolidatedKpi
            label="Faturamento"
            value={formatCurrency(consolidated.faturamento)}
            sub={`A receber: ${formatCurrency(consolidated.a_receber)}`}
          />
          <ConsolidatedKpi
            label="Lucro Líquido"
            value={formatCurrency(consolidated.lucro_liquido)}
            valueClass={consolidated.lucro_liquido >= 0 ? 'text-emerald-400' : 'text-red-400'}
            sub={`A pagar: ${formatCurrency(consolidated.a_pagar)}`}
          />
          <ConsolidatedKpi
            label="Produtos ativos"
            value={String(dashboards.length)}
            sub="Mês atual · lançamentos manuais"
          />
        </div>
      )}

      {/* Dashboards */}
      <div>
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
          <div className="border border-dashed border-white/[0.06] rounded-xl p-16 text-center bg-white/[0.01]">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-500">
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <p className="text-zinc-300 font-semibold mb-1.5">Nenhum produto criado</p>
            {ctx.permissions.pode_criar_dashboard ? (
              <p className="text-zinc-600 text-sm">
                Clique em <strong className="text-zinc-400">Novo Dashboard</strong> para começar.
              </p>
            ) : (
              <p className="text-zinc-600 text-sm">Aguarde o dono criar um dashboard para você.</p>
            )}
          </div>
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
    </div>
  );
}

function ConsolidatedKpi({
  label,
  value,
  valueClass = 'text-white',
  sub,
}: {
  label: string;
  value: string;
  valueClass?: string;
  sub?: string;
}) {
  return (
    <div className="relative bg-[#161616] border border-white/[0.06] rounded-xl p-5 overflow-hidden shadow-card">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/6 to-transparent" />
      <p className="text-[10px] text-zinc-500 uppercase tracking-[0.1em] font-semibold mb-3">{label}</p>
      <p className={`text-[1.7rem] font-bold tabular-nums leading-none ${valueClass}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-600 mt-2 tabular-nums">{sub}</p>}
    </div>
  );
}
