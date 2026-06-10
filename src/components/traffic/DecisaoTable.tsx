'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils/format';
import type { Campaign, CampaignSemaphore } from '@/lib/mock/traffic';

interface Props {
  campaigns: Campaign[];
  roasAlvo: number;
}

type SortKey = 'roas_confirmado' | 'cpa' | 'gasto_dia' | 'vendas_confirmadas';

const semaforo: Record<CampaignSemaphore, { dot: string; label: string; bg: string }> = {
  escalar:  { dot: 'bg-emerald-400', label: 'Escalar',  bg: 'bg-emerald-950/40 border-emerald-800/30' },
  observar: { dot: 'bg-amber-400',   label: 'Observar', bg: 'bg-amber-950/30 border-amber-800/20' },
  matar:    { dot: 'bg-red-500',     label: 'Matar',    bg: 'bg-red-950/40 border-red-800/30' },
};

function Semaforo({ status }: { status: CampaignSemaphore }) {
  const s = semaforo[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${s.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export function DecisaoTable({ campaigns, roasAlvo }: Props) {
  const [sort, setSort] = useState<SortKey>('roas_confirmado');
  const [desc, setDesc] = useState(true);
  const [filter, setFilter] = useState<CampaignSemaphore | ''>('');

  const sorted = [...campaigns]
    .filter(c => !filter || c.semaforo === filter)
    .sort((a, b) => {
      const av = a[sort] as number;
      const bv = b[sort] as number;
      return desc ? bv - av : av - bv;
    });

  function toggleSort(key: SortKey) {
    if (sort === key) setDesc(d => !d);
    else { setSort(key); setDesc(true); }
  }

  const thCls = 'text-left text-xs font-medium text-zinc-500 uppercase tracking-wider py-2 px-3 cursor-pointer hover:text-zinc-300 whitespace-nowrap';
  const tdCls = 'py-2.5 px-3 text-sm text-zinc-300 tabular-nums';

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Visão de Decisão</p>
        <div className="flex gap-1">
          {(['', 'escalar', 'observar', 'matar'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-2 py-1 rounded-md transition-colors ${
                filter === f ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}>
              {f === '' ? 'Todas' : semaforo[f as CampaignSemaphore].label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-zinc-800">
            <tr>
              <th className={thCls}>Campanha</th>
              <th className={`${thCls} text-center`}>Status</th>
              <th className={thCls} onClick={() => toggleSort('gasto_dia')}>
                Gasto {sort === 'gasto_dia' ? (desc ? '↓' : '↑') : ''}
              </th>
              <th className={thCls} onClick={() => toggleSort('roas_confirmado')}>
                ROAS Conf. {sort === 'roas_confirmado' ? (desc ? '↓' : '↑') : ''}
              </th>
              <th className={thCls}>ROAS Proj.</th>
              <th className={thCls} onClick={() => toggleSort('cpa')}>
                CPA {sort === 'cpa' ? (desc ? '↓' : '↑') : ''}
              </th>
              <th className={thCls} onClick={() => toggleSort('vendas_confirmadas')}>
                Vendas {sort === 'vendas_confirmadas' ? (desc ? '↓' : '↑') : ''}
              </th>
              <th className={`${thCls} text-center`}>Semáforo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {sorted.map(c => {
              const roasOk = c.roas_confirmado >= roasAlvo;
              return (
                <tr key={c.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="py-2.5 px-3">
                    <p className="text-sm text-white font-medium truncate max-w-[220px]">{c.name}</p>
                    <p className="text-xs text-zinc-600">{c.platform}</p>
                  </td>
                  <td className={`${tdCls} text-center`}>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${c.status === 'ativa' ? 'bg-emerald-950 text-emerald-500' : 'bg-zinc-800 text-zinc-500'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className={tdCls}>{formatCurrency(c.gasto_dia)}</td>
                  <td className={`${tdCls} font-bold ${roasOk ? 'text-emerald-400' : 'text-red-400'}`}>
                    {c.roas_confirmado.toFixed(2)}x
                  </td>
                  <td className="py-2.5 px-3 text-sm text-zinc-500 tabular-nums">
                    ~{c.roas_projetado.toFixed(2)}x
                  </td>
                  <td className={tdCls}>{formatCurrency(c.cpa)}</td>
                  <td className={tdCls}>{c.vendas_confirmadas}</td>
                  <td className="py-2.5 px-3 text-center">
                    <Semaforo status={c.semaforo} />
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-zinc-600 text-sm">
                  Nenhuma campanha encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
