import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/auth/getPermissions';
import { createClient } from '@/lib/supabase/server';
import { getDashboardMetrics } from '@/lib/mock/metrics';
import { SummaryStrip } from '@/components/blocks/SummaryStrip';
import { AlertsBar } from '@/components/blocks/AlertsBar';
import { DashboardGrid } from '@/components/dashboard/DashboardGrid';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import type { UserRole, UserSector } from '@/lib/types/database';
import type { RealTeamData } from '@/lib/types/tasks';
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
  fetchDashboardSales,
  computeSalesMetrics,
  salesToFinanceEntries,
  mergeEntriesWithSales,
  type SalesMetrics,
} from '@/lib/sales/metrics';
import { fetchActiveAlerts, type AlertBarItem } from '@/lib/alerts/engine';
import {
  fetchDashboardSpend,
  spendToFinanceEntries,
  mergeEntriesWithSpend,
  computeTrafficSummary,
  type RealTrafficSummary,
} from '@/lib/traffic/spend';

interface Props {
  params: Promise<{ dashboardId: string }>;
}

export default async function DashboardPage({ params }: Props) {
  const { dashboardId } = await params;

  const ctx = await getAuthContext();
  if (!ctx) redirect('/');

  if (
    ctx.permissions.restrito_a_dashboard &&
    ctx.permissions.restrito_a_dashboard !== dashboardId
  ) {
    redirect(`/app/d/${ctx.permissions.restrito_a_dashboard}`);
  }

  // Modo demo: usa dados fixos sem Supabase
  if (process.env.NEXT_PUBLIC_DEMO === 'true') {
    const { DEMO_DASHBOARDS } = await import('@/lib/demo');
    const demoDash = DEMO_DASHBOARDS.find(d => d.id === dashboardId) ?? DEMO_DASHBOARDS[0];
    const metrics = getDashboardMetrics(dashboardId);
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <DashboardHeader dashboard={demoDash} canManage={true} />
        <SummaryStrip
          faturamento_dia={metrics.summary.faturamento_dia}
          lucro_liquido={metrics.summary.lucro_liquido}
          roas={metrics.summary.roas}
          delta_faturamento={metrics.summary.delta_faturamento}
          delta_lucro={metrics.summary.delta_lucro}
          delta_roas={metrics.summary.delta_roas}
          real={null}
        />
        <DashboardGrid
          metrics={metrics}
          profile={{ role: 'dono', sector: null }}
          permissions={ctx.permissions}
          dashboardId={dashboardId}
          realTeamData={null}
          realFinance={null}
          realSales={null}
        />
      </div>
    );
  }

  const supabase = await createClient();

  const [dashboardRes, overdueRes, pendingRes, membersCountRes, financeRes] = await Promise.all([
    supabase
      .from('dashboards')
      .select('*')
      .eq('id', dashboardId)
      .eq('operation_id', ctx.profile.operation_id)
      .single(),
    supabase
      .from('tasks')
      .select('sector')
      .eq('operation_id', ctx.profile.operation_id)
      .neq('status', 'concluida')
      .lt('due_date', new Date().toISOString().split('T')[0]),
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('operation_id', ctx.profile.operation_id)
      .neq('status', 'concluida'),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('operation_id', ctx.profile.operation_id),
    ctx.permissions.pode_ver_financeiro
      ? supabase
          .from('finance_entries')
          .select('id, direction, category, amount, entry_date, status, dashboard_id')
          .eq('operation_id', ctx.profile.operation_id)
          .gte('entry_date', monthStart())
          .lte('entry_date', monthEnd())
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (!dashboardRes.data) redirect('/app');

  const dashboardRow = dashboardRes.data as {
    id: string; name: string; primary_sale_provider: string | null;
  };
  const primaryProvider = dashboardRow.primary_sale_provider ?? null;

  // TeamBlock — dados reais
  const bySector: Record<string, number> = {};
  for (const t of (overdueRes.data ?? []) as { sector: string | null }[]) {
    if (t.sector) bySector[t.sector] = (bySector[t.sector] ?? 0) + 1;
  }
  const realTeamData: RealTeamData = {
    tarefas_atrasadas: Object.entries(bySector).map(([setor, quantidade]) => ({ setor, quantidade })),
    tarefas_pendentes_total: pendingRes.count ?? 0,
    membros_ativos: membersCountRes.count ?? 0,
  };

  // ---------------------------------------------------------------
  // FINANCEIRO + VENDAS — fonte única da verdade via calc.ts
  // ---------------------------------------------------------------
  let realFinance: AccountSummary | null = null;
  let realRoas: number | null = null;
  let realSales: SalesMetrics | null = null;
  let realTraffic: RealTrafficSummary | null = null;
  let realAlerts: AlertBarItem[] = [];

  if (ctx.permissions.pode_ver_financeiro) {
    const today = new Date().toISOString().split('T')[0];

    // 1. Finance entries manuais do mês
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

    // 2. Vendas + gasto em paralelo
    const [{ sales: rawSales, noPrimaryWarning }, rawSpend] = await Promise.all([
      fetchDashboardSales(supabase, dashboardId, primaryProvider, monthStart(), monthEnd()),
      fetchDashboardSpend(supabase, dashboardId, monthStart(), monthEnd()),
    ]);

    // 3. Converter sales/spend → FinanceEntry e mesclar
    //    — sales substitui venda/taxa/reembolso; spend substitui trafego
    const dashFinanceEntries = filterByDashboard(allFinanceEntries, dashboardId);
    const salesEntries  = salesToFinanceEntries(rawSales);
    const spendEntries  = spendToFinanceEntries(rawSpend);
    const afterSales    = mergeEntriesWithSales(dashFinanceEntries, salesEntries, dashboardId);
    const mergedEntries = mergeEntriesWithSpend(afterSales, spendEntries, dashboardId);

    // 4. DRE e resumo via calc.ts — THE source of truth
    const dre   = calcDre(mergedEntries);
    realFinance = calcAccountSummary(mergedEntries);
    realRoas    = calcRoas(dre);

    // 5. Métricas de vendas para o SalesBlock
    realSales = computeSalesMetrics(rawSales, noPrimaryWarning);

    // 6. Resumo de tráfego para o TrafficBlock (gasto de hoje + ROAS)
    realTraffic = computeTrafficSummary(rawSpend, rawSales, today);

    // 7. Alertas reais do banco (visibilidade filtrada por permissão)
    realAlerts = await fetchActiveAlerts(supabase, dashboardId, ctx.permissions.pode_ver_financeiro);
  }

  // Mock: fallback visual quando não há dados reais (mantido para campos de tráfego/equipe)
  const metrics = getDashboardMetrics(dashboardId);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <DashboardHeader
        dashboard={dashboardRow}
        canManage={ctx.permissions.pode_criar_dashboard}
      />

      {/* Alertas reais do banco; fallback para mock quando sem dados (demo mode) */}
      <AlertsBar alerts={realAlerts.length > 0 ? realAlerts : metrics.alerts} />

      {/* SummaryStrip: real (de sales+calc.ts) substitui mock quando há dados */}
      <SummaryStrip
        faturamento_dia={metrics.summary.faturamento_dia}
        lucro_liquido={metrics.summary.lucro_liquido}
        roas={metrics.summary.roas}
        delta_faturamento={metrics.summary.delta_faturamento}
        delta_lucro={metrics.summary.delta_lucro}
        delta_roas={metrics.summary.delta_roas}
        real={realFinance ? {
          faturamento: realFinance.faturamento,
          lucro_liquido: realFinance.lucro_liquido, // THE number — mesmo do DRE e do card
          roas: realRoas,
        } : null}
      />

      <DashboardGrid
        metrics={metrics}
        profile={{
          role: ctx.profile.role as UserRole,
          sector: ctx.profile.sector as UserSector | null,
        }}
        permissions={ctx.permissions}
        dashboardId={dashboardId}
        realTeamData={realTeamData}
        realFinance={realFinance}
        realSales={realSales}
        realTraffic={realTraffic}
      />
    </div>
  );
}
