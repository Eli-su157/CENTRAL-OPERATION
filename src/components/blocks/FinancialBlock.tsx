import { formatCurrency } from '@/lib/utils/format';
import { MetricBlock } from '@/components/ui';
import type { AccountSummary } from '@/lib/finance/calc';

interface Props {
  realFinance?: AccountSummary | null;
}

export function FinancialBlock({ realFinance }: Props) {
  const saldo    = realFinance?.faturamento    ?? 0;
  const aReceber = realFinance?.a_receber      ?? 0;
  const aPagar   = realFinance?.a_pagar        ?? 0;
  const lucro    = realFinance?.lucro_liquido  ?? 0;
  const isReal   = !!realFinance;

  return (
    <div className="relative bg-[#0c0c0f] border border-white/[0.07] rounded-2xl p-5 overflow-hidden shimmer-sweep transition-all duration-300 hover:border-emerald-500/20 hover:shadow-[0_0_30px_-10px_rgba(52,211,153,0.08)]">
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${
        isReal
          ? 'bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent'
          : 'bg-gradient-to-r from-transparent via-amber-500/20 to-transparent'
      }`} />

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <span className={`rounded-lg p-1.5 ${isReal ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-500 bg-white/[0.04]'}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </span>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-[0.12em] font-mono">Financeiro</p>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20 font-mono">
          Restrito
        </span>
      </div>

      {/* Lucro principal */}
      <div className="mb-5 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.04]">
        <p className="text-[10px] text-zinc-500 uppercase tracking-wide font-medium mb-2">
          Lucro líquido {isReal ? '' : '(sem lançamentos)'}
        </p>
        <p className={`text-3xl sm:text-[2rem] num font-bold leading-none ${
          lucro >= 0 ? 'text-emerald-300' : 'text-red-300'
        }`}>
          {isReal ? formatCurrency(lucro) : '—'}
        </p>
        {!isReal && (
          <p className="text-[10px] text-zinc-600 mt-1.5 tracking-wide">
            Registre lançamentos para ver os dados
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricBlock label={isReal ? 'Receita bruta' : 'Saldo'} value={isReal ? formatCurrency(saldo) : '—'} valueClass="text-emerald-400" />
        <MetricBlock label="A receber" value={isReal ? formatCurrency(aReceber) : '—'} valueClass="text-zinc-200" />
        <MetricBlock label="A pagar"   value={isReal ? formatCurrency(aPagar)   : '—'} valueClass="text-red-400" />
      </div>
    </div>
  );
}
