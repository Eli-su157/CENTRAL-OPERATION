'use client';

import { useState, useTransition } from 'react';
import { createResourceAction } from '@/app/app/d/[dashboardId]/dev/actions';

interface Props {
  dashboardId: string;
  onClose: () => void;
}

const inputCls = 'w-full bg-[#0D0D0D] border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/40 placeholder-zinc-600';

export function ResourceForm({ dashboardId, onClose }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createResourceAction(null, fd);
      if (result && 'error' in result) setError(result.error);
      else onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-white">Adicionar recurso</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <input type="hidden" name="dashboard_id" value={dashboardId} />
          <div className="px-5 py-4 flex flex-col gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block font-medium">Tipo *</label>
              <select name="kind" required className={inputCls + ' cursor-pointer'}>
                <option value="pagina">Página / Checkout</option>
                <option value="dominio">Domínio / Hospedagem</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block font-medium">Nome *</label>
              <input name="label" required placeholder="Ex: Página de Vendas" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block font-medium">URL *</label>
              <input name="url" required type="url" placeholder="https://..." className={inputCls} />
            </div>
            {error && (
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/60 rounded-lg px-3 py-2">{error}</p>
            )}
          </div>
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-zinc-800">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className="px-4 py-2 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-400 text-white transition-colors disabled:opacity-50">
              {isPending ? 'Salvando…' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
