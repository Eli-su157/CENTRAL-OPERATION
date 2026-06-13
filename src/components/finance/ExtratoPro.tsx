'use client';

// ExtratoPro — extrato completo com DenseTable, paginação e ações.
// Substitui o ExtratoBlock raso. Mantém ExtratoBlock para compat.

import { useState, useMemo, useTransition } from 'react';
import { formatCurrency } from '@/lib/utils/format';
import type { FinanceEntry } from '@/lib/finance/calc';
import { deleteEntryAction } from '@/app/app/financeiro/actions';

const PAGE_SIZE = 15;

const STATUS_LABEL: Record<string, string> = {
  pago:       'Pago',
  a_pagar:    'A pagar',
  a_receber:  'A receber',
};
const STATUS_CLS: Record<string, string> = {
  pago:       'badge-neutral',
  a_pagar:    'badge-warning',
  a_receber:  'badge-positive',
};

interface Props {
  entries: FinanceEntry[];
  dashboards: { id: string; name: string }[];
  onEditEntry: (entry: FinanceEntry) => void;
}

export function ExtratoPro({ entries, dashboards, onEditEntry }: Props) {
  const [filterDir, setFilterDir]   = useState<'' | 'entrada' | 'saida'>('');
  const [filterCat, setFilterCat]   = useState('');
  const [filterDash, setFilterDash] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortKey, setSortKey]       = useState<'entry_date' | 'amount'>('entry_date');
  const [sortDesc, setSortDesc]     = useState(true);
  const [page, setPage]             = useState(1);
  const [, startTransition]         = useTransition();

  const dashMap = Object.fromEntries(dashboards.map(d => [d.id, d.name]));
  const allCats = useMemo(() => [...new Set(entries.map(e => e.category))].sort(), [entries]);

  const filtered = useMemo(() => {
    return entries
      .filter(e => {
        if (filterDir    && e.direction    !== filterDir)    return false;
        if (filterCat    && e.category     !== filterCat)    return false;
        if (filterDash   && e.dashboard_id !== filterDash)   return false;
        if (filterStatus && e.status       !== filterStatus)  return false;
        return true;
      })
      .sort((a, b) => {
        if (sortKey === 'entry_date') {
          return sortDesc
            ? b.entry_date.localeCompare(a.entry_date)
            : a.entry_date.localeCompare(b.entry_date);
        }
        return sortDesc ? b.amount - a.amount : a.amount - b.amount;
      });
  }, [entries, filterDir, filterCat, filterDash, filterStatus, sortKey, sortDesc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageEntries = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const totalEntradas = filtered.filter(e => e.direction === 'entrada').reduce((s, e) => s + e.amount, 0);
  const totalSaidas   = filtered.filter(e => e.direction === 'saida').reduce((s, e) => s + e.amount, 0);

  const selectCls = 'sel-sm';

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDesc(d => !d);
    else { setSortKey(key); setSortDesc(true); }
  }

  function handleDelete(entry: FinanceEntry) {
    if (!confirm(`Excluir lançamento "${entry.category}" — ${formatCurrency(entry.amount)}?`)) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('entryId', entry.id);
      await deleteEntryAction(null, fd);
    });
  }

  return (
    <div className="bg-[#111111] border border-white/[0.06] rounded-xl overflow-hidden">
      {/* Header + totais */}
      <div className="px-5 py-4 border-b border-white/[0.05]">
        <div className="flex items-center justify-between mb-3">
          <p className="kpi-label">Extrato de Lançamentos</p>
          <div className="flex items-center gap-4 text-xs">
            <span>Entradas <span className="text-emerald-400 num font-semibold">{formatCurrency(totalEntradas)}</span></span>
            <span>Saídas <span className="text-red-400 num font-semibold">{formatCurrency(totalSaidas)}</span></span>
            <span className="text-zinc-600">{filtered.length} lançamentos</span>
          </div>
        </div>
        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          <select value={filterDir} onChange={e => { setFilterDir(e.target.value as '' | 'entrada' | 'saida'); setPage(1); }} className={selectCls}>
            <option value="">Tipo: todos</option>
            <option value="entrada">Entradas</option>
            <option value="saida">Saídas</option>
          </select>
          <select value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(1); }} className={selectCls}>
            <option value="">Categoria: todas</option>
            {allCats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {dashboards.length > 0 && (
            <select value={filterDash} onChange={e => { setFilterDash(e.target.value); setPage(1); }} className={selectCls}>
              <option value="">Produto: todos</option>
              {dashboards.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className={selectCls}>
            <option value="">Status: todos</option>
            <option value="pago">Pago</option>
            <option value="a_pagar">A pagar</option>
            <option value="a_receber">A receber</option>
          </select>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-white/[0.05] bg-white/[0.01]">
            <tr>
              <th
                className="text-left text-[10px] font-semibold text-zinc-600 uppercase tracking-[0.1em] py-2 px-4 cursor-pointer hover:text-zinc-400 whitespace-nowrap"
                onClick={() => toggleSort('entry_date')}
              >
                Data {sortKey === 'entry_date' ? (sortDesc ? '↓' : '↑') : ''}
              </th>
              <th className="text-left text-[10px] font-semibold text-zinc-600 uppercase tracking-[0.1em] py-2 px-4">Categoria</th>
              <th className="text-left text-[10px] font-semibold text-zinc-600 uppercase tracking-[0.1em] py-2 px-4 hidden sm:table-cell">Produto</th>
              <th className="text-left text-[10px] font-semibold text-zinc-600 uppercase tracking-[0.1em] py-2 px-4">Status</th>
              <th
                className="text-right text-[10px] font-semibold text-zinc-600 uppercase tracking-[0.1em] py-2 px-4 cursor-pointer hover:text-zinc-400"
                onClick={() => toggleSort('amount')}
              >
                Valor {sortKey === 'amount' ? (sortDesc ? '↓' : '↑') : ''}
              </th>
              <th className="py-2 px-4 w-16" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {pageEntries.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-zinc-600">
                  Nenhum lançamento encontrado.
                </td>
              </tr>
            ) : (
              pageEntries.map(e => (
                <tr key={e.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-4 text-xs text-zinc-500 font-mono whitespace-nowrap">
                    {new Date(e.entry_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-2.5 px-4">
                    <p className="text-sm text-zinc-200">{e.category}</p>
                  </td>
                  <td className="py-2.5 px-4 hidden sm:table-cell">
                    <span className="text-xs text-zinc-600">
                      {e.dashboard_id ? (dashMap[e.dashboard_id] ?? '—') : 'Geral'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className={STATUS_CLS[e.status] ?? 'badge-neutral'}>
                      {STATUS_LABEL[e.status]}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <span className={`text-sm font-semibold num ${
                      e.direction === 'entrada' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {e.direction === 'entrada' ? '+' : '-'}{formatCurrency(e.amount)}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onEditEntry(e)}
                        className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors rounded"
                        title="Editar"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(e)}
                        className="p-1.5 text-zinc-700 hover:text-red-400 transition-colors rounded"
                        title="Excluir"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.05]">
          <span className="text-xs text-zinc-600">
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded text-xs text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] disabled:opacity-30 transition-all"
            >
              ← Anterior
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded text-xs text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] disabled:opacity-30 transition-all"
            >
              Próxima →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
