'use client';

// DecisaoTable — tabela de campanhas de tráfego.
// Configuração do DenseTable genérico (ui/DenseTable) para campanhas.

import { formatCurrency } from '@/lib/utils/format';
import type { Campaign, CampaignSemaphore } from '@/lib/mock/traffic';
import { DenseTable, type DenseColumn, type DenseTableFilter } from '@/components/ui';

interface Props {
  campaigns: Campaign[];
  roasAlvo: number;
}

const semaforo: Record<CampaignSemaphore, { dot: string; label: string; bg: string }> = {
  escalar:  { dot: 'bg-emerald-400', label: 'Escalar',  bg: 'bg-emerald-950/40 border-emerald-800/30' },
  observar: { dot: 'bg-amber-400',   label: 'Observar', bg: 'bg-amber-950/30 border-amber-800/20' },
  matar:    { dot: 'bg-red-500',     label: 'Matar',    bg: 'bg-red-950/40 border-red-800/30' },
};

function SemaforoBadge({ status }: { status: CampaignSemaphore }) {
  const s = semaforo[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${s.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

const FILTERS: DenseTableFilter[] = [
  { value: '',         label: 'Todas'   },
  { value: 'escalar',  label: 'Escalar' },
  { value: 'observar', label: 'Observar'},
  { value: 'matar',    label: 'Matar'   },
];

export function DecisaoTable({ campaigns, roasAlvo }: Props) {
  const columns: DenseColumn<Campaign>[] = [
    {
      key: 'name', label: 'Campanha',
      render: c => (
        <div>
          <p className="text-sm text-white font-medium truncate max-w-[200px]">{c.name}</p>
          <p className="text-xs text-zinc-600">{c.platform}</p>
        </div>
      ),
    },
    {
      key: 'status', label: 'Status', align: 'center',
      render: c => (
        <span className={`text-xs px-1.5 py-0.5 rounded ${
          c.status === 'ativa' ? 'bg-emerald-950/60 text-emerald-500' : 'bg-zinc-800 text-zinc-500'
        }`}>{c.status}</span>
      ),
    },
    {
      key: 'gasto_dia', label: 'Gasto', sortable: true,
      render: c => formatCurrency(c.gasto_dia),
    },
    {
      key: 'roas_confirmado', label: 'ROAS Conf.', sortable: true,
      render: c => (
        <span className={`font-bold ${c.roas_confirmado >= roasAlvo ? 'text-emerald-400' : 'text-red-400'}`}>
          {c.roas_confirmado.toFixed(2)}x
        </span>
      ),
    },
    {
      key: 'roas_projetado', label: 'ROAS Proj.',
      render: c => <span className="text-zinc-500">~{c.roas_projetado.toFixed(2)}x</span>,
    },
    {
      key: 'cpa', label: 'CPA', sortable: true,
      render: c => formatCurrency(c.cpa),
    },
    {
      key: 'vendas_confirmadas', label: 'Vendas', sortable: true,
      render: c => String(c.vendas_confirmadas),
    },
    {
      key: 'semaforo', label: 'Semáforo', align: 'center',
      render: c => <SemaforoBadge status={c.semaforo} />,
    },
  ];

  return (
    <DenseTable<Campaign>
      title="VISÃO DE DECISÃO"
      columns={columns}
      rows={campaigns}
      keyExtractor={c => c.id}
      filters={FILTERS}
      filterFn={(rows, filter) => filter ? rows.filter(r => r.semaforo === filter) : rows}
      sortFn={(rows, key, desc) => [...rows].sort((a, b) => {
        const av = a[key as keyof Campaign] as number;
        const bv = b[key as keyof Campaign] as number;
        return desc ? bv - av : av - bv;
      })}
      initialSortKey="roas_confirmado"
      emptyMessage="Nenhuma campanha encontrada."
    />
  );
}
