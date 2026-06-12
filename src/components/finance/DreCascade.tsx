// DreCascade — DRE em cascata profissional.
// Cada linha: valor, % da receita, variação vs período anterior.
// Reusa calcDre da lib/finance/calc.ts — nunca recalcula por fora.

import { formatCurrency } from '@/lib/utils/format';
import { calcRoas, calcMargem, calcTotalCustos } from '@/lib/finance/calc';
import type { DreComparativo } from '@/lib/finance/calc';

interface Props {
  dre: DreComparativo;
  period: string;
  showComparativo: boolean;
}

interface DreLineSpec {
  key: keyof DreComparativo;
  label: string;
  type: 'receita' | 'deducao' | 'resultado' | 'separator';
  indent?: boolean;
}

const LINES: DreLineSpec[] = [
  { key: 'receita_bruta',     label: 'Receita bruta',           type: 'receita' },
  { key: 'taxas_plataforma',  label: '(-) Taxas de plataforma', type: 'deducao', indent: true },
  { key: 'reembolsos',        label: '(-) Reembolsos / Chargebacks', type: 'deducao', indent: true },
  { key: 'gasto_trafego',     label: '(-) Gasto de tráfego',    type: 'deducao', indent: true },
  { key: 'comissoes',         label: '(-) Comissões',           type: 'deducao', indent: true },
  { key: 'custos_fixos',      label: '(-) Custos fixos',        type: 'deducao', indent: true },
  { key: 'pagamentos_equipe', label: '(-) Pagamentos de equipe',type: 'deducao', indent: true },
  { key: 'outros',            label: '(-) Outros',              type: 'deducao', indent: true },
  { key: 'lucro_liquido',     label: '= Lucro Líquido',         type: 'resultado' },
];

function pct(value: number, receita: number): string {
  if (receita === 0) return '—';
  return ((value / receita) * 100).toFixed(1) + '%';
}

function DeltaBadge({ delta, invert = false }: { delta: number | null; invert?: boolean }) {
  if (delta === null) return null;
  const positive = invert ? delta < 0 : delta > 0;
  const neutral = Math.abs(delta) < 0.5;
  return (
    <span className={`text-[10px] font-medium tabular-nums ${
      neutral ? 'text-zinc-600' : positive ? 'text-emerald-400' : 'text-red-400'
    }`}>
      {delta > 0 ? '↑' : delta < 0 ? '↓' : '·'}{Math.abs(delta).toFixed(1)}%
    </span>
  );
}

export function DreCascade({ dre, period, showComparativo }: Props) {
  const roas = calcRoas(dre);
  const margem = calcMargem(dre);
  const totalCustos = calcTotalCustos(dre);
  const lucroPos = dre.lucro_liquido >= 0;

  return (
    <div className="bg-[#111111] border border-white/[0.06] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
        <div>
          <p className="kpi-label">DRE — Demonstrativo de Resultado</p>
          <p className="text-xs text-zinc-700 mt-0.5">{period}</p>
        </div>
        <div className="flex items-center gap-4">
          {roas !== null && (
            <div className="text-right">
              <p className="kpi-label">ROAS</p>
              <p className={`text-sm font-bold num ${roas >= 3 ? 'text-emerald-400' : 'text-red-400'}`}>
                {roas.toFixed(2)}x
              </p>
            </div>
          )}
          <div className="text-right">
            <p className="kpi-label">Margem</p>
            <p className={`text-sm font-bold num ${margem >= 20 ? 'text-emerald-400' : margem >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
              {margem.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Cabeçalho das colunas */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-5 py-2 border-b border-white/[0.04] bg-white/[0.01]">
        <span className="kpi-label">Linha</span>
        <span className="kpi-label text-right w-20">Valor</span>
        <span className="kpi-label text-right w-12">% receita</span>
        {showComparativo && <span className="kpi-label text-right w-14">vs ant.</span>}
      </div>

      {/* Linhas do DRE */}
      <div className="divide-y divide-white/[0.03]">
        {LINES.map(line => {
          const value = dre[line.key] as number;
          const delta_pct = dre.delta_pct[line.key as keyof typeof dre.delta_pct] ?? null;

          // Oculta linhas de deduções zeradas
          if (line.type === 'deducao' && value === 0) return null;

          const isResult = line.type === 'resultado';
          const isReceita = line.type === 'receita';

          return (
            <div
              key={line.key}
              className={`grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-5 py-2.5 items-center ${
                isResult
                  ? 'bg-white/[0.02] border-t-2 ' + (lucroPos ? 'border-t-emerald-800/50' : 'border-t-red-800/50')
                  : line.indent ? 'pl-9' : ''
              }`}
            >
              <span className={`text-sm ${
                isResult ? 'font-bold text-zinc-100' :
                isReceita ? 'font-semibold text-zinc-200' :
                'text-zinc-500'
              }`}>
                {line.label}
              </span>

              <span className={`text-sm font-semibold num text-right w-20 ${
                isResult
                  ? (lucroPos ? 'text-emerald-400' : 'text-red-400')
                  : isReceita ? 'text-emerald-400'
                  : value > 0 ? 'text-red-400' : 'text-zinc-600'
              }`}>
                {isReceita ? formatCurrency(value)
                  : isResult ? formatCurrency(value)
                  : value > 0 ? `(${formatCurrency(value)})` : '—'}
              </span>

              <span className="text-[11px] text-zinc-600 tabular-nums text-right w-12">
                {isResult
                  ? <span className={margem >= 0 ? 'text-emerald-500/70' : 'text-red-500/70'}>{margem.toFixed(1)}%</span>
                  : pct(value, dre.receita_bruta)
                }
              </span>

              {showComparativo && (
                <span className="text-right w-14 flex justify-end">
                  <DeltaBadge
                    delta={delta_pct}
                    invert={line.type === 'deducao'}
                  />
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Rodapé: total custos */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.05] bg-white/[0.01]">
        <span className="text-xs text-zinc-600">Total de custos</span>
        <span className="text-xs font-semibold text-red-400 num">{formatCurrency(totalCustos)}</span>
      </div>
    </div>
  );
}
