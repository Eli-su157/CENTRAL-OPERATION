'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/utils/format';

interface Slice {
  name: string;
  value: number;
  color: string;
}

interface Props {
  slices: Slice[];
  total: number;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: Slice }[] }) => {
  if (!active || !payload?.length) return null;
  const s = payload[0];
  return (
    <div className="bg-[#0f0f12] border border-white/[0.08] rounded-lg px-3 py-2 text-xs shadow-xl">
      <p style={{ color: s.payload.color }} className="font-medium mb-0.5">{s.name}</p>
      <p className="text-zinc-300 num">{formatCurrency(s.value)}</p>
    </div>
  );
};

export function DreCostChartInner({ slices, total }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={slices}
          cx="50%"
          cy="50%"
          innerRadius={42}
          outerRadius={62}
          paddingAngle={2}
          dataKey="value"
          strokeWidth={0}
        >
          {slices.map((s, i) => (
            <Cell key={i} fill={s.color} fillOpacity={0.85} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        {/* Texto central */}
        <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" fill="#71717a" fontSize="9" fontFamily="monospace">
          TOTAL
        </text>
        <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" fill="#ef4444" fontSize="10" fontWeight="bold">
          {formatCurrency(total).replace('R$ ', 'R$ ')}
        </text>
      </PieChart>
    </ResponsiveContainer>
  );
}
