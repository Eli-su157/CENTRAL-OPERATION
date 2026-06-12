// FinanceHealthBlock — indicadores de saúde financeira.
// Dispara AlertBanner se há condição de atenção.

import { formatCurrency } from '@/lib/utils/format';
import { AlertBanner } from '@/components/ui';
import { MetricBlock } from '@/components/ui';
import type { DreComparativo, EvolutionPoint } from '@/lib/finance/calc';
import { calcMargem, calcTotalCustos } from '@/lib/finance/calc';

interface Props {
  dre: DreComparativo;
  evolution: EvolutionPoint[];
}

export function FinanceHealthBlock({ dre, evolution }: Props) {
  const margem = calcMargem(dre);
  const totalCustos = calcTotalCustos(dre);

  // Detecta tendência: custo crescendo mais rápido que receita
  let costGrowthAlert = false;
  let costGrowthMsg = '';
  if (evolution.length >= 2) {
    const last  = evolution[evolution.length - 1];
    const prev  = evolution[evolution.length - 2];
    const receitaGrowth = prev.receita > 0 ? ((last.receita - prev.receita) / prev.receita) * 100 : 0;
    const custoGrowth   = prev.custos  > 0 ? ((last.custos  - prev.custos)  / prev.custos)  * 100 : 0;
    if (custoGrowth > receitaGrowth + 10 && last.custos > 0) {
      costGrowthAlert = true;
      costGrowthMsg = `Custo cresceu ${custoGrowth.toFixed(0)}% enquanto receita cresceu ${receitaGrowth.toFixed(0)}% no último mês.`;
    }
  }

  const lucroPrejuizo = dre.lucro_liquido < 0;
  const margemBaixa   = !lucroPrejuizo && margem < 10;

  return (
    <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-5">
      <p className="kpi-label mb-4">Saúde Financeira</p>

      {/* Alertas */}
      <div className="flex flex-col gap-2 mb-4">
        {lucroPrejuizo && (
          <AlertBanner
            id="prejuizo"
            type="danger"
            message={`Período com prejuízo: ${formatCurrency(Math.abs(dre.lucro_liquido))} de resultado negativo. Revise os custos.`}
          />
        )}
        {margemBaixa && (
          <AlertBanner
            id="margem_baixa"
            type="warning"
            message={`Margem líquida baixa (${margem.toFixed(1)}%). Considere reduzir custos ou aumentar ticket.`}
          />
        )}
        {costGrowthAlert && (
          <AlertBanner
            id="custo_crescente"
            type="warning"
            message={costGrowthMsg}
          />
        )}
        {!lucroPrejuizo && !margemBaixa && !costGrowthAlert && (
          <div className="flex items-center gap-2 py-2 text-xs text-emerald-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Nenhuma condição de atenção detectada.
          </div>
        )}
      </div>

      {/* Métricas de saúde */}
      <div className="grid grid-cols-3 gap-3">
        <MetricBlock
          label="Margem líquida"
          value={`${margem.toFixed(1)}%`}
          valueClass={margem >= 20 ? 'text-emerald-400' : margem >= 0 ? 'text-amber-400' : 'text-red-400'}
        />
        <MetricBlock
          label="Custo / Receita"
          value={dre.receita_bruta > 0 ? `${((totalCustos / dre.receita_bruta) * 100).toFixed(1)}%` : '—'}
          valueClass="text-zinc-300"
        />
        <MetricBlock
          label="Resultado"
          value={formatCurrency(dre.lucro_liquido)}
          valueClass={dre.lucro_liquido >= 0 ? 'text-emerald-400' : 'text-red-400'}
        />
      </div>
    </div>
  );
}
