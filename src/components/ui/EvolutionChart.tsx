'use client';

// EvolutionChart — gráfico de evolução temporal parametrizável.
// Extraído de: components/traffic/TemporalChart.tsx
// Generalizado para servir tráfego E financeiro com séries configuráveis.
// Recharts carregado apenas no cliente (sem ssr).

import {
  ResponsiveContainer, ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { CHART } from '@/lib/ui/tokens';

export interface BarSeries {
  dataKey: string;
  label: string;
  color: string;
  fillOpacity?: number;
}

export interface LineSeries {
  dataKey: string;
  label: string;
  color: string;
  yAxisId?: 'left' | 'right';
  strokeWidth?: number;
  strokeDasharray?: string;
  dot?: boolean;
}

export interface EvolutionChartProps {
  /** Dados — cada ponto é um objeto com os dataKeys das séries */
  data: Record<string, string | number>[];
  /** Chave do eixo X (ex: 'date') */
  xKey: string;
  /** Formata os labels do eixo X */
  xFormatter?: (v: string) => string;
  bars?: BarSeries[];
  lines?: LineSeries[];
  /** Formata o eixo Y esquerdo */
  leftFormatter?: (v: number) => string;
  /** Formata o eixo Y direito (omitir se não tiver) */
  rightFormatter?: (v: number) => string;
  rightDomain?: [number, number];
  /** Formata o tooltip: (key, valor) → string */
  tooltipFormatter?: (key: string, value: number) => string;
  title?: string;
  height?: number;
  footnote?: string;
}

function defaultTooltipFormatter(key: string, value: number): string {
  if (value === undefined || value === null) return '—';
  if (key.toLowerCase().includes('roas') || key.toLowerCase().includes('roi')) {
    return `${value.toFixed(2)}x`;
  }
  return `R$ ${(value / 1000).toFixed(1)}k`;
}

function defaultXFormatter(v: string): string {
  const parts = v.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : v;
}

function defaultLeftFormatter(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v);
}

const CustomTooltip = ({
  active, payload, label, formatter,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  formatter: (key: string, v: number) => string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f0f12] border border-white/[0.08] rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-zinc-500 mb-1.5">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="tabular-nums">
          {p.name}: {formatter(p.name, p.value)}
        </p>
      ))}
    </div>
  );
};

export function EvolutionChart({
  data, xKey, xFormatter, bars = [], lines = [],
  leftFormatter, rightFormatter, rightDomain,
  tooltipFormatter, title, height = 220, footnote,
}: EvolutionChartProps) {
  const hasRightAxis = lines.some(l => l.yAxisId === 'right') || rightFormatter;
  const xFmt = xFormatter ?? defaultXFormatter;
  const lFmt = leftFormatter ?? defaultLeftFormatter;
  const tFmt = tooltipFormatter ?? defaultTooltipFormatter;

  const chartData = data.map(d => ({
    ...d,
    [xKey]: xFmt(String(d[xKey])),
  }));

  return (
    <div className="bg-transparent">
      {title && (
        <p className="kpi-label mb-4">{title}</p>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={chartData} margin={{ top: 0, right: hasRightAxis ? 8 : 0, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
          <XAxis
            dataKey={xKey}
            tick={{ fill: CHART.axis, fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval={Math.max(0, Math.floor(data.length / 6))}
          />
          <YAxis
            yAxisId="left"
            tickFormatter={lFmt}
            tick={{ fill: CHART.axis, fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          {hasRightAxis && (
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={rightDomain ?? [0, 8]}
              tickFormatter={rightFormatter ?? (v => `${v}x`)}
              tick={{ fill: CHART.axis, fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
          )}
          <Tooltip
            content={<CustomTooltip formatter={tFmt} />}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: CHART.axis, paddingTop: 8 }}
          />
          <defs>
            {bars.map(b => (
              <linearGradient key={b.dataKey} id={`barGrad-${b.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={b.color} stopOpacity={b.fillOpacity ?? 0.55} />
                <stop offset="100%" stopColor={b.color} stopOpacity={0.08} />
              </linearGradient>
            ))}
          </defs>
          {bars.map(b => (
            <Bar
              key={b.dataKey}
              yAxisId="left"
              dataKey={b.dataKey}
              name={b.label}
              fill={`url(#barGrad-${b.dataKey})`}
              maxBarSize={44}
              radius={[3, 3, 0, 0]}
            />
          ))}
          {lines.map(l => (
            <Line
              key={l.dataKey}
              yAxisId={l.yAxisId ?? 'left'}
              type="monotone"
              dataKey={l.dataKey}
              name={l.label}
              stroke={l.color}
              strokeWidth={l.strokeWidth ?? 2}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={l.strokeDasharray}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
      {footnote && (
        <p className="text-[10px] text-zinc-700 mt-2 text-center">{footnote}</p>
      )}
    </div>
  );
}
