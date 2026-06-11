import Link from 'next/link';
import { formatCurrency } from '@/lib/utils/format';

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
      className="group relative bg-[#161616] border border-white/[0.06] hover:border-violet-500/20 rounded-xl p-5 transition-all duration-200 hover:shadow-card-hover hover:shadow-violet-500/5 cursor-pointer block overflow-hidden"
    >
      {/* Top shimmer on hover */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/0 group-hover:via-violet-500/30 to-transparent transition-all duration-300" />

      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/15 flex items-center justify-center shrink-0">
            <span className="text-violet-400 font-bold text-sm">{dashboard.name[0]?.toUpperCase()}</span>
          </div>
          <h3 className="font-semibold text-zinc-200 group-hover:text-white transition-colors leading-tight">
            {dashboard.name}
          </h3>
        </div>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className="text-zinc-700 group-hover:text-violet-400 transition-colors shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>

      {canSeeFinancial ? (
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          <StatCell label="Faturamento" value={formatCurrency(summary.faturamento)} />
          <StatCell
            label="Lucro"
            value={formatCurrency(summary.lucro_liquido)}
            valueClass={lucroOk ? 'text-emerald-400' : 'text-red-400'}
          />
          <StatCell
            label="ROAS"
            value={roasDisplay}
            valueClass={summary.roas === null ? 'text-zinc-600' : roasOk ? 'text-emerald-400' : 'text-red-400'}
          />
        </div>
      ) : (
        <div className="flex items-center gap-2 py-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-600">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <p className="text-xs text-zinc-600">Dados financeiros restritos</p>
        </div>
      )}

      <div className="mt-4 pt-3.5 border-t border-white/[0.04] flex items-center justify-between">
        <span className="text-[10px] text-zinc-600 tracking-wide">Mês atual</span>
        <span className="text-[10px] text-zinc-600 group-hover:text-violet-500 transition-colors">Abrir →</span>
      </div>
    </Link>
  );
}

function StatCell({ label, value, valueClass = 'text-white' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-white/[0.025] rounded-lg p-2.5">
      <p className="text-[10px] text-zinc-600 uppercase tracking-wide font-medium mb-1">{label}</p>
      <p className={`text-sm font-bold tabular-nums leading-tight ${valueClass}`}>{value}</p>
    </div>
  );
}
