'use client';

import { useState, useMemo } from 'react';
import { formatCurrency } from '@/lib/utils/format';
import type { FinanceEntry } from '@/lib/finance/calc';

interface Props {
  entries: FinanceEntry[];
  categories: string[];
}

export function ExtratoBlock({ entries, categories }: Props) {
  const [filterDir, setFilterDir] = useState<'' | 'entrada' | 'saida'>('');
  const [filterCat, setFilterCat] = useState('');

  const filtered = useMemo(() => {
    return entries
      .filter(e => {
        if (filterDir && e.direction !== filterDir) return false;
        if (filterCat && e.category !== filterCat) return false;
        return true;
      })
      .sort((a, b) => b.entry_date.localeCompare(a.entry_date));
  }, [entries, filterDir, filterCat]);

  const totalEntradas = filtered.filter(e => e.direction === 'entrada').reduce((s, e) => s + e.amount, 0);
  const totalSaidas   = filtered.filter(e => e.direction === 'saida').reduce((s, e) => s + e.amount, 0);

  const selectCls = 'bg-[#0D0D0D] border border-white/[0.08] text-zinc-300 rounded-md px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500/40';

  const statusLabel: Record<string, string> = {
    pago: 'Pago', a_pagar: 'A pagar', a_receber: 'A receber',
  };
  const statusColor: Record<string, string> = {
    pago: 'text-zinc-500', a_pagar: 'text-amber-400', a_receber: 'text-blue-400',
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Extrato</p>
        <div className="flex gap-2">
          <select value={filterDir} onChange={e => setFilterDir(e.target.value as '' | 'entrada' | 'saida')} className={selectCls}>
            <option value="">Todos</option>
            <option value="entrada">Entradas</option>
            <option value="saida">Saídas</option>
          </select>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className={selectCls}>
            <option value="">Categorias</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Totais filtrados */}
      <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-zinc-800">
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">Entradas</p>
          <p className="text-sm font-bold text-emerald-400 tabular-nums">{formatCurrency(totalEntradas)}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">Saídas</p>
          <p className="text-sm font-bold text-red-400 tabular-nums">{formatCurrency(totalSaidas)}</p>
        </div>
      </div>

      {/* Lista */}
      <div className="flex flex-col max-h-64 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-xs text-zinc-700 py-3">Nenhum lançamento encontrado.</p>
        ) : (
          filtered.map(e => (
            <div key={e.id} className="flex items-start justify-between py-2.5 border-b border-zinc-800/40 last:border-0 gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-200 truncate">{e.category}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-zinc-600">{e.category}</span>
                  <span className="text-zinc-700">·</span>
                  <span className="text-xs text-zinc-600">
                    {new Date(e.entry_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </span>
                  <span className={`text-xs ${statusColor[e.status]}`}>
                    {statusLabel[e.status]}
                  </span>
                </div>
              </div>
              <span className={`text-sm font-semibold tabular-nums shrink-0 ${
                e.direction === 'entrada' ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {e.direction === 'entrada' ? '+' : '-'}{formatCurrency(e.amount)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
