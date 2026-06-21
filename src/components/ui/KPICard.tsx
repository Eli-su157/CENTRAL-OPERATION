export type KPIAccent = 'brand' | 'positive' | 'negative' | 'neutral';
export type KPIBadge = 'real' | 'demo' | 'sem dados' | string;

const borderClass: Record<KPIAccent, string> = {
  brand:    'border-orange-500/30 hover:border-orange-500/60',
  positive: 'border-emerald-500/25 hover:border-emerald-500/50',
  negative: 'border-red-500/25 hover:border-red-500/50',
  neutral:  'border-white/[0.06] hover:border-white/[0.12]',
};

const glowClass: Record<KPIAccent, string> = {
  brand:    'shadow-[0_0_40px_-8px_rgba(249,115,22,0.25)] hover:shadow-[0_0_60px_-8px_rgba(249,115,22,0.45)]',
  positive: 'shadow-[0_0_40px_-8px_rgba(52,211,153,0.18)] hover:shadow-[0_0_60px_-8px_rgba(52,211,153,0.35)]',
  negative: 'shadow-[0_0_40px_-8px_rgba(248,113,113,0.18)] hover:shadow-[0_0_60px_-8px_rgba(248,113,113,0.35)]',
  neutral:  'shadow-none',
};

const topGradient: Record<KPIAccent, string> = {
  brand:    'from-orange-500/60 via-orange-500/20 to-transparent',
  positive: 'from-emerald-500/50 via-emerald-500/15 to-transparent',
  negative: 'from-red-500/50 via-red-500/15 to-transparent',
  neutral:  'from-white/10 via-white/5 to-transparent',
};

const bgGlow: Record<KPIAccent, string> = {
  brand:    'bg-orange-500/[0.07] group-hover:bg-orange-500/[0.14]',
  positive: 'bg-emerald-500/[0.06] group-hover:bg-emerald-500/[0.12]',
  negative: 'bg-red-500/[0.06] group-hover:bg-red-500/[0.12]',
  neutral:  'bg-transparent',
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
  const valClass = valueColorClass ?? (value === '—' ? 'text-zinc-700' : valueClass[accent]);

  return (
    <div className={`relative bg-[#0c0c0f] border rounded-2xl p-6 overflow-hidden transition-all duration-300 group shimmer-sweep hover:scale-[1.02] hover:-translate-y-1 ${borderClass[accent]} ${glowClass[accent]}`}>

      {/* Gradiente de acento no topo — mais espesso */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${topGradient[accent]}`} />

      {/* Glow de fundo */}
      <div className={`absolute top-0 left-0 right-0 h-24 blur-3xl pointer-events-none transition-all duration-500 ${bgGlow[accent]}`} />

      {/* Corner accent */}
      <div className="absolute top-0 right-0 w-16 h-16 opacity-20 pointer-events-none">
        <div className={`absolute top-0 right-0 w-full h-full bg-gradient-to-bl ${
          accent === 'brand' ? 'from-orange-500/30' :
          accent === 'positive' ? 'from-emerald-500/20' :
          accent === 'negative' ? 'from-red-500/20' : 'from-white/5'
        } to-transparent rounded-br-2xl`} />
      </div>

      <div className="relative flex items-start justify-between mb-5">
        <p className="kpi-label">{label}</p>
        {badge && (
          <span className={badgeClass[badge] ?? 'badge-neutral'}>{badge}</span>
        )}
      </div>

      <p className={`relative text-3xl sm:text-4xl font-bold num leading-none tracking-tight ${valClass}`}>
        {value}
      </p>

      {sub && (
        <p className={`relative text-[11px] mt-4 font-medium tabular-nums font-mono ${subClass ?? 'text-zinc-600'}`}>
          {sub}
        </p>
      )}
    </div>
  );
}
