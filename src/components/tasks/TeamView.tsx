'use client';

// TeamView — visão "Equipe Agora": uma linha por pessoa com suas tarefas abertas.
// O dono bate o olho e vê a operação inteira trabalhando.
// Fonte: tasks + members já em memória no TasksPageClient — sem novas queries.

import { useState, useMemo } from 'react';
import type { Task, TaskMember } from '@/lib/types/tasks';
import { SECTOR_LABELS, PRIORITY_COLORS } from '@/lib/types/tasks';
import type { UserRole } from '@/lib/types/database';

interface Props {
  tasks: Task[];
  members: TaskMember[];
  currentUserId: string;
  onTaskClick: (taskId: string) => void;
}

const today = new Date().toISOString().split('T')[0];

function isOverdue(task: Task): boolean {
  return !!task.due_date && task.due_date < today && task.status !== 'concluida';
}

function formatDue(due: string): string {
  const d = new Date(due + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

const roleBadge: Record<UserRole, string> = {
  dono:     'bg-orange-500/10 text-orange-400',
  head:     'bg-blue-500/10 text-blue-400',
  lider:    'bg-emerald-500/10 text-emerald-400',
  executor: 'bg-zinc-800 text-zinc-500',
};

function TaskChip({ task, onClick }: { task: Task; onClick: () => void }) {
  const overdue = isOverdue(task);
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left w-full max-w-xs transition-colors ${
        overdue
          ? 'bg-red-950/40 border border-red-900/50 hover:border-red-800/70'
          : 'bg-[#0f0f12] border border-white/[0.06] hover:border-white/[0.10]'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority]}`} />
      <span className={`text-xs truncate flex-1 ${overdue ? 'text-red-300' : 'text-zinc-300'}`}>
        {task.title}
      </span>
      {task.due_date && (
        <span className={`text-[10px] shrink-0 ${overdue ? 'text-red-500' : 'text-zinc-600'}`}>
          {formatDue(task.due_date)}
        </span>
      )}
    </button>
  );
}

function MemberRow({
  member, fazendo, a_fazer, atrasadas, onTaskClick,
}: {
  member: TaskMember;
  fazendo: Task[];
  a_fazer: Task[];
  atrasadas: Task[];
  onTaskClick: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const total = fazendo.length + a_fazer.length;
  const hasAny = total > 0 || atrasadas.length > 0;

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${
      atrasadas.length > 0
        ? 'border-red-900/40 bg-[#0f0f12]'
        : 'border-white/[0.06] bg-[#0f0f12]'
    }`}>
      {/* Linha de resumo — sempre visível */}
      <button
        onClick={() => hasAny && setExpanded(e => !e)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
          hasAny ? 'hover:bg-white/[0.02]' : ''
        }`}
      >
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white ${
          atrasadas.length > 0 ? 'bg-red-900/60' : 'bg-zinc-700'
        }`}>
          {member.full_name[0]?.toUpperCase()}
        </div>

        {/* Nome + badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-zinc-200 truncate">{member.full_name}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-px rounded ${roleBadge[member.role as UserRole] ?? 'bg-zinc-800 text-zinc-500'}`}>
              {member.role}
            </span>
            {member.sector && (
              <span className="text-[10px] text-zinc-600">{SECTOR_LABELS[member.sector]}</span>
            )}
          </div>
        </div>

        {/* Contadores */}
        <div className="flex items-center gap-2 shrink-0">
          {atrasadas.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-950/50 border border-red-900/50 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {atrasadas.length} atrasada{atrasadas.length > 1 ? 's' : ''}
            </span>
          )}
          {fazendo.length > 0 && (
            <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/15 px-2 py-0.5 rounded-full">
              {fazendo.length} fazendo
            </span>
          )}
          {a_fazer.length > 0 && (
            <span className="text-[10px] text-zinc-500 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">
              {a_fazer.length} a fazer
            </span>
          )}
          {!hasAny && (
            <span className="text-[10px] text-zinc-700">sem tarefas abertas</span>
          )}
          {hasAny && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className={`text-zinc-600 transition-transform ${expanded ? 'rotate-180' : ''}`}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
        </div>
      </button>

      {/* Detalhe expandido */}
      {expanded && hasAny && (
        <div className="border-t border-white/[0.04] px-4 py-3 bg-white/[0.01]">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Atrasadas */}
            {atrasadas.length > 0 && (
              <div>
                <p className="text-[10px] text-red-500 uppercase tracking-[0.1em] font-semibold mb-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  Atrasadas
                </p>
                <div className="flex flex-col gap-1.5">
                  {atrasadas.map(t => (
                    <TaskChip key={t.id} task={t} onClick={() => onTaskClick(t.id)} />
                  ))}
                </div>
              </div>
            )}
            {/* Fazendo */}
            {fazendo.length > 0 && (
              <div>
                <p className="text-[10px] text-amber-400 uppercase tracking-[0.1em] font-semibold mb-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Fazendo
                </p>
                <div className="flex flex-col gap-1.5">
                  {fazendo.map(t => (
                    <TaskChip key={t.id} task={t} onClick={() => onTaskClick(t.id)} />
                  ))}
                </div>
              </div>
            )}
            {/* A fazer */}
            {a_fazer.length > 0 && (
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-[0.1em] font-semibold mb-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                  A fazer
                </p>
                <div className="flex flex-col gap-1.5">
                  {a_fazer.slice(0, 5).map(t => (
                    <TaskChip key={t.id} task={t} onClick={() => onTaskClick(t.id)} />
                  ))}
                  {a_fazer.length > 5 && (
                    <p className="text-[10px] text-zinc-700">+ {a_fazer.length - 5} mais</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function TeamView({ tasks, members, currentUserId, onTaskClick }: Props) {
  // Agrupa tarefas por assignee
  const memberRows = useMemo(() => {
    return members.map(m => {
      const mine = tasks.filter(t => t.assignee_user_id === m.id);
      return {
        member: m,
        atrasadas: mine.filter(t => isOverdue(t)),
        fazendo:   mine.filter(t => t.status === 'fazendo' && !isOverdue(t)),
        a_fazer:   mine.filter(t => t.status === 'a_fazer'  && !isOverdue(t)),
      };
    });
  }, [tasks, members]);

  // Ordena: com atrasadas > com tarefas > sem tarefas; currentUser primeiro
  const sorted = useMemo(() => {
    return [...memberRows].sort((a, b) => {
      if (a.member.id === currentUserId) return -1;
      if (b.member.id === currentUserId) return 1;
      const aAtrasadas = a.atrasadas.length;
      const bAtrasadas = b.atrasadas.length;
      if (aAtrasadas !== bAtrasadas) return bAtrasadas - aAtrasadas;
      const aTotal = a.fazendo.length + a.a_fazer.length;
      const bTotal = b.fazendo.length + b.a_fazer.length;
      return bTotal - aTotal;
    });
  }, [memberRows, currentUserId]);

  const totalAtrasadas = memberRows.reduce((s, r) => s + r.atrasadas.length, 0);
  const totalFazendo   = memberRows.reduce((s, r) => s + r.fazendo.length, 0);
  const totalAFazer    = memberRows.reduce((s, r) => s + r.a_fazer.length, 0);

  return (
    <div>
      {/* Resumo da operação */}
      <div className="flex items-center gap-4 mb-4 p-3 bg-[#0f0f12] border border-white/[0.06] rounded-lg">
        {totalAtrasadas > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-red-400">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span className="font-semibold">{totalAtrasadas}</span> atrasadas
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span className="font-semibold">{totalFazendo}</span> em andamento
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
          <span className="font-semibold">{totalAFazer}</span> a fazer
        </div>
        <span className="text-[10px] text-zinc-700 ml-auto">{members.length} pessoas</span>
      </div>

      {/* Linhas por pessoa */}
      <div className="flex flex-col gap-2">
        {sorted.map(row => (
          <MemberRow
            key={row.member.id}
            member={row.member}
            fazendo={row.fazendo}
            a_fazer={row.a_fazer}
            atrasadas={row.atrasadas}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
    </div>
  );
}
