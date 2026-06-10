import { formatNumber } from '@/lib/utils/format';

interface Funil {
  impressoes: number;
  cliques: number;
  checkout_iniciado: number;
  pix_gerado: number;
  pix_pago: number;
  cartao_aprovado: number;
  vendas_confirmadas: number;
}

function pct(num: number, den: number) {
  if (den === 0) return '—';
  return ((num / den) * 100).toFixed(1) + '%';
}

interface Step {
  label: string;
  value: number;
  rate?: string;
  rateLabel?: string;
  highlight?: boolean;
}

export function FunilBlock({ funil }: { funil: Funil }) {
  const vendas_totais = funil.pix_pago + funil.cartao_aprovado;
  const steps: Step[] = [
    { label: 'Impressões',        value: funil.impressoes },
    { label: 'Cliques',           value: funil.cliques,           rate: pct(funil.cliques, funil.impressoes), rateLabel: 'CTR' },
    { label: 'Checkout iniciado', value: funil.checkout_iniciado, rate: pct(funil.checkout_iniciado, funil.cliques), rateLabel: 'Conv.' },
    { label: 'Pix gerado',        value: funil.pix_gerado,        rate: pct(funil.pix_gerado, funil.checkout_iniciado), rateLabel: 'Conv.' },
    { label: 'Pix pago',          value: funil.pix_pago,          rate: pct(funil.pix_pago, funil.pix_gerado), rateLabel: 'Conv. Pix', highlight: true },
    { label: 'Cartão aprovado',   value: funil.cartao_aprovado,   rate: undefined },
    { label: 'Vendas totais',     value: vendas_totais,           rate: pct(vendas_totais, funil.checkout_iniciado), rateLabel: 'Conv. checkout', highlight: true },
  ];

  const maxVal = steps[0].value;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">Funil de Conversão</p>
      <div className="flex flex-col gap-2">
        {steps.map((step, i) => {
          const width = maxVal > 0 ? `${Math.max((step.value / maxVal) * 100, 2)}%` : '2%';
          return (
            <div key={i} className="flex items-center gap-3">
              <div className="w-40 shrink-0">
                <p className={`text-xs ${step.highlight ? 'text-white font-medium' : 'text-zinc-400'}`}>{step.label}</p>
                {step.rate && (
                  <p className="text-xs text-zinc-600">{step.rateLabel}: {step.rate}</p>
                )}
              </div>
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 h-5 bg-zinc-800 rounded overflow-hidden">
                  <div
                    className={`h-full rounded transition-all ${step.highlight ? 'bg-violet-600' : 'bg-zinc-600'}`}
                    style={{ width }}
                  />
                </div>
                <span className={`text-sm tabular-nums font-medium w-14 text-right ${step.highlight ? 'text-violet-300' : 'text-zinc-300'}`}>
                  {formatNumber(step.value)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
