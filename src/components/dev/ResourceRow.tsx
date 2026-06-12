'use client';

import { useState, useTransition } from 'react';
import {
  STATUS_COLOR, STATUS_DOT, STATUS_LABEL,
  type MonitoredResource, type ResourceStatus,
} from '@/lib/mock/structure';
import {
  updateResourceStatusAction,
  deleteResourceAction,
} from '@/app/app/d/[dashboardId]/dev/actions';

const STATUS_CYCLE: ResourceStatus[] = ['no_ar', 'lento', 'fora', 'desconhecido'];

interface Props {
  resource: MonitoredResource;
  dashboardId: string;
  canManage: boolean;
}

export function ResourceRow({ resource, dashboardId, canManage }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState(resource.manual_note ?? '');

  function cycleStatus() {
    const idx = STATUS_CYCLE.indexOf(resource.status as ResourceStatus);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    startTransition(async () => {
      const fd = new FormData();
      fd.set('resourceId', resource.id);
      fd.set('dashboardId', dashboardId);
      fd.set('status', next);
      fd.set('manual_note', resource.manual_note ?? '');
      await updateResourceStatusAction(null, fd);
    });
  }

  function saveNote() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('resourceId', resource.id);
      fd.set('dashboardId', dashboardId);
      fd.set('status', resource.status);
      fd.set('manual_note', note);
      await updateResourceStatusAction(null, fd);
      setShowNote(false);
    });
  }

  function handleDelete() {
    if (!confirm(`Excluir "${resource.label}"?`)) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('resourceId', resource.id);
      fd.set('dashboardId', dashboardId);
      await deleteResourceAction(null, fd);
    });
  }

  return (
    <div className={`flex items-start gap-3 py-3 border-b border-zinc-800/50 last:border-0 ${isPending ? 'opacity-50' : ''}`}>
      {/* Status dot — lido do banco, atualizado pelo health-check automático */}
      <span
        className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT[resource.status]} ${resource.status === 'fora' ? 'animate-pulse' : ''}`}
        title={STATUS_LABEL[resource.status]}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-white">{resource.label}</p>
          <span className={`text-xs font-mono ${STATUS_COLOR[resource.status]}`}>
            {STATUS_LABEL[resource.status]}
          </span>
        </div>
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors font-mono truncate block"
        >
          {resource.url}
        </a>
        {resource.manual_note && (
          <p className="text-xs text-amber-500/70 mt-0.5 italic">{resource.manual_note}</p>
        )}
        {resource.last_checked_at && (
          <p className="text-xs text-zinc-700 mt-0.5">
            Verificado {new Date(resource.last_checked_at).toLocaleString('pt-BR')}
          </p>
        )}

        {/* Nota inline */}
        {showNote && canManage && (
          <div className="mt-2 flex gap-2">
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Nota manual..."
              className="flex-1 bg-[#0D0D0D] border border-white/[0.08] text-white rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500/40"
            />
            <button
              onClick={saveNote}
              disabled={isPending}
              className="text-xs px-2 py-1 bg-orange-500 hover:bg-orange-400 text-white rounded transition-colors"
            >
              Salvar
            </button>
            <button onClick={() => setShowNote(false)} className="text-xs text-zinc-500 hover:text-zinc-300">
              Cancelar
            </button>
          </div>
        )}
      </div>

      {canManage && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setShowNote(v => !v)}
            className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors"
            title="Adicionar nota"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors"
            title="Excluir"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
