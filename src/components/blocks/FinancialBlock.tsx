import { formatCurrency } from '@/lib/utils/format';
import type { DashboardMetrics } from '@/lib/mock/metrics';
import type { AccountSummary } from '@/lib/finance/calc';

interface Props {
  data: DashboardMetrics;
  realFinance?: AccountSummary | null;
}

export function FinancialBlock({ data, realFinance }: Props) {
  const saldo    = realFinance?.faturamento    ?? data.financial.saldo;
  const aReceber = realFinance?.a_receber      ?? data.financial.a_receber;
  const aPagar   = realFinance?.a_pagar        ?? data.financial.a_pagar;
  const lucro    = realFinance?.lucro_liquido  ?? data.financial.projecao_mes;
  const isReal   = !!realFinance;

  return (
    <div className="relative bg-[#161616] border border-white/[0.06] rounded-xl p-5 shadow-card overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 bg-white/[0.04] rounded-lg p-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </span>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-[0.1em]">Financeiro</p>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20">
          Restrito
        </span>
      </div>

      {/* Lucro principal */}
      <div className="mb-5 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.04]">
        <p className="text-[10px] text-zinc-500 uppercase tracking-wide font-medium mb-2">
          Lucro líquido {isReal ? '' : '(estimado)'}
        </p>
        <p className={`text-3xl sm:text-[2rem] num font-bold leading-none ${
          lucro >= 0 ? 'text-emerald-300' : 'text-red-300'
        }`}>
          {formatCurrency(lucro)}
        </p>
        {!isReal && (
          <p className="text-[10px] text-zinc-600 mt-1.5 tracking-wide">
            Registre lançamentos para dados reais
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCell
          label={isReal ? 'Receita bruta' : 'Saldo'}
          value={formatCurrency(saldo)}
          valueClass="text-emerald-400"
        />
        <StatCell label="A receber" value={formatCurrency(aReceber)} valueClass="text-zinc-200" />
        <StatCell label="A pagar"   value={formatCurrency(aPagar)}   valueClass="text-red-400" />
      </div>
    </div>
  );
}

function StatCell({ label, value, valueClass = 'text-zinc-200' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-white/[0.02] rounded-md p-2.5">
      <p className="text-[9px] text-zinc-700 uppercase tracking-[0.1em] font-semibold mb-1">{label}</p>
      <p className={`text-sm font-bold num leading-tight ${valueClass}`}>{value}</p>
    </div>
  );
}
