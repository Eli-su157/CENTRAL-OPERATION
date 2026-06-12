import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/auth/getPermissions';
import { createClient } from '@/lib/supabase/server';
import { getTrafficData } from '@/lib/mock/traffic';
import { AlertsBar } from '@/components/blocks/AlertsBar';
import { MetasBlock } from '@/components/traffic/MetasBlock';
import { DecisaoTable } from '@/components/traffic/DecisaoTable';
import { FunilBlock } from '@/components/traffic/FunilBlock';
import { ReconciliacaoBlock } from '@/components/traffic/ReconciliacaoBlock';
import { SaudeContasBlock } from '@/components/traffic/SaudeContasBlock';
import { TemporalChartLazy } from '@/components/traffic/TemporalChartLazy';
import { PanelConfig } from '@/components/traffic/PanelConfig';
import { DEFAULT_ENABLED_BLOCKS, DEFAULT_BLOCK_ORDER } from '@/lib/traffic/panelDefaults';
import { getReconciliationData } from '@/lib/sales/attribution';
import { monthStart, monthEnd } from '@/lib/finance/calc';
import { fetchDashboardSpend } from '@/lib/traffic/spend';
import { buildRealTrafficData, formatFetchedAgo } from '@/lib/traffic/realData';
import { fetchActiveAlerts } from '@/lib/alerts/engine';
import type { DailyPoint } from '@/lib/mock/traffic';

interface Props {
  params: Promise<{ dashboardId: string }>;
}

// ── Async component para os blocos pesados (Round 3) ───────────────────────────
// Wrapped em <Suspense> na página principal para streaming real
interface BlocksProps {
  dashboardId: string;
  primaryProvider: string | null;
  period: string;
  roasAlvo: number;
  canSeeFinancial: boolean;
  enabledBlocks: Record<string, boolean>;
  blockOrder: string[];
}

async function TrafficBlocksContent({
  dashboardId, primaryProvider, period, roasAlvo, canSeeFinancial, enabledBlocks, blockOrder,
}: BlocksProps) {
  const supabase = await createClient();

  const [spendRows, salesWithUtmRes, reconciliation, realAlerts] = await Promise.all([
    fetchDashboardSpend(supabase, dashboardId, monthStart(), monthEnd()),
    (supabase as any)
      .from('sales')
      .select('amount, status, occurred_at, utm')
      .eq('dashboard_id', dashboardId)
      .gte('occurred_at', monthStart())
      .lte('occurred_at', `${monthEnd()}T23:59:59.999Z`)
      .then((r: { data: unknown[] | null }) => (r.data ?? [])),
    getReconciliationData(supabase, dashboardId, primaryProvider, monthStart(), monthEnd()),
    fetchActiveAlerts(supabase, dashboardId, canSeeFinancial),
  ]);

  const now = new Date();
  const diaAtual = now.getDate();
  const diasNoMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const realTrafficData = buildRealTrafficData({
    dashboardId, primaryProvider, period,
    roasAlvo,
    spend: spendRows,
    sales: (salesWithUtmRes as { amount: number; status: string; occurred_at: string; utm: Record<string, string | null> | null }[]),
  });

  const traffic = realTrafficData ?? getTrafficData(dashboardId, period);
  const isReal = !!realTrafficData;
  const fetchedAgo = isReal ? formatFetchedAgo(realTrafficData.fetched_at) : '';

  const reconciliationSource =
    reconciliation.has_data
      ? reconciliation.attributed_count > 0 ? 'real' : 'pending'
      : 'mock';

  const reconciliationProps =
    reconciliationSource === 'mock'
      ? { tracker_faturamento: traffic.tracker_faturamento, plataforma_faturamento: traffic.plataforma_faturamento, source: 'mock' as const }
      : { tracker_faturamento: reconciliation.tracker_faturamento, plataforma_faturamento: reconciliation.plataforma_faturamento, attributed_count: reconciliation.attributed_count, total_count: reconciliation.total_count, source: reconciliationSource as 'real' | 'pending' };

  const actual = isReal
    ? {
        gasto_dia:       spendRows.reduce((s, r) => s + Number(r.spend), 0) / Math.max(diaAtual, 1),
        faturamento_dia: reconciliation.plataforma_faturamento / Math.max(diaAtual, 1),
        roas_confirmado: traffic.roas_confirmado,
        roas_projetado:  traffic.roas_projetado,
      }
    : {
        gasto_dia:       traffic.gasto_dia,
        faturamento_dia: traffic.faturamento_dia,
        roas_confirmado: traffic.roas_confirmado,
        roas_projetado:  traffic.roas_projetado,
      };

  const goals = { meta_gasto: null as number | null, meta_faturamento: null as number | null, roas_alvo: roasAlvo };

  function showBlock(id: string) { return enabledBlocks[id] !== false; }

  return (
    <>
      {showBlock('alertas') && (
        <AlertsBar alerts={realAlerts.length > 0 ? realAlerts : traffic.alertas} />
      )}

      <div className="flex flex-col gap-4">
        {(Array.isArray(blockOrder) ? blockOrder : DEFAULT_BLOCK_ORDER).filter(showBlock).map(blockId => {
          switch (blockId) {
            case 'metas':
              return (
                <MetasBlock
                  key="metas"
                  dashboardId={dashboardId}
                  period={period}
                  goals={goals}
                  actual={actual}
                  diasNoMes={diasNoMes}
                  diaAtual={diaAtual}
                />
              );
            case 'decisao':
              return <DecisaoTable key="decisao" campaigns={traffic.campaigns} roasAlvo={roasAlvo} />;
            case 'funil':
              return <FunilBlock key="funil" funil={traffic.funil} />;
            case 'reconciliacao':
              return <ReconciliacaoBlock key="reconciliacao" {...reconciliationProps} />;
            case 'saude':
              return <SaudeContasBlock key="saude" accounts={traffic.accounts} />;
            case 'temporal':
              return <TemporalChartLazy key="temporal" series={traffic.series as DailyPoint[]} />;
            default:
              return null;
          }
        })}
      </div>

      {/* Badge de dados reais / demo abaixo dos blocos */}
      <p className="text-xs text-zinc-700 mt-3 text-right">
        {isReal
          ? `Dados reais${fetchedAgo ? ` · ${fetchedAgo}` : ''}`
          : 'Modo demo · Connect Meta Ads/Google Ads para dados reais'}
      </p>
    </>
  );
}

