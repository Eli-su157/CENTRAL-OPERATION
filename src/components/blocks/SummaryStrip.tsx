import { formatCurrency, formatROAS, formatDelta, deltaColor } from '@/lib/utils/format';
import { KPICard } from '@/components/ui';

interface RealOverride {
  faturamento: number;
  lucro_liquido: number;
  roas: number | null;
}

interface DemoSummary {
  faturamento_dia: number;
  lucro_liquido: number;
  roas: number;
  delta_faturamento: number;
  delta_lucro: number;
  delta_roas: number;
}

interface Props {
  real?: RealOverride | null;
  demoSummary?: DemoSummary | null;
}

export function SummaryStrip({ real, demoSummary }: Props) {
  if (real) {
    const lucroPos = real.lucro_liquido >= 0;
    const roasOk   = real.roas !== null && real.roas >= 3;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <KPICard
          label="Faturamento · mês"
          value={formatCurrency(real.faturamento)}
          accent="brand"
          badge="real"
          sub="mês atual"
          subClass="text-zinc-700"
        />
        <KPICard
          label="Lucro Líquido"
          value={formatCurrency(real.lucro_liquido)}
          accent={lucroPos ? 'positive' : 'negative'}
          badge="real"
          sub="mês atual"
          subClass={lucroPos ? 'text-emerald-400' : 'text-red-400'}
        />
        <KPICard
          label="ROAS"
          value={real.roas !== null ? formatROAS(real.roas) : '—'}
          accent={real.roas === null ? 'neutral' : roasOk ? 'positive' : 'negative'}
          badge={real.roas !== null ? 'real' : 'sem dados'}
          subClass={real.roas === null ? 'text-zinc-600' : roasOk ? 'text-emerald-400' : 'text-red-400'}
        />
      </div>
    );
  }

  if (demoSummary) {
    const lucroPos = demoSummary.lucro_liquido >= 0;
    const roasOk   = demoSummary.roas >= 3;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <KPICard
          label="Faturamento · dia"
          value={formatCurrency(demoSummary.faturamento_dia)}
          accent="brand"
          badge="demo"
          sub={`${formatDelta(demoSummary.delta_faturamento)} vs ontem`}
          subClass={deltaColor(demoSummary.delta_faturamento)}
        />
        <KPICard
          label="Lucro Líquido"
          value={formatCurrency(demoSummary.lucro_liquido)}
          accent={lucroPos ? 'positive' : 'negative'}
          badge="demo"
          sub={`${formatDelta(demoSummary.delta_lucro)} vs ontem`}
          subClass={lucroPos ? 'text-emerald-400' : 'text-red-400'}
        />
        <KPICard
          label="ROAS"
          value={formatROAS(demoSummary.roas)}
          accent={roasOk ? 'positive' : 'negative'}
          badge="demo"
          sub={`${formatDelta(demoSummary.delta_roas, 'pts')} vs ontem`}
          subClass={roasOk ? 'text-emerald-400' : 'text-red-400'}
        />
      </div>
    );
  }

  // Sem dado real e sem demo: mostra strip com traços
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
      <KPICard label="Faturamento · mês" value="—" accent="neutral" badge="sem dados" />
      <KPICard label="Lucro Líquido"     value="—" accent="neutral" badge="sem dados" />
      <KPICard label="ROAS"              value="—" accent="neutral" badge="sem dados" />
    </div>
  );
}
