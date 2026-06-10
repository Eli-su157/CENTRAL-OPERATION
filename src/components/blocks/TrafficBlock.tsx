import Link from 'next/link';
import { formatCurrency, formatDelta, deltaColor } from '@/lib/utils/format';
import type { DashboardMetrics } from '@/lib/mock/metrics';

// Dados reais de tráfego — quando fornecidos substituem o mock
interface RealTrafficData {
  dashboardId: string;
  gasto_dia: number;
  roas_confirmado: number;   // OFICIAL
  roas_projetado: number;    // apoio
  cpa: number;
  roi: number;
}

interface Props {
  data: DashboardMetrics;
  real?: RealTrafficData | null;
}

export function TrafficBlock({ data, real }: Props) {
  const t = data.traffic;
  const showReal = !!real;

  const gasto          = showReal ? real.gasto_dia        : t.gasto_dia;
  const roasConf       = showReal ? real.roas_confirmado  : t.roas;
  const roasProj       = showReal ? real.roas_projetado   : t.roas * 1.07;
  const cpa            = showReal ? real.cpa              : t.cpa;
  const roi            = showReal ? real.roi              : t.roi;
  const roasOk         = roasConf >= 3;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Tráfego</p>
        {real && (
          <Link
            href={`/app/d/${real.dashboardId}/trafego`}
            className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
          >
            Painel completo →
          </Link>
        )}
      </div>

      {/* ROAS duplo em destaque */}
      <div className="mb-4">
        <p className="text-xs text-zinc-500 mb-1">ROAS</p>
        <div className="flex items-baseline gap-2.5">
          <span className={`text-2xl font-bold tabular-nums ${roasOk ? 'text-emerald-400' : 'text-red-400'}`}>
            {roasConf.toFixed(2)}x
          </span>
          <span className="text-sm text-zinc-500 tabular-nums" title="ROAS projetado (inclui pix gerado não pago)">
            ~{roasProj.toFixed(2)}x
          </span>
        </div>
        <p className="text-xs text-zinc-600 mt-0.5">confirmado · projetado</p>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-zinc-800/60">
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">Gasto do dia</p>
          <p className="text-sm font-bold text-white tabular-nums">{formatCurrency(gasto)}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">CPA</p>
          <p className="text-sm font-bold text-white tabular-nums">{formatCurrency(cpa)}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">ROI</p>
          <p className={`text-sm font-bold tabular-nums ${deltaColor(roi)}`}>{formatDelta(roi)}</p>
        </div>
      </div>

      {/* Plataformas do mock (enriquecimento visual) */}
      {!showReal && t.plataformas.length > 0 && (
        <div className="pt-4 border-t border-zinc-800/60 mt-4">
          <p className="text-xs text-zinc-600 uppercase tracking-widest font-medium mb-3">Por plataforma</p>
          <div className="flex flex-col gap-2">
            {t.plataformas.map(p => (
              <div key={p.nome} className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">{p.nome}</span>
                <div className="flex gap-4 tabular-nums">
                  <span className="text-zinc-300">{formatCurrency(p.gasto)}</span>
                  <span className={p.roas >= 3 ? 'text-emerald-400' : 'text-red-400'}>
                    {p.roas.toFixed(2)}x
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
