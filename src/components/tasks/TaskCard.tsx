import { PRIORITY_COLORS, PRIORITY_LABELS, SECTOR_LABELS } from '@/lib/types/tasks';
import type { Task } from '@/lib/types/tasks';

interface Props {
  task: Task;
  currentUserId: string;
  onClick: () => void;
}

function isOverdue(task: Task): boolean {
  if (!task.due_date || task.status === 'concluida') return false;
  return task.due_date < new Date().toISOString().split('T')[0];
}

function formatDueDate(due: string): string {
  const d = new Date(due + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function TaskCard({ task, currentUserId, onClick }: Props) {
  const overdue = isOverdue(task);
  const isAssignee = task.assignee_user_id === currentUserId;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-[#0f0f12] hover:bg-[#141414] border rounded-lg p-3.5 transition-all duration-150 group ${
        overdue ? 'border-red-900/50 hover:border-red-800/70' : 'border-white/[0.06] hover:border-white/[0.10]'
      }`}
    >
      {/* Priority + sector */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority]}`} />
        <span className="text-xs text-zinc-500">{SECTOR_LABELS[task.sector] ?? task.sector}</span>
        {task.dashboard && (
          <>
            <span className="text-zinc-700">·</span>
            <span className="text-xs text-zinc-600 truncate">{task.dashboard.name}</span>
          </>
        )}
      </div>

      {/* Title */}
      <p className="text-sm text-zinc-200 font-medium leading-snug mb-2.5 line-clamp-2 group-hover:text-white transition-colors">
        {task.title}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {task.assignee ? (
            <>
              <span className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0">
                {task.assignee.full_name[0]?.toUpperCase()}
              </span>
              <span className={`text-xs truncate ${isAssignee ? 'text-orange-400' : 'text-zinc-500'}`}>
                {isAssignee ? 'Você' : task.assignee.full_name.split(' ')[0]}
              </span>
            </>
          ) : (
            <span className="text-xs text-zinc-600 italic">Sem responsável</span>
          )}
        </div>

        {task.due_date && (
          <div className={`flex items-center gap-1 shrink-0 ${overdue ? 'text-red-400' : 'text-zinc-500'}`}>
            {overdue && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
            <span className="text-xs">{formatDueDate(task.due_date)}</span>
          </div>
        )}
      </div>

      {/* Comments/attachments indicators */}
      {(task.task_comments.length > 0 || task.task_attachments.length > 0) && (
        <div className="flex gap-2.5 mt-2 pt-2 border-t border-zinc-700/30">
          {task.task_comments.length > 0 && (
            <span className="text-xs text-zinc-600 flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {task.task_comments.length}
            </span>
          )}
          {task.task_attachments.length > 0 && (
            <span className="text-xs text-zinc-600 flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              {task.task_attachments.length}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
