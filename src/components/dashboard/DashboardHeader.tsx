'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { renameDashboardAction, deleteDashboardAction } from '@/app/app/d/actions';
import type { DashboardActionState } from '@/app/app/d/actions';

interface Props {
  dashboard: { id: string; name: string };
  canManage: boolean;
}

function SaveBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-3 py-1.5 rounded-md text-xs font-semibold bg-orange-500 hover:bg-orange-400 text-white transition-colors disabled:opacity-50"
    >
      {pending ? '...' : label}
    </button>
  );
}

export function DashboardHeader({ dashboard, canManage }: Props) {
  const [mode, setMode] = useState<null | 'rename' | 'delete'>(null);
  const [renameState, renameAction] = useActionState(
    renameDashboardAction as (s: DashboardActionState, f: FormData) => Promise<DashboardActionState>,
    null
  );
  const [deleteState, deleteAction] = useActionState(
    deleteDashboardAction as (s: DashboardActionState, f: FormData) => Promise<DashboardActionState>,
    null
  );

  return (
    <div className="flex flex-wrap items-start justify-between mb-7 gap-3 anim-slide-down border-bottom-run">
      <div className="flex-1 min-w-0">
        {mode === 'rename' ? (
          <form action={renameAction} className="flex items-center gap-2">
            <input type="hidden" name="dashboardId" value={dashboard.id} />
            <input
              name="name"
              defaultValue={dashboard.name}
              autoFocus
              required
              maxLength={50}
              className="bg-white/[0.04] border border-orange-500/40 text-white rounded-lg px-3 py-1.5 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/40 w-full max-w-xs placeholder-zinc-600"
            />
            <SaveBtn label="Salvar" />
            <button type="button" onClick={() => setMode(null)}
              className="text-xs text-zinc-500 hover:text-white px-2 transition-colors">
              Cancelar
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-gradient-to-b from-orange-400 to-orange-600 rounded-full shrink-0 shadow-[0_0_12px_rgba(249,115,22,0.8)]" />
            <div>
              <h1 className="text-3xl font-black text-white leading-tight tracking-tight">{dashboard.name}</h1>
              {renameState && 'error' in renameState && (
                <p className="text-xs text-red-400 mt-1">{renameState.error}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {canManage && mode !== 'rename' && (
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setMode('rename')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-all">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Renomear
          </button>

          {mode === 'delete' ? (
            <div className="flex items-center gap-2 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-1.5">
              <span className="text-xs text-red-300">Confirmar exclusão?</span>
              <form action={deleteAction} className="flex gap-1.5">
                <input type="hidden" name="dashboardId" value={dashboard.id} />
                <SaveBtn label="Excluir" />
              </form>
              <button type="button" onClick={() => setMode(null)}
                className="text-xs text-zinc-500 hover:text-white transition-colors">
                Cancelar
              </button>
              {deleteState && 'error' in deleteState && (
                <span className="text-xs text-red-400">{deleteState.error}</span>
              )}
            </div>
          ) : (
            <button onClick={() => setMode('delete')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-red-400 bg-white/[0.03] border border-white/[0.06] hover:border-red-500/20 transition-all">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
              Excluir
            </button>
          )}
        </div>
      )}
    </div>
  );
}
