import { PRIORITY_COLORS, PRIORITY_LABELS, STATUS_LABELS, SECTOR_LABELS } from '@/lib/types/tasks';
import type { Task } from '@/lib/types/tasks';
import { TaskCard } from './TaskCard';

const today = () => new Date().toISOString().split('T')[0];

function sortMyTasks(tasks: Task[]): Task[] {
  const now = today();
  return [...tasks].sort((a, b) => {
    // Atrasadas primeiro
    const aOverdue = a.due_date && a.due_date < now && a.status !== 'concluida';
    const bOverdue = b.due_date && b.due_date < now && b.status !== 'concluida';
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    // Depois por data
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return 0;
  });
}

interface Props {
  tasks: Task[];
  currentUserId: string;
  onTaskClick: (taskId: string) => void;
}

export function MyTasksList({ tasks, currentUserId, onTaskClick }: Props) {
  const sorted = sortMyTasks(tasks);

  if (sorted.length === 0) {
    return (
      <div className="border border-dashed border-zinc-800 rounded-xl p-16 text-center">
        <p className="text-zinc-500 text-sm">Nenhuma tarefa atribuída a você.</p>
        <p className="text-zinc-700 text-xs mt-1">As tarefas criadas pelo seu gestor aparecerão aqui.</p>
      </div>
    );
  }

  const active = sorted.filter(t => t.status !== 'concluida');
  const done = sorted.filter(t => t.status === 'concluida');

  return (
    <div className="flex flex-col gap-6">
      {/* Ativas */}
      <div className="flex flex-col gap-2">
        {active.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-emerald-400 text-sm font-medium">Tudo concluído! 🎉</p>
          </div>
        )}
        {active.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            currentUserId={currentUserId}
            onClick={() => onTaskClick(task.id)}
          />
        ))}
      </div>

      {/* Concluídas */}
      {done.length > 0 && (
        <details className="group">
          <summary className="text-xs text-zinc-600 uppercase tracking-widest font-medium cursor-pointer hover:text-zinc-400 transition-colors select-none flex items-center gap-2">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-open:rotate-90 transition-transform">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Concluídas ({done.length})
          </summary>
          <div className="flex flex-col gap-2 mt-3 opacity-60">
            {done.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                currentUserId={currentUserId}
                onClick={() => onTaskClick(task.id)}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
