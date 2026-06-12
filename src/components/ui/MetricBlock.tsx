// MetricBlock — bloco compacto de métrica com comparativo opcional.
// Extraído de: FinancialBlock (StatCell), SalesBlock (MetricCell), DashboardCard (StatCell).
// Usado dentro de grids de blocos do dashboard.

interface Props {
  label: string;
  value: string;
  valueClass?: string;
  /** Linha de comparativo, ex: "+8% vs ontem" */
  delta?: string;
  deltaClass?: string;
  /** Destaque vermelho no fundo (ex: reembolso alto) */
  highlight?: boolean;
}

export function MetricBlock({
  label, value, valueClass = 'text-zinc-200',
  delta, deltaClass, highlight,
}: Props) {
  return (
    <div className={`rounded-md p-2.5 ${
      highlight ? 'bg-red-950/30 border border-red-800/30' : 'bg-white/[0.025]'
    }`}>
      <p className="text-[9px] text-zinc-700 uppercase tracking-[0.1em] font-semibold mb-1">
        {label}
      </p>
      <p className={`text-sm font-bold num leading-tight ${valueClass}`}>{value}</p>
      {delta && (
        <p className={`text-[10px] mt-0.5 tabular-nums ${deltaClass ?? 'text-zinc-600'}`}>
          {delta}
        </p>
      )}
    </div>
  );
}
