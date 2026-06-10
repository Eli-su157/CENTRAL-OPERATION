import { formatCurrency } from '@/lib/utils/format';
import type { DashboardMetrics } from '@/lib/mock/metrics';
import type { AccountSummary } from '@/lib/finance/calc';

interface Props {
  data: DashboardMetrics;
  realFinance?: AccountSummary | null;
}

export function FinancialBlock({ data, realFinance }: Props) {
  // Prioriza dados reais; usa mock como fallback visual enquanto não houver lançamentos
  const saldo     = realFinance?.faturamento ?? data.financial.saldo;
  const aReceber  = realFinance?.a_receber   ?? data.financial.a_receber;
  const aPagar    = realFinance?.a_pagar     ?? data.financial.a_pagar;
  const lucro     = realFinance?.lucro_liquido ?? data.financial.projecao_mes;
  const isReal    = !!realFinance;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 relative">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Financeiro</p>
        <span className="text-xs text-amber-500 bg-amber-950 border border-amber-800 px-2 py-0.5 rounded-full font-medium">
          Restrito
        </span>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">Lucro líquido {isReal ? '(real)' : '(estimado)'}</p>
          <p className={`text-2xl font-bold tabular-nums ${lucro >= 0 ? 'text-white' : 'text-red-400'}`}>
            {formatCurrency(lucro)}
          </p>
          {!isReal && (
            <p className="text-xs text-zinc-700 mt-0.5">Registre lançamentos para dados reais</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-zinc-800/60">
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">{isReal ? 'Receita bruta' : 'Saldo'}</p>
            <p className="text-sm font-bold text-emerald-400 tabular-nums">{formatCurrency(saldo)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">A receber</p>
            <p className="text-sm font-bold text-blue-400 tabular-nums">{formatCurrency(aReceber)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">A pagar</p>
            <p className="text-sm font-bold text-red-400 tabular-nums">{formatCurrency(aPagar)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
