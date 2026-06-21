'use client';

interface Props {
  margem: number;
  label?: string;
}

export function MargemGauge({ margem, label = 'Margem Líquida' }: Props) {
  const clamped = Math.max(-100, Math.min(100, margem));
  const pct = (clamped + 100) / 200; // 0..1 com 50% = 0%
  const degrees = pct * 180; // 0..180

  const color =
    margem >= 30 ? '#34d399' :
    margem >= 15 ? '#10b981' :
    margem >= 0  ? '#f59e0b' :
                   '#ef4444';

  const r = 52;
  const cx = 64;
  const cy = 64;
  const startAngle = 180;
  const endAngle = startAngle + degrees;

  function polarToXY(deg: number) {
    const rad = (deg * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  }

  const start = polarToXY(startAngle);
  const end = polarToXY(endAngle);
  const largeArc = degrees > 180 ? 1 : 0;

  const arcPath = `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  const bgPath = `M ${polarToXY(180).x} ${polarToXY(180).y} A ${r} ${r} 0 1 1 ${polarToXY(360).x} ${polarToXY(360).y}`;

  return (
    <div className="flex flex-col items-center">
      <svg width="128" height="72" viewBox="0 0 128 72">
        {/* Track */}
        <path d={bgPath} fill="none" stroke="#27272a" strokeWidth="8" strokeLinecap="round" />
        {/* Value arc */}
        {degrees > 0 && (
          <path d={arcPath} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" />
        )}
        {/* Needle indicator */}
        {degrees > 0 && (
          <circle cx={end.x} cy={end.y} r="4" fill={color} />
        )}
      </svg>
      <div className="text-center -mt-4">
        <p className="text-2xl font-black num" style={{ color }}>
          {margem.toFixed(1)}%
        </p>
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-mono mt-0.5">{label}</p>
      </div>
    </div>
  );
}
