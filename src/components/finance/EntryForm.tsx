'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createEntryAction } from '@/app/app/financeiro/actions';
import type { FinanceActionState } from '@/app/app/financeiro/actions';

interface Category { name: string; direction: 'entrada' | 'saida' }
interface Dashboard { id: string; name: string }
interface Member { id: string; full_name: string }

interface Props {
  categories: Category[];
  dashboards: Dashboard[];
  members: Member[];
  onClose: () => void;
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="px-4 py-2 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-400 text-white transition-colors disabled:opacity-50">
      {pending ? 'Salvando...' : 'Salvar lançamento'}
    </button>
  );
}

const inputCls = 'w-full bg-[#0D0D0D] border border-white/[0.08] text-white placeholder-zinc-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/30';
const labelCls = 'text-xs font-medium text-zinc-400 uppercase tracking-wide';

export function EntryForm({ categories, dashboards, members, onClose }: Props) {
  const [state, action] = useActionState(
    createEntryAction as (s: FinanceActionState, f: FormData) => Promise<FinanceActionState>,
    null
  );
  const [direction, setDirection] = useState<'entrada' | 'saida'>('entrada');
  const [recurring, setRecurring] = useState(false);
  const [showCommission, setShowCommission] = useState(false);

  useEffect(() => {
    if (state && 'success' in state) onClose();
  }, [state, onClose]);

  const filteredCats = categories.filter(c => c.direction === direction);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-12 px-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
          <h2 className="text-base font-bold text-white">Novo Lançamento</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form action={action} className="px-6 py-5 flex flex-col gap-4">
          {state && 'error' in state && (
            <div className="bg-red-950 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm">
              {state.error}
            </div>
          )}

          {/* Direção */}
          <div className="flex gap-2">
            {(['entrada', 'saida'] as const).map(d => (
              <button
                key={d}
                type="button"
                onClick={() => { setDirection(d); setShowCommission(false); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  direction === d
                    ? d === 'entrada' ? 'bg-emerald-700 text-white' : 'bg-red-900 text-red-200'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {d === 'entrada' ? '+ Entrada' : '- Saída'}
              </button>
            ))}
          </div>
          <input type="hidden" name="direction" value={direction} />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Categoria *</label>
              <select
                name="category"
                required
                className={inputCls}
                onChange={e => setShowCommission(e.target.value === 'comissao')}
              >
                <option value="">Selecione...</option>
                {filteredCats.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Valor (R$) *</label>
              <input name="amount" type="number" step="0.01" min="0.01" required placeholder="0,00" className={inputCls} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Descrição</label>
            <input name="description" type="text" placeholder="Detalhe opcional" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Data *</label>
              <input name="entry_date" type="date" required className={inputCls}
                defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Status</label>
              <select name="status" defaultValue="pago" className={inputCls}>
                <option value="pago">Pago / Recebido</option>
                <option value="a_pagar">A pagar</option>
                <option value="a_receber">A receber</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Produto</label>
            <select name="dashboard_id" className={inputCls}>
              <option value="">Geral (sem produto)</option>
              {dashboards.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          {/* Comissão — pessoa vinculada (discricionária) */}
          {showCommission && members.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Pessoa (comissão)</label>
              <select name="related_user_id" className={inputCls}>
                <option value="">Selecione o beneficiário</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>
          )}

          {/* Recorrência */}
          <div className="flex flex-col gap-3 pt-3 border-t border-zinc-800">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={recurring}
                onChange={e => setRecurring(e.target.checked)}
                className="w-4 h-4 rounded bg-zinc-800 border-zinc-600 text-orange-500 focus:ring-orange-500/40"
              />
              <input type="hidden" name="recurring" value={recurring ? 'true' : 'false'} />
              <span className="text-sm text-zinc-300">Lançamento recorrente</span>
            </label>

            {recurring && (
              <div className="grid grid-cols-2 gap-4 pl-6">
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Periodicidade</label>
                  <select name="recurrence_period" className={inputCls}>
                    <option value="mensal">Mensal</option>
                    <option value="semanal">Semanal</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Até</label>
                  <input name="recurrence_end" type="date" className={inputCls} />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <SubmitBtn />
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-600 transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
