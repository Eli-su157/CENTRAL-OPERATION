'use client';

import dynamic from 'next/dynamic';
import { formatCurrency } from '@/lib/utils/format';
import type { DreComparativo } from '@/lib/finance/calc';
import { calcTotalCustos } from '@/lib/finance/calc';

const PieChartDynamic = dynamic(
  () => import('./DreCostChartInner').then(m => ({ default: m.DreCostChartInner })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[200px] flex items-center justify-center">
        <div className="w-32 h-32 rounded-full border-4 border-zinc-800 border-t-orange-500/40 animate-spin" />
      </div>
    ),
  }
);

interface Props {
  dre: DreComparativo;
}

const COST_LINES = [
  { key: 'taxas_plataforma',  label: 'Taxas plataforma', color: '#f97316' },
  { key: 'reembolsos',        label: 'Reembolsos',        color: '#ef4444' },
  { key: 'gasto_trafego',     label: 'Tráfego',           color: '#3b82f6' },
  { key: 'comissoes',         label: 'Comissões',         color: '#a855f7' },
  { key: 'custos_fixos',      label: 'Custos fixos',      color: '#f59e0b' },
  { key: 'pagamentos_equipe', label: 'Equipe',            color: '#10b981' },
  { key: 'outros',            label: 'Outros',            color: '#71717a' },
] as const;

export function DreCostChart({ dre }: Props) {
  const totalCustos = calcTotalCustos(dre);

  const slices = COST_LINES
    .map(l => ({
      name:  l.label,
      value: dre[l.key as keyof typeof dre] as number,
      color: l.color,
    }))
    .filter(s => s.value > 0);

  if (slices.length === 0 || totalCustos === 0) {
    return (
      <div className="bg-[#0c0c0f] border border-white/[0.07] rounded-2xl p-5">
        <p className="kpi-label mb-3">Distribuição de Custos</p>
        <div className="flex items-center justify-center h-[160px]">
          <p className="text-xs text-zinc-700">Nenhum custo registrado neste período.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0c0c0f] border border-white/[0.07] rounded-2xl p-5 overflow-hidden relative shimmer-sweep">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />
      <div className="flex items-center justify-between mb-4">
        <p className="kpi-label">Distribuição de Custos</p>
        <span className="text-xs text-red-400 num font-bold">{formatCurrency(totalCustos)}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="shrink-0 w-[140px] h-[140px]">
          <PieChartDynamic slices={slices} total={totalCustos} />
        </div>

        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          {slices.map(s => (
            <div key={s.name} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="text-[11px] text-zinc-500 truncate">{s.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-zinc-600 num">
                  {((s.value / totalCustos) * 100).toFixed(0)}%
                </span>
                <span className="text-[11px] text-zinc-300 num font-medium">
                  {formatCurrency(s.value)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
