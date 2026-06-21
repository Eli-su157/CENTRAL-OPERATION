'use client';

import dynamic from 'next/dynamic';
import { formatCurrency } from '@/lib/utils/format';
import type { CashflowDay } from '@/lib/finance/calc';

const CashflowBarChart = dynamic(
  () => import('./CashflowChartInner').then(m => ({ default: m.CashflowChartInner })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[140px] flex items-center justify-center">
        <div className="flex gap-1 items-end h-20">
          {[40, 70, 55, 90, 45, 65, 80].map((h, i) => (
            <div key={i} className="w-6 rounded-t bg-zinc-800 animate-pulse" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    ),
  }
);

interface Props {
  cashflow: CashflowDay[];
  totalAReceber: number;
  totalAPagar: number;
}

export function CashflowChart({ cashflow, totalAReceber, totalAPagar }: Props) {
  const saldoLiquido = totalAReceber - totalAPagar;

  return (
    <div className="bg-[#0c0c0f] border border-white/[0.07] rounded-2xl p-5 overflow-hidden relative shimmer-sweep">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

      <div className="flex items-center justify-between mb-4">
        <p className="kpi-label">Fluxo de Caixa · Próximos 30 dias</p>
        <span className={`text-xs font-bold num ${saldoLiquido >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {saldoLiquido >= 0 ? '+' : ''}{formatCurrency(saldoLiquido)}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white/[0.02] rounded-xl p-3 border border-emerald-500/10">
          <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono mb-1">A receber</p>
          <p className="text-sm font-bold text-emerald-400 num">{formatCurrency(totalAReceber)}</p>
        </div>
        <div className="bg-white/[0.02] rounded-xl p-3 border border-red-500/10">
          <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono mb-1">A pagar</p>
          <p className="text-sm font-bold text-red-400 num">{formatCurrency(totalAPagar)}</p>
        </div>
        <div className="bg-white/[0.02] rounded-xl p-3 border border-white/[0.04]">
          <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono mb-1">Saldo</p>
          <p className={`text-sm font-bold num ${saldoLiquido >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
            {formatCurrency(saldoLiquido)}
          </p>
        </div>
      </div>

      {cashflow.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[100px] gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-700">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <p className="text-xs text-zinc-700">Sem compromissos agendados nos próximos 30 dias.</p>
        </div>
      ) : (
        <CashflowBarChart cashflow={cashflow} />
      )}
    </div>
  );
}
