'use client';

import dynamic from 'next/dynamic';
import type { DailyPoint } from '@/lib/mock/traffic';

// Recharts carregado apenas no cliente — elimina ~100 kB do bundle inicial do painel de tráfego
const TemporalChartInner = dynamic(
  () => import('./TemporalChart').then(m => ({ default: m.TemporalChart })),
  {
    ssr: false,
    loading: () => (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 animate-pulse">
        <div className="h-3 w-32 bg-zinc-800 rounded mb-4" />
        <div className="h-[220px] bg-zinc-800/50 rounded" />
      </div>
    ),
  }
);

export function TemporalChartLazy({ series }: { series: DailyPoint[] }) {
  return <TemporalChartInner series={series} />;
}
