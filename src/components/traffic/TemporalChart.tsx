// TemporalChart — configuração de tráfego do EvolutionChart genérico.
// Barras: gasto (laranja) + faturamento (verde).
// Linhas: ROAS confirmado + projetado no eixo direito.
// Extraído para ui/EvolutionChart — este arquivo é wrapper de configuração.

import type { DailyPoint } from '@/lib/mock/traffic';
import type { EvolutionChartProps } from '@/components/ui/EvolutionChart';
import { CHART } from '@/lib/ui/tokens';

export type { DailyPoint };

export function buildTrafficChartProps(series: DailyPoint[]): EvolutionChartProps {
  const data = series.map(s => ({
    date:         s.date,
    gasto:        s.gasto,
    faturamento:  s.faturamento,
    roas_conf:    s.roas_confirmado,
    roas_proj:    s.roas_projetado,
  }));

  return {
    data,
    xKey:   'date',
    title:  'EVOLUÇÃO 30 DIAS',
    height: 220,
    bars: [
      { dataKey: 'gasto',       label: 'Gasto',       color: CHART.bar1, fillOpacity: 0.6 },
      { dataKey: 'faturamento', label: 'Faturamento',  color: CHART.bar2, fillOpacity: 0.5 },
    ],
    lines: [
      { dataKey: 'roas_conf', label: 'ROAS Conf.', color: CHART.line1, yAxisId: 'right', strokeWidth: 2 },
      { dataKey: 'roas_proj', label: 'ROAS Proj.', color: CHART.line2, yAxisId: 'right', strokeWidth: 1.5, strokeDasharray: '4 2' },
    ],
    rightDomain: [0, 8],
    tooltipFormatter: (key, value) => {
      if (key.includes('roas') || key.includes('ROAS')) return `${value.toFixed(2)}x`;
      return `R$ ${(value / 1000).toFixed(1)}k`;
    },
    footnote: 'Barras: gasto · faturamento  ·  Linhas: ROAS confirmado · projetado',
  };
}

// Re-exporta EvolutionChart como TemporalChart para compat com imports existentes
export { EvolutionChart as TemporalChart } from '@/components/ui/EvolutionChart';