// ── Skeleton para o Suspense ───────────────────────────────────────────────────
function TrafficBlocksSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      {[180, 120, 260, 100, 100].map((h, i) => (
        <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl" style={{ height: h }} />
      ))}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default async function TrafegoPanelPage({ params }: Props) {
  const { dashboardId } = await params;

  const ctx = await getAuthContext();
  if (!ctx) redirect('/');

  const canAccess =
    ctx.profile.sector === 'trafego' ||
    ctx.profile.role === 'dono' ||
    ctx.profile.role === 'head';

  if (!canAccess) redirect(`/app/d/${dashboardId}`);

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Round 2 — dados de configuração rápidos (3 queries paralelas)
  const [dashboardRes, goalsRes, configRes] = await Promise.all([
    db
      .from('dashboards')
      .select('id, name, primary_sale_provider')
      .eq('id', dashboardId)
      .eq('operation_id', ctx.profile.operation_id)
      .single(),
    db
      .from('traffic_goals')
      .select('*')
      .eq('dashboard_id', dashboardId)
      .eq('period', period)
      .eq('operation_id', ctx.profile.operation_id)
      .maybeSingle(),
    db
      .from('traffic_panel_config')
      .select('*')
      .eq('dashboard_id', dashboardId)
      .eq('operation_id', ctx.profile.operation_id)
      .maybeSingle(),
  ]);

  if (!dashboardRes.data) redirect('/app');

  const dashboardRow = dashboardRes.data as { id: string; name: string; primary_sale_provider: string | null };
  const primaryProvider = dashboardRow.primary_sale_provider ?? null;

  const roasAlvo = goalsRes.data?.roas_alvo ? Number(goalsRes.data.roas_alvo) : 3.0;

  const enabledBlocks: Record<string, boolean> =
    (configRes.data?.enabled_blocks && typeof configRes.data.enabled_blocks === 'object' && !Array.isArray(configRes.data.enabled_blocks))
      ? (configRes.data.enabled_blocks as Record<string, boolean>)
      : DEFAULT_ENABLED_BLOCKS;
  const blockOrder: string[] =
    Array.isArray(configRes.data?.block_order)
      ? (configRes.data.block_order as string[])
      : DEFAULT_BLOCK_ORDER;

  const canSeeFinancial = ctx.permissions.pode_ver_financeiro;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Header — renderiza imediatamente com dados do Round 2 */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href={`/app/d/${dashboardId}`} className="text-zinc-500 hover:text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{dashboardRow.name}</h1>
              <span className="text-xs bg-orange-950 text-orange-400 border border-orange-800 px-2 py-0.5 rounded-full font-medium">
                Tráfego
              </span>
            </div>
            <p className="text-sm text-zinc-500">{period}</p>
          </div>
        </div>
        <PanelConfig
          dashboardId={dashboardId}
          enabled={enabledBlocks}
          order={blockOrder}
        />
      </div>

      {/* Round 3 — blocos pesados com streaming via Suspense */}
      <Suspense fallback={<TrafficBlocksSkeleton />}>
        <TrafficBlocksContent
          dashboardId={dashboardId}
          primaryProvider={primaryProvider}
          period={period}
          roasAlvo={roasAlvo}
          canSeeFinancial={canSeeFinancial}
          enabledBlocks={enabledBlocks}
          blockOrder={blockOrder}
        />
      </Suspense>
    </div>
  );
}
