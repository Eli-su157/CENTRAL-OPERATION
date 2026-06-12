'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createDashboardAction } from '@/app/app/d/actions';
import type { DashboardActionState } from '@/app/app/d/actions';

interface Props {
  maxReached: boolean;
  maxDashboards: number;
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-500 hover:bg-orange-400 text-white transition-colors disabled:opacity-50"
    >
      {pending ? 'Criando...' : 'Criar'}
    </button>
  );
}

export function CreateDashboardButton({ maxReached, maxDashboards }: Props) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(
    createDashboardAction as (s: DashboardActionState, f: FormData) => Promise<DashboardActionState>,
    null
  );

  if (maxReached) {
    return (
      <span className="text-xs text-zinc-500 border border-zinc-800 px-3 py-1.5 rounded-lg">
        Limite de {maxDashboards} atingido
      </span>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {open ? (
        <form action={action} className="flex items-center gap-2">
          {state && 'error' in state && (
            <span className="text-xs text-red-400">{state.error}</span>
          )}
          <input
            name="name"
            type="text"
            required
            autoFocus
            maxLength={50}
            placeholder="Nome do produto/dashboard"
            className="bg-[#0D0D0D] border border-white/[0.08] text-white placeholder-zinc-500 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 w-52"
          />
          <SubmitBtn />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs text-zinc-500 hover:text-white px-2 py-1.5 transition-colors"
          >
            Cancelar
          </button>
        </form>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-orange-500 hover:bg-orange-400 transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Novo Dashboard
        </button>
      )}
    </div>
  );
}
