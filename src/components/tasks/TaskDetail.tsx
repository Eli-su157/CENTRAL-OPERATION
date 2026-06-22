'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import {
  updateTaskStatusAction,
  addCommentAction,
  deleteCommentAction,
  addAttachmentAction,
  deleteTaskAction,
} from '@/app/app/tarefas/actions';
import type { TaskActionState } from '@/app/app/tarefas/actions';
import type { Task, TaskStatus } from '@/lib/types/tasks';
import {
  PRIORITY_COLORS, PRIORITY_LABELS, STATUS_LABELS, SECTOR_LABELS, STATUS_NEXT, STATUS_PREV,
} from '@/lib/types/tasks';
import { createClient } from '@/lib/supabase/client';

function Btn({ label, className = '' }: { label: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-50`}>
      {pending ? '...' : label}
    </button>
  );
}

interface Props {
  task: Task;
  currentUserId: string;
  canManage: boolean; // pode_atribuir_tarefa !== 'nenhum' && is creator/head/dono
  onClose: () => void;
  onDelete: () => void;
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isOverdue(task: Task) {
  if (!task.due_date || task.status === 'concluida') return false;
  return task.due_date < new Date().toISOString().split('T')[0];
}

export function TaskDetail({ task, currentUserId, canManage, onClose, onDelete }: Props) {
  const overdue = isOverdue(task);
  const canChangeStatus =
    task.assignee_user_id === currentUserId ||
    task.created_by_user_id === currentUserId ||
    canManage;

  const nextStatus = STATUS_NEXT[task.status];
  const prevStatus = STATUS_PREV[task.status];

  const [statusState, statusAction] = useActionState(
    updateTaskStatusAction as (s: TaskActionState, f: FormData) => Promise<TaskActionState>,
    null
  );
  const [commentState, commentAction] = useActionState(
    addCommentAction as (s: TaskActionState, f: FormData) => Promise<TaskActionState>,
    null
  );
  const [attachState, attachAction] = useActionState(
    addAttachmentAction as (s: TaskActionState, f: FormData) => Promise<TaskActionState>,
    null
  );
  const [deleteState, deleteAction] = useActionState(
    deleteTaskAction as (s: TaskActionState, f: FormData) => Promise<TaskActionState>,
    null
  );

  const commentRef = useRef<HTMLTextAreaElement>(null);

  // Reset comment textarea after success
  useEffect(() => {
    if (commentState && 'success' in commentState && commentRef.current) {
      commentRef.current.value = '';
    }
  }, [commentState]);

  // Close on successful delete
  useEffect(() => {
    if (deleteState && 'success' in deleteState) {
      onDelete();
    }
  }, [deleteState, onDelete]);

  // File upload via Supabase Storage (browser client, bucket PRIVADO).
  // Armazenamos o storage PATH (não URL pública) — a URL de acesso é
  // gerada no servidor como signed URL temporária ao carregar a página.
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const supabase = createClient();
    const safeName = file.name
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${task.id}/${Date.now()}-${safeName}`;
    const { data, error } = await supabase.storage.from('task-attachments').upload(path, file);
    if (error || !data) { alert('Erro ao fazer upload.'); return; }
    // Salva o path (não URL pública) — o server gera signed URL ao buscar
    const fd = new FormData();
    fd.set('taskId', task.id);
    fd.set('url', data.path);   // path = '{task_id}/{timestamp}-{filename}'
    fd.set('label', file.name);
    fd.set('type', 'arquivo');
    await addAttachmentAction(null, fd);
    e.target.value = '';
  }

  const inputCls = 'w-full bg-[#0D0D0D] border border-white/[0.08] text-white placeholder-zinc-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/30';

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[500px] bg-zinc-900 border-l border-zinc-800 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[task.priority]}`} />
          <span className="text-xs text-zinc-500">{PRIORITY_LABELS[task.priority]}</span>
          <span className="text-zinc-700">·</span>
          <span className="text-xs text-zinc-500">{SECTOR_LABELS[task.sector] ?? task.sector}</span>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-1">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
        {/* Title + status */}
        <div>
          <h2 className="text-lg font-bold text-white leading-snug mb-3">{task.title}</h2>

          {/* Status change */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
              task.status === 'concluida'
                ? 'bg-emerald-950 border-emerald-800 text-emerald-400'
                : task.status === 'fazendo'
                ? 'bg-blue-950 border-blue-800 text-blue-400'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}>
              {STATUS_LABELS[task.status]}
            </span>

            {canChangeStatus && (
              <>
                {prevStatus && (
                  <form action={statusAction}>
                    <input type="hidden" name="taskId" value={task.id} />
                    <input type="hidden" name="status" value={prevStatus} />
                    <Btn
                      label={`← ${STATUS_LABELS[prevStatus]}`}
                      className="text-xs text-zinc-500 hover:text-white px-2 py-1 rounded border border-zinc-800 hover:border-zinc-600 transition-colors"
                    />
                  </form>
                )}
                {nextStatus && (
                  <form action={statusAction}>
                    <input type="hidden" name="taskId" value={task.id} />
                    <input type="hidden" name="status" value={nextStatus} />
                    <Btn
                      label={`${STATUS_LABELS[nextStatus]} →`}
                      className="text-xs link-action px-2 py-1 rounded border border-zinc-800 hover:border-zinc-700 transition-colors"
                    />
                  </form>
                )}
              </>
            )}
          </div>
          {statusState && 'error' in statusState && (
            <p className="text-xs text-red-400 mt-1">{statusState.error}</p>
          )}
        </div>

        {/* Description */}
        {task.description && (
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1.5">Descrição</p>
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{task.description}</p>
          </div>
        )}

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-3 py-4 border-y border-zinc-800">
          <MetaItem label="Responsável" value={task.assignee?.full_name ?? '—'} />
          <MetaItem label="Criado por" value={task.creator?.full_name ?? '—'} />
          <MetaItem label="Prazo" value={task.due_date ? formatDate(task.due_date) : '—'} valueClass={overdue ? 'text-red-400' : undefined} />
          <MetaItem label="Produto" value={task.dashboard?.name ?? 'Geral'} />
        </div>

        {/* Attachments */}
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Anexos</p>

          {task.task_attachments.length > 0 && (
            <div className="flex flex-col gap-2 mb-3">
              {task.task_attachments.map(a => (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors group"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500 shrink-0">
                    {a.type === 'arquivo'
                      ? <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      : <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />}
                  </svg>
                  <span className="text-xs text-zinc-300 truncate flex-1">{a.label}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-600 group-hover:text-zinc-400 shrink-0">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              ))}
            </div>
          )}

          {/* Add link */}
          <form action={attachAction} className="flex flex-col gap-2">
            <input type="hidden" name="taskId" value={task.id} />
            <input type="hidden" name="type" value="link" />
            <input name="url" type="url" placeholder="https://..." className={inputCls} />
            <div className="flex gap-2">
              <input name="label" placeholder="Descrição do link" className={`${inputCls} flex-1`} />
              <Btn label="Adicionar" className="px-3 py-2 rounded-lg text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-white transition-colors shrink-0" />
            </div>
            {attachState && 'error' in attachState && (
              <p className="text-xs text-red-400">{attachState.error}</p>
            )}
          </form>

          {/* File upload */}
          <label className="flex items-center gap-2 mt-2 text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Fazer upload de arquivo
            <input type="file" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>

        {/* Comments */}
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">
            Comentários ({task.task_comments.length})
          </p>

          <div className="flex flex-col gap-3 mb-4">
            {task.task_comments.map(c => (
              <div key={c.id} className="flex gap-2.5">
                <span className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0 mt-0.5">
                  {c.commenter?.full_name?.[0]?.toUpperCase() ?? '?'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-zinc-300">
                      {c.commenter?.full_name ?? 'Usuário'}
                    </span>
                    <span className="text-xs text-zinc-600">
                      {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">{c.body}</p>
                </div>
              </div>
            ))}
          </div>

          <form action={commentAction} className="flex flex-col gap-2">
            <input type="hidden" name="taskId" value={task.id} />
            <textarea
              ref={commentRef}
              name="body"
              rows={2}
              required
              placeholder="Escreva um comentário..."
              className={`${inputCls} resize-none`}
            />
            {commentState && 'error' in commentState && (
              <p className="text-xs text-red-400">{commentState.error}</p>
            )}
            <Btn
              label="Comentar"
              className="self-start px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-500 hover:bg-orange-400 text-white transition-colors"
            />
          </form>
        </div>
      </div>

      {/* Footer: delete */}
      {(task.created_by_user_id === currentUserId || canManage) && (
        <div className="border-t border-zinc-800 px-5 py-3 shrink-0">
          <form action={deleteAction}>
            <input type="hidden" name="taskId" value={task.id} />
            {deleteState && 'error' in deleteState && (
              <p className="text-xs text-red-400 mb-1">{deleteState.error}</p>
            )}
            <Btn
              label="Excluir tarefa"
              className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
            />
          </form>
        </div>
      )}
    </div>
  );
}

function MetaItem({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <p className="text-xs text-zinc-600 mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${valueClass ?? 'text-zinc-300'}`}>{value}</p>
    </div>
  );
}
