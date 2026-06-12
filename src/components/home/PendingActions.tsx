'use client';

import { useState, useTransition } from 'react';
import { confirmPendingActionAction, dismissPendingActionAction } from '@/app/app/notifications/actions';

export interface PendingActionItem {
  id: string;
  type: string;
  title: string;
  description: string | null;
  link: string | null;
  target_sector: string | null;
  target_role: string | null;
  created_at: string;
}

const TYPE_ICON: Record<string, string> = {
  criar_tarefa:           '✅',
  reconectar_plataforma:  '🔌',
  investigar_reembolso:   '🔍',
};

interface Props {
  actions: PendingActionItem[];
}

function ActionRow({ action }: { action: PendingActionItem }) {
  const [, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  if (done) return null;

  function handleConfirm() {
    startTransition(async () => {
      await confirmPendingActionAction(action.id);
      setDone(true);
    });
  }

  function handleDismiss() {
    startTransition(async () => {
      await dismissPendingActionAction(action.id);
      setDone(true);
    });
  }

  return (
    <div className="flex items-start gap-3 px-5 py-4 border-b border-white/[0.04] last:border-0">
      <span className="text-sm shrink-0 mt-0.5">{TYPE_ICON[action.type] ?? '📌'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-zinc-200 leading-tight">{action.title}</p>
        {action.description && (
          <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">{action.description}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleConfirm}
          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 transition-all"
        >
          Confirmar
        </button>
        <button
          onClick={handleDismiss}
          className="px-2 py-1.5 rounded-lg text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          Ignorar
        </button>
      </div>
    </div>
  );
}

export function PendingActions({ actions }: Props) {
  if (actions.length === 0) return null;

  return (
    <div className="relative bg-[#161616] border border-orange-500/20 rounded-xl overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />
      <div className="px-5 py-4 border-b border-white/[0.04] flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
        <p className="text-[10px] font-semibold text-orange-400 uppercase tracking-[0.1em]">
          Ações Sugeridas ({actions.length})
        </p>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {actions.map(action => (
          <ActionRow key={action.id} action={action} />
        ))}
      </div>
    </div>
  );
}
