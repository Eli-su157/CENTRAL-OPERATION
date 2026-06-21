'use client';

import {
  ResponsiveContainer, ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import { formatCurrency } from '@/lib/utils/format';
import type { CashflowDay } from '@/lib/finance/calc';

interface Props {
  cashflow: CashflowDay[];
}

function fmt(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f0f12] border border-white/[0.08] rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-zinc-500 mb-1.5">{label}</p>
      {payload.map(p => p.value !== 0 && (
        <p key={p.name} style={{ color: p.color }} className="num">
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

export function CashflowChartInner({ cashflow }: Props) {
  const chartData = cashflow.slice(0, 20).map(d => ({
    date: fmt(d.date),
    entradas: d.a_receber,
    saidas: d.a_pagar,
    saldo: d.saldo_dia,
  }));

  return (
    <ResponsiveContainer width="100%" height={140}>
      <ComposedChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: '#52525b', fontSize: 9 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#52525b', fontSize: 9 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={0} stroke="#3f3f46" strokeDasharray="3 3" />
        <Bar dataKey="entradas" name="Entradas" fill="#34d399" fillOpacity={0.45} maxBarSize={18} radius={[3, 3, 0, 0]} />
        <Bar dataKey="saidas" name="Saídas" fill="#f87171" fillOpacity={0.45} maxBarSize={18} radius={[3, 3, 0, 0]} />
        <Line
          type="monotone"
          dataKey="saldo"
          name="Saldo"
          stroke="#a1a1aa"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
