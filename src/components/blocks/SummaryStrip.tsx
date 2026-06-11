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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
      <Kpi
        label={showReal ? 'Faturamento (mês)' : 'Faturamento do Dia'}
        value={formatCurrency(fatValue)}
        delta={showReal ? undefined : formatDelta(delta_faturamento)}
        deltaClass={deltaColor(delta_faturamento)}
        badge={showReal ? 'real' : 'mock'}
        accentColor="violet"
      />
      <Kpi
        label="Lucro Líquido"
        value={formatCurrency(lucroValue)}
        delta={showReal ? undefined : formatDelta(delta_lucro)}
        deltaClass={lucroValue >= 0 ? 'text-emerald-400' : 'text-red-400'}
        badge={showReal ? 'real' : 'mock'}
        accentColor={lucroValue >= 0 ? 'emerald' : 'red'}
      />
      <Kpi
        label="ROAS"
        value={roasDisplay}
        delta={showReal ? undefined : formatDelta(delta_roas, 'pts')}
        deltaClass={roasValue === null ? 'text-zinc-600' : roasValue >= 3 ? 'text-emerald-400' : 'text-red-400'}
        badge={showReal ? (real.roas !== null ? 'real' : 'sem dados') : 'mock'}
        accentColor={roasValue === null ? 'neutral' : roasValue >= 3 ? 'emerald' : 'red'}
      />
    </div>
  );
}

const accentMap = {
  violet:  { bar: 'from-violet-500/60 via-violet-500/20 to-transparent', text: 'text-white' },
  emerald: { bar: 'from-emerald-500/50 via-emerald-500/15 to-transparent', text: 'text-emerald-300' },
  red:     { bar: 'from-red-500/50 via-red-500/15 to-transparent', text: 'text-red-300' },
  neutral: { bar: 'from-zinc-600/40 via-zinc-600/10 to-transparent', text: 'text-zinc-500' },
};

const badgeMap: Record<string, string> = {
  real:      'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20',
  'sem dados': 'bg-zinc-500/10 text-zinc-500 ring-1 ring-zinc-500/15',
  mock:      'bg-zinc-500/10 text-zinc-600 ring-1 ring-zinc-500/10',
};

function Kpi({
  label, value, delta, deltaClass, badge, accentColor,
}: {
  label: string; value: string; delta?: string; deltaClass: string;
  badge: string; accentColor: keyof typeof accentMap;
}) {
  const accent = accentMap[accentColor];

  return (
    <div className="relative bg-[#161616] border border-white/[0.06] rounded-xl p-5 overflow-hidden shadow-card">
      {/* Top gradient accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${accent.bar}`} />

      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] text-zinc-500 uppercase tracking-[0.1em] font-semibold">{label}</p>
        <span className={`text-[10px] px-1.5 py-px rounded font-semibold ${badgeMap[badge] ?? badgeMap.mock}`}>
          {badge}
        </span>
      </div>

      <p className={`text-2xl sm:text-[1.6rem] font-bold tabular-nums leading-none ${
        value === '—' ? 'text-zinc-600' : accent.text
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
