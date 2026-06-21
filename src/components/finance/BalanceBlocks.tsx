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
    <div className="bg-[#0c0c0f] border border-emerald-500/20 rounded-2xl p-5 anim-slide-up line-sweep-emerald shadow-[0_0_30px_-10px_rgba(52,211,153,0.12)] overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="dot-live absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          <p className="text-xs font-bold text-emerald-400/80 uppercase tracking-widest font-mono">A Receber</p>
        </div>
        <span className="text-lg font-black text-emerald-400 tabular-nums num">{formatCurrency(total)}</span>
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
    <div className="bg-[#0c0c0f] border border-red-500/20 rounded-2xl p-5 anim-slide-up line-sweep-brand shadow-[0_0_30px_-10px_rgba(248,113,113,0.10)] overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold text-red-400/80 uppercase tracking-widest font-mono">A Pagar</p>
        <span className="text-lg font-black text-red-400 tabular-nums num">{formatCurrency(total)}</span>
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
