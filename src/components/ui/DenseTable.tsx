'use client';

// DenseTable — tabela densa com sort, filtros e semáforo opcional.
// Extraído de: components/traffic/DecisaoTable.tsx
// Genérica: colunas configuráveis, status opcional, semáforo opcional.

import { useState } from 'react';
import type { ReactNode } from 'react';

export interface DenseColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  /** Renderiza a célula. Recebe a linha inteira. */
  render: (row: T) => ReactNode;
}

export interface DenseTableFilter {
  value: string;
  label: string;
}

interface Props<T> {
  title?: string;
  columns: DenseColumn<T>[];
  rows: T[];
  /** Chave única por linha */
  keyExtractor: (row: T) => string;
  /** Filtros de abas no header */
  filters?: DenseTableFilter[];
  /** Aplicado antes de ordenar */
  filterFn?: (rows: T[], filter: string) => T[];
  /** Sorteia por key */
  sortFn?: (rows: T[], key: string, desc: boolean) => T[];
  emptyMessage?: string;
  initialSortKey?: string;
  initialSortDesc?: boolean;
  /** Ação no canto direito do header */
  headerAction?: ReactNode;
}

const thCls = 'text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.08em] py-3 px-4 whitespace-nowrap';
const tdCls = 'py-3.5 px-4 text-sm text-zinc-300 tabular-nums';

export function DenseTable<T>({
  title, columns, rows, keyExtractor,
  filters, filterFn, sortFn,
  emptyMessage = 'Nenhum resultado.',
  initialSortKey, initialSortDesc = true,
  headerAction,
}: Props<T>) {
  const [sortKey, setSortKey] = useState(initialSortKey ?? '');
  const [sortDesc, setSortDesc] = useState(initialSortDesc);
  const [activeFilter, setActiveFilter] = useState(filters?.[0]?.value ?? '');

  function handleSort(key: string) {
    if (sortKey === key) setSortDesc(d => !d);
    else { setSortKey(key); setSortDesc(true); }
  }

  let processed = [...rows];
  if (filterFn && activeFilter) processed = filterFn(processed, activeFilter);
  if (sortFn && sortKey) processed = sortFn(processed, sortKey, sortDesc);

  return (
    <div className="bg-[#0f0f12] border border-white/[0.05] rounded-lg overflow-hidden">
      {(title || filters || headerAction) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05]">
          {title && (
            <p className="kpi-label">{title}</p>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {filters && (
              <div className="flex gap-1">
                {filters.map(f => (
                  <button
                    key={f.value}
                    onClick={() => setActiveFilter(f.value)}
                    className={`text-[10px] px-2 py-1 rounded-md transition-colors font-medium ${
                      activeFilter === f.value
                        ? 'bg-white/[0.08] text-zinc-200'
                        : 'text-zinc-600 hover:text-zinc-400'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
            {headerAction}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-white/[0.05]">
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`${thCls} ${col.sortable ? 'cursor-pointer hover:text-zinc-300' : ''} ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''
                  }`}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    <span className="ml-1 text-orange-400">{sortDesc ? '↓' : '↑'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#27272A]">
            {processed.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-zinc-600 text-sm">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              processed.map(row => (
                <tr key={keyExtractor(row)} className="hover:bg-white/[0.02] transition-colors">
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={`${tdCls} ${
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''
                      }`}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
