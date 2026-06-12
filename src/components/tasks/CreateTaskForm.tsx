'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createTaskAction } from '@/app/app/tarefas/actions';
import type { TaskActionState } from '@/app/app/tarefas/actions';
import type { TaskMember } from '@/lib/types/tasks';
import type { UserSector } from '@/lib/types/database';

const SECTORS: { value: UserSector; label: string }[] = [
  { value: 'trafego', label: 'Tráfego' },
  { value: 'edicao', label: 'Edição' },
  { value: 'dev', label: 'Dev' },
  { value: 'financeiro', label: 'Financeiro' },
];

interface Props {
  assignableMembers: TaskMember[];
  dashboards: { id: string; name: string }[];
  currentSector: UserSector | null;
  scope: 'todos' | 'meu_setor'; // só chegamos aqui se não for 'nenhum'
  onClose: () => void;
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-400 text-white transition-colors disabled:opacity-50"
    >
      {pending ? 'Criando...' : 'Criar tarefa'}
    </button>
  );
}

const inputCls =
  'w-full bg-[#0D0D0D] border border-white/[0.08] text-white placeholder-zinc-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/30';
const labelCls = 'text-xs font-medium text-zinc-400 uppercase tracking-wide';

export function CreateTaskForm({ assignableMembers, dashboards, currentSector, scope, onClose }: Props) {
  const [state, action] = useActionState(
    createTaskAction as (s: TaskActionState, f: FormData) => Promise<TaskActionState>,
    null
  );
  const [selectedSector, setSelectedSector] = useState<UserSector>(
    (scope === 'meu_setor' && currentSector) ? currentSector : 'trafego'
  );

  // Fechar ao criar com sucesso
  useEffect(() => {
    if (state && 'success' in state) {
      onClose();
    }
  }, [state, onClose]);

  // Filtrar membros por setor selecionado (se escopo = meu_setor já vem filtrado)
  const membersForSector = assignableMembers.filter(m =>
    scope === 'todos' ? m.sector === selectedSector : true
  );

  const sectorOptions = scope === 'meu_setor' && currentSector
    ? SECTORS.filter(s => s.value === currentSector)
    : SECTORS;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-16 px-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
          <h2 className="text-base font-bold text-white">Nova Tarefa</h2>
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

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Título *</label>
            <input name="title" type="text" required maxLength={200} placeholder="O que precisa ser feito?" className={inputCls} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Descrição</label>
            <textarea name="description" rows={3} placeholder="Detalhes opcionais..." className={`${inputCls} resize-none`} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Setor *</label>
              <select
                name="sector"
                value={selectedSector}
                onChange={e => setSelectedSector(e.target.value as UserSector)}
                disabled={scope === 'meu_setor'}
                className={`${inputCls} disabled:opacity-60`}
              >
                {sectorOptions.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Prioridade</label>
              <select name="priority" defaultValue="media" className={inputCls}>
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Responsável</label>
              <select name="assignee_user_id" className={inputCls}>
                <option value="">Sem responsável</option>
                {membersForSector.map(m => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Prazo</label>
              <input name="due_date" type="date" className={inputCls} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Produto</label>
            <select name="dashboard_id" className={inputCls}>
              <option value="">Geral (sem produto)</option>
              {dashboards.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <SubmitBtn />
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-600 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
