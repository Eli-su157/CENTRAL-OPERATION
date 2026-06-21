export type KPIAccent = 'brand' | 'positive' | 'negative' | 'neutral';
export type KPIBadge = 'real' | 'demo' | 'sem dados' | string;

const topBarClass: Record<KPIAccent, string> = {
  brand:    'bg-gradient-to-r from-transparent via-orange-500/40 to-transparent',
  positive: 'bg-gradient-to-r from-transparent via-emerald-500/35 to-transparent',
  negative: 'bg-gradient-to-r from-transparent via-red-500/35 to-transparent',
  neutral:  'bg-gradient-to-r from-transparent via-white/[0.06] to-transparent',
};

const glowClass: Record<KPIAccent, string> = {
  brand:    'shadow-[0_0_30px_-10px_rgba(249,115,22,0.12)]',
  positive: 'shadow-[0_0_30px_-10px_rgba(52,211,153,0.10)]',
  negative: 'shadow-[0_0_30px_-10px_rgba(248,113,113,0.10)]',
  neutral:  '',
};

const valueClass: Record<KPIAccent, string> = {
  brand:    'text-white',
  positive: 'text-emerald-300',
  negative: 'text-red-300',
  neutral:  'text-zinc-500',
};

const badgeClass: Record<string, string> = {
  real:        'badge-positive',
  demo:        'badge-neutral',
  'sem dados': 'badge-neutral',
};

interface Props {
  label: string;
  value: string;
  accent?: KPIAccent;
  badge?: KPIBadge;
  sub?: string;
  subClass?: string;
  valueColorClass?: string;
}

export function KPICard({
  label, value, accent = 'brand', badge, sub, subClass, valueColorClass,
}: Props) {
  const barClass = topBarClass[accent];
  const valClass = valueColorClass ?? (value === '—' ? 'text-zinc-700' : valueClass[accent]);
  const shadowClass = glowClass[accent];

  return (
    <div className={`relative bg-[#0f0f12] border border-white/[0.06] rounded-xl p-5 overflow-hidden transition-all duration-300 hover:border-white/[0.12] group shimmer-sweep ${shadowClass} hover:scale-[1.015] hover:-translate-y-0.5`}>
      {/* acento top */}
      <div className={`absolute top-0 left-0 right-0 h-px ${barClass} transition-opacity duration-300 group-hover:opacity-150`} />

      {/* glow de fundo por acento */}
      {accent === 'brand' && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-12 bg-orange-500/[0.04] group-hover:bg-orange-500/[0.08] blur-2xl pointer-events-none rounded-full transition-all duration-500" />
      )}
      {accent === 'positive' && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-12 bg-emerald-500/[0.03] group-hover:bg-emerald-500/[0.07] blur-2xl pointer-events-none rounded-full transition-all duration-500" />
      )}

      <div className="flex items-start justify-between mb-4">
        <p className="kpi-label">{label}</p>
        {badge && (
          <span className={badgeClass[badge] ?? 'badge-neutral'}>{badge}</span>
        )}
      </div>

      <p className={`text-2xl sm:text-[1.7rem] font-bold num leading-none transition-all duration-200 group-hover:tracking-tight ${valClass}`}>
        {value}
      </p>

      {sub && (
        <p className={`text-[11px] mt-3 font-medium tabular-nums font-mono ${subClass ?? 'text-zinc-600'}`}>
          {sub}
        </p>
      )}
    </div>
  );
}
