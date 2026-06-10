import Link from 'next/link';
import { formatCurrency } from '@/lib/utils/format';

interface Props {
  dashboard: {
    id: string;
    name: string;
  };
  summary: {
    faturamento: number;
    lucro_liquido: number;
    roas: number | null; // null quando não há dados de tráfego lançados
  };
  canSeeFinancial: boolean;
}

export function DashboardCard({ dashboard, summary, canSeeFinancial }: Props) {
  const roasOk = summary.roas !== null && summary.roas >= 3;
  const roasDisplay = summary.roas !== null ? summary.roas.toFixed(2) + 'x' : '—';

  return (
    <Link
      href={`/app/d/${dashboard.id}`}
      className="group bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 transition-all hover:shadow-lg hover:shadow-black/20 cursor-pointer block"
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="font-semibold text-white group-hover:text-violet-300 transition-colors leading-tight">
          {dashboard.name}
        </h3>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-zinc-700 group-hover:text-violet-500 transition-colors shrink-0 mt-0.5"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>

      {canSeeFinancial ? (
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Faturamento" value={formatCurrency(summary.faturamento)} />
          <Stat
            label="Lucro"
            value={formatCurrency(summary.lucro_liquido)}
            valueClass={summary.lucro_liquido >= 0 ? 'text-emerald-400' : 'text-red-400'}
          />
          <Stat
            label="ROAS"
            value={roasDisplay}
            valueClass={summary.roas === null ? 'text-zinc-600' : roasOk ? 'text-emerald-400' : 'text-red-400'}
          />
        </div>
      ) : (
        <p className="text-xs text-zinc-600 italic">Dados financeiros restritos</p>
      )}

      <div className="mt-3 pt-3 border-t border-zinc-800/60">
        <span className="text-xs text-zinc-600">Mês atual · clique para abrir</span>
      </div>
    </Link>
  );
}

function Stat({
  label,
  value,
  valueClass = 'text-white',
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <p className="text-xs text-zinc-500 mb-0.5">{label}</p>
      <p className={`text-sm font-bold tabular-nums leading-tight ${valueClass}`}>{value}</p>
    </div>
  );
}
