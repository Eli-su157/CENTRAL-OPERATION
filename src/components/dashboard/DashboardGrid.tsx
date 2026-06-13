import { BLOCK_REGISTRY, canSeeBlock } from '@/lib/blocks/registry';
import { SalesBlock } from '@/components/blocks/SalesBlock';
import { TrafficBlock } from '@/components/blocks/TrafficBlock';
import { TeamBlock } from '@/components/blocks/TeamBlock';
import { FinancialBlock } from '@/components/blocks/FinancialBlock';
import { EditorBlock } from '@/components/blocks/EditorBlock';
import { DevBlock } from '@/components/blocks/DevBlock';
import type { Permissions } from '@/lib/auth/permissions';
import type { UserRole, UserSector } from '@/lib/types/database';
import type { RealTeamData } from '@/lib/types/tasks';
import type { AccountSummary } from '@/lib/finance/calc';
import type { SalesMetrics } from '@/lib/sales/metrics';
import type { RealTrafficSummary } from '@/lib/traffic/spend';
import { EmptyState } from '@/components/ui';

interface Props {
  profile: { role: UserRole; sector: UserSector | null };
  permissions: Permissions;
  dashboardId: string;
  realTeamData?: RealTeamData | null;
  realFinance?: AccountSummary | null;
  realSales?: SalesMetrics | null;
  realTraffic?: RealTrafficSummary | null;
}

export function DashboardGrid({ profile, permissions, dashboardId, realTeamData, realFinance, realSales, realTraffic }: Props) {
  const visibleBlocks = BLOCK_REGISTRY.filter(meta =>
    canSeeBlock(meta, profile, permissions)
  );

  if (visibleBlocks.length === 0) {
    return (
      <div className="border border-dashed border-zinc-800 rounded-xl p-12 text-center mt-6">
        <p className="text-zinc-500 text-sm">Nenhum bloco disponível para o seu perfil.</p>
      </div>
    );
  }

  const trafficReal = realTraffic?.has_data ? realTraffic : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
      {visibleBlocks.map(meta => {
        if (meta.id === 'sales') {
          return <SalesBlock key="sales" dashboardId={dashboardId} realSales={realSales} />;
        }
        if (meta.id === 'team') {
          return <TeamBlock key="team" realTeam={realTeamData} />;
        }
        if (meta.id === 'financial') {
          return <FinancialBlock key="financial" realFinance={realFinance} />;
        }
        if (meta.id === 'traffic') {
          return (
            <TrafficBlock
              key="traffic"
              dashboardId={dashboardId}
              real={trafficReal ? { dashboardId, ...trafficReal } : null}
            />
          );
        }
        if (meta.id === 'edicao') {
          return <EditorBlock key="edicao" dashboardId={dashboardId} />;
        }
        if (meta.id === 'dev') {
          return <DevBlock key="dev" dashboardId={dashboardId} />;
        }
        return null;
      })}
    </div>
  );
}
