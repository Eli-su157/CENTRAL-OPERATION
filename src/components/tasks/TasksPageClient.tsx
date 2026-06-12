'use client';

import { useState, useMemo } from 'react';
import { KanbanBoard } from './KanbanBoard';
import { MyTasksList } from './MyTasksList';
import { TaskDetail } from './TaskDetail';
import { CreateTaskForm } from './CreateTaskForm';
import type { Task, TaskMember } from '@/lib/types/tasks';
import type { AssignScope } from '@/lib/auth/permissions';
import type { UserSector } from '@/lib/types/database';
import { SECTOR_LABELS } from '@/lib/types/tasks';

interface Props {
  tasks: Task[];
  members: TaskMember[];
  assignableMembers: TaskMember[];
  dashboards: { id: string; name: string }[];
  currentUserId: string;
  currentSector: UserSector | null;
  scope: AssignScope;
  canCreate: boolean;
}

type View = 'quadro' | 'minha_lista';

interface Filters {
  setor: string;
  assigneeId: string;
  dashboardId: string;
  priority: string;
}

export function TasksPageClient({
  tasks, members, assignableMembers, dashboards,
  currentUserId, currentSector, scope, canCreate,
}: Props) {
  const [view, setView] = useState<View>(scope === 'nenhum' ? 'minha_lista' : 'quadro');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    setor: '', assigneeId: '', dashboardId: '', priority: '',
  });

  const selectedTask = useMemo(
    () => tasks.find(t => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filters.setor && t.sector !== filters.setor) return false;
      if (filters.assigneeId && t.assignee_user_id !== filters.assigneeId) return false;
      if (filters.dashboardId && t.dashboard_id !== filters.dashboardId) return false;
      if (filters.priority && t.priority !== filters.priority) return false;
      return true;
    });
  }, [tasks, filters]);

  const myTasks = useMemo(
    () => filteredTasks.filter(t => t.assignee_user_id === currentUserId),
    [filteredTasks, currentUserId]
  );

  const hasFilters = filters.setor || filters.assigneeId || filters.dashboardId || filters.priority;
  const showBoard = scope !== 'nenhum';

  function clearFilters() {
    setFilters({ setor: '', assigneeId: '', dashboardId: '', priority: '' });
  }

  const selectCls = 'bg-white/[0.04] border border-white/[0.08] text-zinc-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500/40';

  return (
    <div className="relative">
      {/* Toolbar — botão Nova Tarefa alinhado com as tabs */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <div className="flex items-center gap-1 text-xs text-zinc-600">
          <span className="tabular-nums">{tasks.length}</span>
          <span>{tasks.length === 1 ? 'tarefa' : 'tarefas'}</span>
          {hasFilters && <span className="text-zinc-700">· filtros ativos</span>}
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-orange-500 hover:bg-orange-400 text-white transition-colors shrink-0"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nova Tarefa
          </button>
        )}
      </div>

      {/* Tabs */}
      {showBoard && (
        <div className="flex gap-1 bg-white/[0.04] border border-white/[0.06] rounded-lg p-1 w-fit mb-5">
          {(['quadro', 'minha_lista'] as View[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                view === v ? 'bg-white/[0.08] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {v === 'quadro' ? 'Quadro Geral' : 'Minha Lista'}
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      {view === 'quadro' && (
        <div className="flex flex-wrap items-center gap-2 mb-5 overflow-x-auto pb-1">
          {scope === 'todos' && (
            <select
              value={filters.setor}
              onChange={e => setFilters(f => ({ ...f, setor: e.target.value }))}
              className={selectCls}
            >
              <option value="">Todos os setores</option>
              {(['trafego', 'edicao', 'dev', 'financeiro'] as UserSector[]).map(s => (
                <option key={s} value={s}>{SECTOR_LABELS[s]}</option>
              ))}
            </select>
          )}
          <select
            value={filters.assigneeId}
            onChange={e => setFilters(f => ({ ...f, assigneeId: e.target.value }))}
            className={selectCls}
          >
            <option value="">Todos os responsáveis</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
          {dashboards.length > 0 && (
            <select
              value={filters.dashboardId}
              onChange={e => setFilters(f => ({ ...f, dashboardId: e.target.value }))}
              className={selectCls}
            >
              <option value="">Todos os produtos</option>
              {dashboards.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}
          <select
            value={filters.priority}
            onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}
            className={selectCls}
          >
            <option value="">Qualquer prioridade</option>
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* Views */}
      {view === 'quadro' ? (
        <KanbanBoard
          tasks={filteredTasks}
          currentUserId={currentUserId}
          onTaskClick={setSelectedTaskId}
        />
      ) : (
        <MyTasksList
          tasks={myTasks}
          currentUserId={currentUserId}
          onTaskClick={setSelectedTaskId}
        />
      )}

      {/* Task detail drawer */}
      {selectedTask && (
        <>
          <div className="fixed inset-0 bg-black/30 z-30" onClick={() => setSelectedTaskId(null)} />
          <TaskDetail
            task={selectedTask}
            currentUserId={currentUserId}
            canManage={canCreate}
            onClose={() => setSelectedTaskId(null)}
            onDelete={() => setSelectedTaskId(null)}
          />
        </>
      )}

      {/* Create task modal */}
      {showCreate && scope !== 'nenhum' && (
        <CreateTaskForm
          assignableMembers={assignableMembers}
          dashboards={dashboards}
          currentSector={currentSector}
          scope={scope}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
