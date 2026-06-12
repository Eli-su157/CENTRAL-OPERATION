// MargemPorProduto — tabela de margem líquida por produto (dashboard).
// Usa DenseTable da camada ui/. Dados calculados por calcMargemPorDashboard().

import { formatCurrency } from '@/lib/utils/format';
import { DenseTable, type DenseColumn } from '@/components/ui';
import type { DashboardMargin } from '@/lib/finance/calc';

interface Props {
  margins: DashboardMargin[];
}

function MargemBadge({ pct }: { pct: number }) {
  const color = pct >= 30 ? 'text-emerald-400 bg-emerald-500/10'
              : pct >= 10 ? 'text-amber-400 bg-amber-500/10'
              : pct >= 0  ? 'text-zinc-400 bg-zinc-800'
              :             'text-red-400 bg-red-500/10';
  return (
    <span className={`text-[11px] font-semibold num px-1.5 py-0.5 rounded ${color}`}>
      {pct.toFixed(1)}%
    </span>
  );
}

const columns: DenseColumn<DashboardMargin>[] = [
  {
    key: 'name', label: 'Produto',
    render: m => (
      <span className={`text-sm font-medium ${m.dashboard_id === null ? 'text-zinc-200 font-bold' : 'text-zinc-300'}`}>
        {m.name}
      </span>
    ),
  },
  {
    key: 'receita', label: 'Receita', sortable: true, align: 'right',
    render: m => <span className="text-emerald-400 num">{formatCurrency(m.receita)}</span>,
  },
  {
    key: 'custos', label: 'Custos', sortable: true, align: 'right',
    render: m => <span className="text-red-400 num">{formatCurrency(m.custos)}</span>,
  },
  {
    key: 'lucro', label: 'Lucro', sortable: true, align: 'right',
    render: m => (
      <span className={`num font-semibold ${m.lucro >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
        {formatCurrency(m.lucro)}
      </span>
    ),
  },
  {
    key: 'margem_pct', label: 'Margem', sortable: true, align: 'right',
    render: m => <MargemBadge pct={m.margem_pct} />,
  },
];

export function MargemPorProduto({ margins }: Props) {
  if (margins.length === 0) return null;

  return (
    <DenseTable<DashboardMargin>
      title="MARGEM POR PRODUTO"
      columns={columns}
      rows={margins}
      keyExtractor={m => m.dashboard_id ?? 'total'}
      sortFn={(rows, key, desc) => [...rows].sort((a, b) => {
        const av = a[key as keyof DashboardMargin] as number;
        const bv = b[key as keyof DashboardMargin] as number;
        if (typeof av !== 'number') return 0;
        return desc ? bv - av : av - bv;
      })}
      initialSortKey="lucro"
      emptyMessage="Nenhum dado de produto disponível."
    />
  );
}
