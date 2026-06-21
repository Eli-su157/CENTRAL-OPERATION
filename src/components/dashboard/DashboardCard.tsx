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
  const margem      = summary.faturamento > 0
    ? (summary.lucro_liquido / summary.faturamento) * 100
    : null;

  const accentColor = !canSeeFinancial
    ? 'border-white/[0.07]'
    : lucroOk
    ? 'group-hover:border-emerald-500/30'
    : 'group-hover:border-red-500/30';

  return (
    <Link
      href={`/app/d/${dashboard.id}`}
      className={`group relative border border-white/[0.07] ${accentColor} rounded-2xl p-5 transition-all duration-300 hover:shadow-[0_0_50px_-10px_rgba(249,115,22,0.2)] hover:-translate-y-1.5 hover:scale-[1.015] cursor-pointer block overflow-hidden`}
      style={{ background: 'linear-gradient(135deg, #0d0d10 0%, #0a0a0d 100%)' }}
    >
      {/* Linha de topo: laranja/verde/vermelho por estado */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] transition-all duration-500 ${
        !canSeeFinancial
          ? 'bg-gradient-to-r from-transparent via-white/[0.08] to-transparent'
          : lucroOk
          ? 'bg-gradient-to-r from-transparent via-emerald-500/0 group-hover:via-emerald-500/50 to-transparent'
          : 'bg-gradient-to-r from-transparent via-red-500/0 group-hover:via-red-500/40 to-transparent'
      }`} />

      {/* Glow fundo ao hover */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-orange-500/0 group-hover:bg-orange-500/[0.03] blur-2xl transition-all duration-500 pointer-events-none" />

      {/* Header do card */}
      <div className="flex items-start justify-between mb-5 relative">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-all duration-300 ${
            canSeeFinancial && lucroOk
              ? 'bg-emerald-500/10 border-emerald-500/20 group-hover:shadow-[0_0_16px_-2px_rgba(52,211,153,0.3)]'
              : canSeeFinancial && !lucroOk
              ? 'bg-red-500/10 border-red-500/20'
              : 'bg-orange-500/10 border-orange-500/20 group-hover:shadow-[0_0_16px_-2px_rgba(249,115,22,0.3)]'
          }`}>
            <span className={`font-black text-base ${
              canSeeFinancial && lucroOk ? 'text-emerald-400' :
              canSeeFinancial && !lucroOk ? 'text-red-400' : 'text-orange-400'
            }`}>
              {dashboard.name[0]?.toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="font-bold text-zinc-200 group-hover:text-white transition-colors leading-tight text-[15px]">
              {dashboard.name}
            </h3>
            <p className="text-[10px] text-zinc-600 font-mono mt-0.5">dashboard · mês atual</p>
          </div>
        </div>
        <div className="w-7 h-7 rounded-lg bg-white/[0.03] border border-white/[0.05] group-hover:bg-orange-500/10 group-hover:border-orange-500/20 flex items-center justify-center transition-all duration-200 shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            className="text-zinc-700 group-hover:text-orange-400 transition-colors">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>

      {canSeeFinancial ? (
        <>
          {/* Métricas principais */}
          <div className="grid grid-cols-3 gap-2 relative mb-4">
            <div className="bg-white/[0.02] rounded-lg p-2.5 border border-white/[0.03]">
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono mb-1">Faturamento</p>
              <p className="text-xs font-bold text-zinc-300 num">{formatCurrency(summary.faturamento)}</p>
            </div>
            <div className={`bg-white/[0.02] rounded-lg p-2.5 border ${lucroOk ? 'border-emerald-500/10' : 'border-red-500/10'}`}>
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono mb-1">Lucro</p>
              <p className={`text-xs font-bold num ${lucroOk ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(summary.lucro_liquido)}
              </p>
            </div>
            <div className={`bg-white/[0.02] rounded-lg p-2.5 border ${summary.roas === null ? 'border-white/[0.03]' : roasOk ? 'border-emerald-500/10' : 'border-red-500/10'}`}>
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono mb-1">ROAS</p>
              <p className={`text-xs font-bold num ${summary.roas === null ? 'text-zinc-600' : roasOk ? 'text-emerald-400' : 'text-red-400'}`}>
                {roasDisplay}
              </p>
            </div>
          </div>

          {/* Barra de margem */}
          {margem !== null && (
            <div className="mb-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono">Margem líquida</span>
                <span className={`text-[10px] font-bold num ${margem >= 20 ? 'text-emerald-400' : margem >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                  {margem.toFixed(1)}%
                </span>
              </div>
              <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    margem >= 20 ? 'bg-emerald-500' : margem >= 0 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, margem))}%` }}
                />
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2 py-3 px-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-600 shrink-0">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <p className="text-xs text-zinc-600">Dados financeiros restritos</p>
        </div>
      )}

      <div className="mt-4 pt-3.5 border-t border-white/[0.05] group-hover:border-orange-500/10 flex items-center justify-between transition-colors duration-300 relative">
        <span className="text-[10px] text-zinc-700 font-mono">Abrir painel completo</span>
        <span className="text-[10px] text-zinc-600 group-hover:text-orange-400 transition-all duration-200 font-mono">→</span>
      </div>
    </Link>
  );
}
