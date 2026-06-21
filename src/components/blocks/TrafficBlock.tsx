import Link from 'next/link';
import { formatCurrency, formatDelta, deltaColor } from '@/lib/utils/format';
import { EmptyState } from '@/components/ui';

interface RealTrafficData {
  dashboardId: string;
  gasto_dia: number;
  roas_confirmado: number;
  roas_projetado: number;
  cpa: number;
  roi: number;
}

interface Props {
  dashboardId: string;
  real?: RealTrafficData | null;
}

export function TrafficBlock({ dashboardId, real }: Props) {
  return (
    <div className="relative bg-[#0c0c0f] border border-white/[0.07] rounded-2xl p-5 overflow-hidden shimmer-sweep transition-all duration-300 hover:border-blue-500/20 hover:shadow-[0_0_30px_-10px_rgba(59,130,246,0.10)]">
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${
        real
          ? 'bg-gradient-to-r from-transparent via-blue-500/40 to-transparent'
          : 'bg-gradient-to-r from-transparent via-white/[0.06] to-transparent'
      }`} />

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <span className={`rounded-lg p-1.5 transition-colors ${real ? 'text-blue-400 bg-blue-500/10' : 'text-zinc-500 bg-white/[0.04]'}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </span>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-[0.12em] font-mono">Tráfego</p>
        </div>
        {real && (
          <Link href={`/app/d/${real.dashboardId}/trafego`}
            className="text-[11px] text-zinc-600 hover:text-orange-400 transition-colors font-mono font-medium">
            Painel completo →
          </Link>
        )}
      </div>

      {!real ? (
        <EmptyState
          title="Conecte sua fonte de tráfego"
          description="Nenhuma integração de ads ativa para este produto."
          action={{ label: 'Ir para Integrações', href: `/app/d/${dashboardId}/dev#configurar-integracoes` }}
          iconVariant="neutral"
          className="py-4"
        />
      ) : (
        <>
          <div className="mb-5 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.04]">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide font-medium mb-2">ROAS</p>
            <div className="flex items-baseline gap-2.5">
              <span className={`text-3xl sm:text-[2rem] font-bold tabular-nums leading-none ${
                real.roas_confirmado >= 3 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {real.roas_confirmado.toFixed(2)}x
              </span>
              <span className="text-sm text-zinc-500 tabular-nums" title="ROAS projetado">
                ~{real.roas_projetado.toFixed(2)}x
              </span>
            </div>
            <p className="text-[10px] text-zinc-600 mt-1 tracking-wide">confirmado · projetado</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatCell label="Gasto do dia" value={formatCurrency(real.gasto_dia)} />
            <StatCell label="CPA" value={formatCurrency(real.cpa)} />
            <StatCell label="ROI" value={formatDelta(real.roi)} valueClass={deltaColor(real.roi)} />
          </div>
        </>
      )}
    </div>
  );
}

function StatCell({ label, value, valueClass = 'text-white' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-white/[0.02] rounded-lg p-2.5">
      <p className="text-[10px] text-zinc-500 uppercase tracking-wide font-medium mb-1">{label}</p>
      <p className={`text-sm font-bold tabular-nums leading-tight ${valueClass}`}>{value}</p>
    </div>
  );
}
