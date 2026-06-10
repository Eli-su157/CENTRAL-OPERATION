'use client';

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { DailyPoint } from '@/lib/mock/traffic';

interface Props {
  series: DailyPoint[];
}

function formatK(val: number) {
  return val >= 1000 ? `${(val / 1000).toFixed(0)}k` : String(val);
}

function shortDate(d: string) {
  const parts = d.split('-');
  return `${parts[2]}/${parts[1]}`;
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs">
      <p className="text-zinc-400 mb-1.5">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="tabular-nums">
          {p.name}: {p.name.includes('ROAS') ? `${p.value.toFixed(2)}x` : `R$ ${(p.value / 1000).toFixed(1)}k`}
        </p>
      ))}
    </div>
  );
};

export function TemporalChart({ series }: Props) {
  const data = series.map(s => ({
    date: shortDate(s.date),
    gasto: s.gasto,
    faturamento: s.faturamento,
    roas_conf: s.roas_confirmado,
    roas_proj: s.roas_projetado,
  }));

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">Evolução 30 dias</p>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 0, right: 8, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#71717a', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval={4}
          />
          <YAxis
            yAxisId="left"
            tickFormatter={formatK}
            tick={{ fill: '#71717a', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 8]}
            tickFormatter={v => `${v}x`}
            tick={{ fill: '#71717a', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: '#71717a', paddingTop: 8 }}
            formatter={v => v === 'gasto' ? 'Gasto' : v === 'faturamento' ? 'Faturamento' : v === 'roas_conf' ? 'ROAS Conf.' : 'ROAS Proj.'}
          />
          <Bar yAxisId="left" dataKey="gasto" fill="#f97316" fillOpacity={0.6} radius={[2, 2, 0, 0]} />
          <Bar yAxisId="left" dataKey="faturamento" fill="#22c55e" fillOpacity={0.5} radius={[2, 2, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="roas_conf" stroke="#a78bfa" strokeWidth={2} dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="roas_proj" stroke="#7c3aed" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-xs text-zinc-700 mt-2 text-center">Barras: gasto (laranja) / faturamento (verde) · Linhas: ROAS confirmado (roxo) / projetado (tracejado)</p>
    </div>
  );
}
