// KPICard — card de número grande com acento de cor e badge real/demo.
// Extraído de: SummaryStrip (Kpi), app/page.tsx (ConsolidatedKpi).
// Substitui todas as variações de "card com número principal" do app.

export type KPIAccent = 'brand' | 'positive' | 'negative' | 'neutral';
export type KPIBadge = 'real' | 'demo' | 'sem dados' | string;

const topBarClass: Record<KPIAccent, string> = {
  brand:    'bg-gradient-to-r from-transparent via-orange-500/35 to-transparent',
  positive: 'bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent',
  negative: 'bg-gradient-to-r from-transparent via-red-500/30 to-transparent',
  neutral:  'bg-gradient-to-r from-transparent via-white/[0.05] to-transparent',
};

const valueClass: Record<KPIAccent, string> = {
  brand:    'text-white',
  positive: 'text-emerald-300',
  negative: 'text-red-300',
  neutral:  'text-zinc-600',
};

const badgeClass: Record<string, string> = {
  real:        'badge-positive',
  demo:        'badge-neutral',
  'sem dados': 'badge-neutral',
};

interface Props {
  label: string;
  value: string;
  /** Acento de cor da barra top e do valor */
  accent?: KPIAccent;
  /** Badge de fonte de dados */
  badge?: KPIBadge;
  /** Linha secundária — comparativo ("↑12% vs ontem") ou texto contextual */
  sub?: string;
  subClass?: string;
  /** Sobrepõe a cor do valor */
  valueColorClass?: string;
}

export function KPICard({
  label, value, accent = 'brand', badge, sub, subClass, valueColorClass,
}: Props) {
  const barClass = topBarClass[accent];
  const valClass = valueColorClass ?? (value === '—' ? 'text-zinc-700' : valueClass[accent]);

  return (
    <div className="relative bg-[#18181B] border border-[#27272A] rounded-lg p-6 overflow-hidden shadow-card">
      <div className={`absolute top-0 left-0 right-0 h-px ${barClass}`} />

      <div className="flex items-center justify-between mb-3">
        <p className="kpi-label">{label}</p>
        {badge && (
          <span className={badgeClass[badge] ?? 'badge-neutral'}>{badge}</span>
        )}
      </div>

      <p className={`text-2xl sm:text-[1.65rem] font-bold num leading-none ${valClass}`}>
        {value}
      </p>

      {sub && (
        <p className={`text-xs mt-2.5 font-medium tabular-nums ${subClass ?? 'text-zinc-400'}`}>
          {sub}
        </p>
      )}
    </div>
  );
}
