import { formatCurrency, formatROAS, formatDelta, deltaColor } from '@/lib/utils/format';
import { KPICard } from '@/components/ui';

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
  delta_faturamento, delta_lucro, delta_roas, real,
}: Props) {
  const showReal    = !!real;
  const fatValue    = showReal ? real.faturamento   : faturamento_dia;
  const lucroValue  = showReal ? real.lucro_liquido : lucro_liquido;
  const roasValue   = showReal ? (real.roas ?? null) : roas;
  const lucroPos    = lucroValue >= 0;
  const roasOk      = roasValue !== null && roasValue >= 3;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
      <KPICard
        label={showReal ? 'Faturamento · mês' : 'Faturamento · dia'}
        value={formatCurrency(fatValue)}
        accent="brand"
        badge={showReal ? 'real' : 'demo'}
        sub={showReal ? 'mês atual' : `${formatDelta(delta_faturamento)} vs ontem`}
        subClass={showReal ? 'text-zinc-700' : deltaColor(delta_faturamento)}
      />
      <KPICard
        label="Lucro Líquido"
        value={formatCurrency(lucroValue)}
        accent={lucroPos ? 'positive' : 'negative'}
        badge={showReal ? 'real' : 'demo'}
        sub={showReal ? 'mês atual' : `${formatDelta(delta_lucro)} vs ontem`}
        subClass={lucroPos ? 'text-emerald-400' : 'text-red-400'}
      />
      <KPICard
        label="ROAS"
        value={roasValue !== null ? formatROAS(roasValue) : '—'}
        accent={roasValue === null ? 'neutral' : roasOk ? 'positive' : 'negative'}
        badge={showReal ? (real.roas !== null ? 'real' : 'sem dados') : 'demo'}
        sub={showReal ? undefined : `${formatDelta(delta_roas, 'pts')} vs ontem`}
        subClass={roasValue === null ? 'text-zinc-600' : roasOk ? 'text-emerald-400' : 'text-red-400'}
      />
    </div>
  );
}
