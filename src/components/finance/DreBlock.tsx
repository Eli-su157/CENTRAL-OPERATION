import { formatCurrency, formatROAS } from '@/lib/utils/format';
import type { DreResult } from '@/lib/finance/calc';
import { calcRoas } from '@/lib/finance/calc';

interface Props {
  dre: DreResult;
  period: string;
}

interface DreLine {
  label: string;
  key: keyof DreResult;
  indent?: boolean;
  separator?: boolean;
  highlight?: boolean;
}

const LINES: DreLine[] = [
  { label: 'Receita bruta',         key: 'receita_bruta' },
  { label: '(-) Taxas de plataforma', key: 'taxas_plataforma', indent: true },
  { label: '(-) Reembolsos',         key: 'reembolsos',       indent: true },
  { label: '(-) Gasto de tráfego',   key: 'gasto_trafego',    indent: true },
  { label: '(-) Comissões',          key: 'comissoes',        indent: true },
  { label: '(-) Custos fixos',       key: 'custos_fixos',     indent: true },
  { label: '(-) Pagamentos de equipe', key: 'pagamentos_equipe', indent: true },
  { label: '(-) Outros',             key: 'outros',           indent: true },
];

export function DreBlock({ dre, period }: Props) {
  const roas = calcRoas(dre);
  const margin = dre.receita_bruta > 0
    ? ((dre.lucro_liquido / dre.receita_bruta) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Resultado (DRE)</p>
          <p className="text-xs text-zinc-600 mt-0.5">{period}</p>
        </div>
        {roas !== null && (
          <div className="text-right">
            <p className="text-xs text-zinc-500">ROAS</p>
            <p className={`text-sm font-bold tabular-nums ${roas >= 3 ? 'text-emerald-400' : 'text-red-400'}`}>
              {roas.toFixed(2)}x
            </p>
          </div>
        )}
      </div>

      {/* DRE table */}
      <div className="flex flex-col divide-y divide-zinc-800/50">
        {LINES.map(line => {
          const value = dre[line.key] as number;
          if (value === 0 && line.key !== 'receita_bruta') return null;
          return (
            <div
              key={line.key}
              className={`flex items-center justify-between py-2 ${line.indent ? 'pl-3' : ''}`}
            >
              <span className={`text-sm ${line.indent ? 'text-zinc-500' : 'text-zinc-300 font-medium'}`}>
                {line.label}
              </span>
              <span className={`text-sm tabular-nums font-medium ${
                line.key === 'receita_bruta' ? 'text-emerald-400' :
                line.indent ? 'text-red-400' : 'text-white'
              }`}>
                {line.key === 'receita_bruta'
                  ? formatCurrency(value)
                  : value > 0 ? `(${formatCurrency(value)})` : '—'}
              </span>
            </div>
          );
        })}

        {/* Lucro líquido — resultado final */}
        <div className={`flex items-center justify-between pt-3 mt-1 ${
          dre.lucro_liquido >= 0 ? 'border-t-2 border-emerald-800' : 'border-t-2 border-red-800'
        }`}>
          <div>
            <span className="text-sm font-bold text-white">= Lucro líquido</span>
            <span className="text-xs text-zinc-600 ml-2">margem {margin}%</span>
          </div>
          <span className={`text-lg font-bold tabular-nums ${
            dre.lucro_liquido >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {formatCurrency(dre.lucro_liquido)}
          </span>
        </div>
      </div>
    </div>
  );
}
