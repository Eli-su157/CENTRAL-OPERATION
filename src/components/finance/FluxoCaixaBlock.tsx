// FluxoCaixaBlock — projeção de entradas e saídas nos próximos 30 dias.
// Dados calculados por calcCashflow() de lib/finance/calc.ts.

import { formatCurrency } from '@/lib/utils/format';
import type { CashflowDay } from '@/lib/finance/calc';

interface Props {
  cashflow: CashflowDay[];
  totalAReceber: number;
  totalAPagar: number;
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function FluxoCaixaBlock({ cashflow, totalAReceber, totalAPagar }: Props) {
  const saldoLiquido = totalAReceber - totalAPagar;

  return (
    <div className="bg-[#111111] border border-white/[0.06] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.05]">
        <p className="kpi-label mb-3">Fluxo de Caixa Projetado · próximos 30 dias</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-[9px] text-zinc-700 uppercase tracking-[0.1em] font-semibold mb-1">A receber</p>
            <p className="text-sm font-bold num text-emerald-400">{formatCurrency(totalAReceber)}</p>
          </div>
          <div>
            <p className="text-[9px] text-zinc-700 uppercase tracking-[0.1em] font-semibold mb-1">A pagar</p>
            <p className="text-sm font-bold num text-red-400">{formatCurrency(totalAPagar)}</p>
          </div>
          <div>
            <p className="text-[9px] text-zinc-700 uppercase tracking-[0.1em] font-semibold mb-1">Saldo líquido</p>
            <p className={`text-sm font-bold num ${saldoLiquido >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
              {formatCurrency(saldoLiquido)}
            </p>
          </div>
        </div>
      </div>

      {cashflow.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-xs text-zinc-700">Sem compromissos agendados para os próximos 30 dias.</p>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.03] max-h-52 overflow-y-auto">
          {cashflow.map(day => (
            <div key={day.date} className="flex items-center gap-3 px-5 py-2.5">
              <span className="text-[10px] text-zinc-600 font-mono w-16 shrink-0">{formatDate(day.date)}</span>
              <div className="flex-1 min-w-0 flex gap-3">
                {day.a_receber > 0 && (
                  <span className="text-xs text-emerald-400 num">
                    +{formatCurrency(day.a_receber)}
                  </span>
                )}
                {day.a_pagar > 0 && (
                  <span className="text-xs text-red-400 num">
                    -{formatCurrency(day.a_pagar)}
                  </span>
                )}
              </div>
              <span className={`text-xs font-semibold num shrink-0 ${
                day.saldo_dia >= 0 ? 'text-zinc-400' : 'text-red-500'
              }`}>
                {day.saldo_dia >= 0 ? '+' : ''}{formatCurrency(day.saldo_dia)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
