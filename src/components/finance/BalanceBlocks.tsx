import { formatCurrency } from '@/lib/utils/format';
import type { FinanceEntry } from '@/lib/finance/calc';

interface Props {
  entries: FinanceEntry[];
}

function EntryRow({ entry }: { entry: FinanceEntry }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-zinc-800/50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-200 truncate">{entry.category}</p>
        <p className="text-xs text-zinc-600">{new Date(entry.entry_date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
      </div>
      <span className={`text-sm font-semibold tabular-nums shrink-0 ml-3 ${
        entry.direction === 'entrada' ? 'text-emerald-400' : 'text-red-400'
      }`}>
        {entry.direction === 'entrada' ? '+' : '-'}{formatCurrency(entry.amount)}
      </span>
    </div>
  );
}

export function AReceberBlock({ entries }: Props) {
  const toReceive = entries
    .filter(e => e.direction === 'entrada' && e.status === 'a_receber')
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date));

  const total = toReceive.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">A Receber</p>
        <span className="text-sm font-bold text-emerald-400 tabular-nums">{formatCurrency(total)}</span>
      </div>
      {toReceive.length === 0 ? (
        <p className="text-xs text-zinc-700 py-3">Nenhum valor a receber.</p>
      ) : (
        <div className="flex flex-col max-h-48 overflow-y-auto">
          {toReceive.map(e => <EntryRow key={e.id} entry={e} />)}
        </div>
      )}
    </div>
  );
}

export function APagarBlock({ entries }: Props) {
  const toPay = entries
    .filter(e => e.direction === 'saida' && e.status === 'a_pagar')
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date));

  const total = toPay.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">A Pagar</p>
        <span className="text-sm font-bold text-red-400 tabular-nums">{formatCurrency(total)}</span>
      </div>
      {toPay.length === 0 ? (
        <p className="text-xs text-zinc-700 py-3">Nenhum compromisso a pagar.</p>
      ) : (
        <div className="flex flex-col max-h-48 overflow-y-auto">
          {toPay.map(e => <EntryRow key={e.id} entry={e} />)}
        </div>
      )}
    </div>
  );
}
