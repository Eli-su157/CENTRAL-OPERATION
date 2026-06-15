interface Props {
  label: string;
  value: string;
  valueClass?: string;
  delta?: string;
  deltaClass?: string;
  highlight?: boolean;
}

export function MetricBlock({
  label, value, valueClass = 'text-zinc-100',
  delta, deltaClass, highlight,
}: Props) {
  return (
    <div className={`rounded-lg p-3 transition-colors ${
      highlight
        ? 'bg-red-950/20 border border-red-900/25'
        : 'bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05]'
    }`}>
      <p className="text-[9px] text-zinc-600 uppercase tracking-[0.12em] font-bold font-mono mb-1.5">
        {label}
      </p>
      <p className={`text-sm font-bold num leading-tight ${valueClass}`}>{value}</p>
      {delta && (
        <p className={`text-[9px] mt-1 tabular-nums font-mono ${deltaClass ?? 'text-zinc-700'}`}>
          {delta}
        </p>
      )}
    </div>
  );
}
