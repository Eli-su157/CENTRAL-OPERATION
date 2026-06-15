'use client';

import dynamic from 'next/dynamic';
import type { DailyPoint } from '@/lib/mock/traffic';
import { buildTrafficChartProps } from './TemporalChart';

// Recharts carregado apenas no cliente — remove ~100 kB do bundle inicial
const EvolutionChart = dynamic(
  () => import('@/components/ui/EvolutionChart').then(m => ({ default: m.EvolutionChart })),
  {
    ssr: false,
    loading: () => (
      <div className="bg-[#0f0f12] border border-white/[0.06] rounded-xl p-5 animate-pulse">
        <div className="h-3 w-32 bg-zinc-800 rounded mb-4" />
        <div className="h-[220px] bg-zinc-800/50 rounded" />
      </div>
    ),
  }
);

export function TemporalChartLazy({ series }: { series: DailyPoint[] }) {
  const props = buildTrafficChartProps(series);
  return <EvolutionChart {...props} />;
}
