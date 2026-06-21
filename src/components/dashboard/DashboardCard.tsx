import Link from 'next/link';
import { formatCurrency } from '@/lib/utils/format';
import { MetricBlock } from '@/components/ui';

interface Props {
  dashboard: { id: string; name: string };
  summary: { faturamento: number; lucro_liquido: number; roas: number | null };
  canSeeFinancial: boolean;
}

export function DashboardCard({ dashboard, summary, canSeeFinancial }: Props) {
  const roasOk      = summary.roas !== null && summary.roas >= 3;
  const roasDisplay = summary.roas !== null ? summary.roas.toFixed(2) + 'x' : '—';
  const lucroOk     = summary.lucro_liquido >= 0;

  return (
    <Link
      href={`/app/d/${dashboard.id}`}
      className="group relative border border-white/[0.07] hover:border-orange-500/40 rounded-2xl p-5 transition-all duration-300 hover:shadow-[0_0_50px_-10px_rgba(249,115,22,0.25)] hover:-translate-y-1.5 hover:scale-[1.015] cursor-pointer block overflow-hidden shimmer-sweep"
      style={{ background: 'linear-gradient(135deg, #121217 0%, #0f0f13 100%)' }}
    >
      {/* Borda laranja no topo ao hover */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-orange-500/0 via-orange-500/0 group-hover:via-orange-500/70 to-orange-500/0 transition-all duration-500" />
      {/* Glow de fundo ao hover */}
      <div className="absolute top-0 left-0 right-0 h-20 bg-orange-500/0 group-hover:bg-orange-500/[0.04] blur-2xl transition-all duration-500 pointer-events-none" />

      <div className="flex items-start justify-between mb-5 relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/20 flex items-center justify-center shrink-0 group-hover:from-orange-500/35 group-hover:to-orange-600/20 group-hover:border-orange-500/40 group-hover:shadow-[0_0_16px_-2px_rgba(249,115,22,0.4)] transition-all duration-300">
            <span className="text-orange-400 font-black text-base">{dashboard.name[0]?.toUpperCase()}</span>
          </div>
          <div>
            <h3 className="font-bold text-zinc-200 group-hover:text-white transition-colors leading-tight text-[15px]">
              {dashboard.name}
            </h3>
            <p className="text-[10px] text-zinc-600 font-mono mt-0.5">dashboard</p>
          </div>
        </div>
        <div className="w-7 h-7 rounded-lg bg-white/[0.03] border border-white/[0.05] group-hover:bg-orange-500/10 group-hover:border-orange-500/20 flex items-center justify-center transition-all duration-200 shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            className="text-zinc-700 group-hover:text-orange-400 transition-colors group-hover:translate-x-0.5 transition-transform">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>

      {canSeeFinancial ? (
        <div className="grid grid-cols-3 gap-2 relative">
          <MetricBlock label="Faturamento" value={formatCurrency(summary.faturamento)} />
          <MetricBlock label="Lucro" value={formatCurrency(summary.lucro_liquido)}
            valueClass={lucroOk ? 'text-emerald-400' : 'text-red-400'} />
          <MetricBlock label="ROAS" value={roasDisplay}
            valueClass={summary.roas === null ? 'text-zinc-600' : roasOk ? 'text-emerald-400' : 'text-red-400'} />
        </div>
      ) : (
        <div className="flex items-center gap-2 py-3 px-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-600 shrink-0">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <p className="text-xs text-zinc-600">Dados financeiros restritos</p>
        </div>
      )}

      <div className="mt-4 pt-3.5 border-t border-white/[0.05] group-hover:border-orange-500/15 flex items-center justify-between transition-colors duration-300 relative">
        <span className="text-[10px] text-zinc-600 tracking-widest uppercase font-mono">Mês atual</span>
        <span className="text-[10px] text-zinc-600 group-hover:text-orange-400 transition-all duration-200 font-mono">Abrir →</span>
      </div>
    </Link>
  );
}

