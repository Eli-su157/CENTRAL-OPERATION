import { formatCurrency, formatROAS, formatDelta, deltaColor } from '@/lib/utils/format';

interface RealOverride {
  faturamento: number;
  lucro_liquido: number;
  roas: number | null;
}

interface Props {
  faturamento_dia: number;
  lucro_liquido: number;
  roas: number;
  delta_faturamento: number;
  delta_lucro: number;
  delta_roas: number;
  real?: RealOverride | null;
}

export function SummaryStrip({
  faturamento_dia, lucro_liquido, roas,
  delta_faturamento, delta_lucro, delta_roas,
  real,
}: Props) {
  const showReal = !!real;

  const fatValue   = showReal ? real.faturamento   : faturamento_dia;
  const lucroValue = showReal ? real.lucro_liquido : lucro_liquido;
  const roasValue  = showReal ? (real.roas ?? null) : roas;
  const roasDisplay = roasValue !== null ? formatROAS(roasValue) : '—';

  const lucroPositive = lucroValue >= 0;
  const roasOk = roasValue !== null && roasValue >= 3;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
      {/* Faturamento — acento laranja (número principal) */}
      <Kpi
        label={showReal ? 'Faturamento · mês' : 'Faturamento · dia'}
        value={formatCurrency(fatValue)}
        delta={showReal ? undefined : formatDelta(delta_faturamento)}
        deltaClass={deltaColor(delta_faturamento)}
        badge={showReal ? 'real' : 'demo'}
        topBar="orange"
        valueClass="text-white"
      />
      {/* Lucro Líquido — verde/vermelho conforme sinal */}
      <Kpi
        label="Lucro Líquido"
        value={formatCurrency(lucroValue)}
        delta={showReal ? undefined : formatDelta(delta_lucro)}
        deltaClass={lucroPositive ? 'text-emerald-400' : 'text-red-400'}
        badge={showReal ? 'real' : 'demo'}
        topBar={lucroPositive ? 'emerald' : 'red'}
        valueClass={lucroPositive ? 'text-emerald-300' : 'text-red-300'}
      />
      {/* ROAS */}
      <Kpi
        label="ROAS"
        value={roasDisplay}
        delta={showReal ? undefined : formatDelta(delta_roas, 'pts')}
        deltaClass={roasValue === null ? 'text-zinc-600' : roasOk ? 'text-emerald-400' : 'text-red-400'}
        badge={showReal ? (real.roas !== null ? 'real' : 'sem dados') : 'demo'}
        topBar={roasValue === null ? 'neutral' : roasOk ? 'emerald' : 'red'}
        valueClass={roasValue === null ? 'text-zinc-600' : roasOk ? 'text-emerald-300' : 'text-red-300'}
      />
    </div>
  );
}

type TopBar = 'orange' | 'emerald' | 'red' | 'neutral';

const topBarClass: Record<TopBar, string> = {
  orange:  'bg-gradient-to-r from-transparent via-orange-500/35 to-transparent',
  emerald: 'bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent',
  red:     'bg-gradient-to-r from-transparent via-red-500/30 to-transparent',
  neutral: 'bg-gradient-to-r from-transparent via-white/[0.05] to-transparent',
};

const badgeClass: Record<string, string> = {
  real:        'badge-positive',
  'sem dados': 'badge-neutral',
  demo:        'badge-neutral',
};

function Kpi({
  label, value, delta, deltaClass, badge, topBar, valueClass,
}: {
  label: string; value: string; delta?: string; deltaClass: string;
  badge: string; topBar: TopBar; valueClass: string;
}) {
  return (
    <div className="relative bg-[#111111] border border-white/[0.06] rounded-xl p-5 overflow-hidden shadow-card">
      <div className={`absolute top-0 left-0 right-0 h-px ${topBarClass[topBar]}`} />

      <div className="flex items-center justify-between mb-3">
        <p className="kpi-label">{label}</p>
        <span className={badgeClass[badge] ?? 'badge-neutral'}>{badge}</span>
      </div>

      {/* Número principal — tipografia financeira */}
      <p className={`text-2xl sm:text-[1.65rem] font-bold num leading-none ${
        value === '—' ? 'text-zinc-700' : valueClass
      }`}>
        {value}
      </p>

      {delta ? (
        <p className={`text-xs mt-2.5 font-medium tabular-nums ${deltaClass}`}>{delta} vs ontem</p>
      ) : (
        <p className="text-xs mt-2.5 text-zinc-700">mês atual</p>
      )}
    </div>
  );
}
