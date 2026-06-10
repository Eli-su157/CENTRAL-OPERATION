import { formatCurrency, formatROAS, formatDelta, deltaColor } from '@/lib/utils/format';

// Quando real está presente, seus valores substituem os mocks —
// garantindo que o lucro aqui = o mesmo do DRE em /app/financeiro.
interface RealOverride {
  faturamento: number;
  lucro_liquido: number;   // THE number
  roas: number | null;     // null = sem dados de tráfego lançados
}

interface Props {
  // Valores mock (usados como fallback visual enquanto não há lançamentos)
  faturamento_dia: number;
  lucro_liquido: number;
  roas: number;
  delta_faturamento: number;
  delta_lucro: number;
  delta_roas: number;
  // Dados reais — substituem os mocks acima quando fornecidos
  real?: RealOverride | null;
}

export function SummaryStrip({
  faturamento_dia, lucro_liquido, roas,
  delta_faturamento, delta_lucro, delta_roas,
  real,
}: Props) {
  const showReal = !!real;

  // Valores exibidos: real tem prioridade; fallback para mock
  const fatValue    = showReal ? real.faturamento    : faturamento_dia;
  const lucroValue  = showReal ? real.lucro_liquido  : lucro_liquido;
  const roasValue   = showReal ? (real.roas ?? null) : roas;
  const roasDisplay = roasValue !== null ? formatROAS(roasValue) : '—';

  return (
    <div className="grid grid-cols-3 divide-x divide-zinc-800 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mb-6">
      <Kpi
        label={showReal ? 'Faturamento (mês)' : 'Faturamento do Dia'}
        value={formatCurrency(fatValue)}
        delta={showReal ? undefined : formatDelta(delta_faturamento)}
        deltaClass={deltaColor(delta_faturamento)}
        badge={showReal ? 'real' : 'mock'}
      />
      <Kpi
        label="Lucro Líquido"
        value={formatCurrency(lucroValue)}
        delta={showReal ? undefined : formatDelta(delta_lucro)}
        deltaClass={lucroValue >= 0 ? 'text-emerald-400' : 'text-red-400'}
        badge={showReal ? 'real' : 'mock'}
      />
      <Kpi
        label="ROAS"
        value={roasDisplay}
        delta={showReal ? undefined : formatDelta(delta_roas, 'pts')}
        deltaClass={roasValue === null ? 'text-zinc-600' : roasValue >= 3 ? 'text-emerald-400' : 'text-red-400'}
        badge={showReal ? (real.roas !== null ? 'real' : 'sem dados') : 'mock'}
      />
    </div>
  );
}

function Kpi({
  label,
  value,
  delta,
  deltaClass,
  badge,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaClass: string;
  badge: string;
}) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-2 mb-2">
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium">{label}</p>
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
          badge === 'real' ? 'bg-emerald-950 text-emerald-600' :
          badge === 'sem dados' ? 'bg-zinc-800 text-zinc-600' :
          'bg-zinc-800 text-zinc-700'
        }`}>
          {badge}
        </span>
      </div>
      <p className={`text-2xl font-bold tabular-nums ${value === '—' ? 'text-zinc-600' : 'text-white'}`}>
        {value}
      </p>
      {delta ? (
        <p className={`text-xs mt-1.5 font-medium tabular-nums ${deltaClass}`}>{delta} vs ontem</p>
      ) : (
        <p className="text-xs mt-1.5 text-zinc-700">mês atual</p>
      )}
    </div>
  );
}
