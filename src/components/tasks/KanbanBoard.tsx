import { STATUS_LABELS } from '@/lib/types/tasks';
import type { Task, TaskStatus } from '@/lib/types/tasks';
import { TaskCard } from './TaskCard';
import { EmptyState } from '@/components/ui';

const COLUMNS: { status: TaskStatus; color: string; dot: string }[] = [
  { status: 'a_fazer',  color: 'text-zinc-400',   dot: 'bg-zinc-600' },
  { status: 'fazendo',  color: 'text-amber-400',   dot: 'bg-amber-400' },
  { status: 'concluida',color: 'text-emerald-400', dot: 'bg-emerald-400' },
];

const PRIORITY_ORDER: Record<string, number> = { alta: 0, media: 1, baixa: 2 };

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const pDiff = (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1);
    if (pDiff !== 0) return pDiff;
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

export function KanbanBoard({ tasks, currentUserId, onTaskClick }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {COLUMNS.map(col => {
        const colTasks = sortTasks(tasks.filter(t => t.status === col.status));
        return (
          <div key={col.status} className="flex flex-col min-h-[200px]">
            {/* Column header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
                <span className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${col.color}`}>
                  {STATUS_LABELS[col.status]}
                </span>
              </div>
              <span className="text-[10px] text-zinc-600 tabular-nums font-medium">
                {colTasks.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2 flex-1">
              {colTasks.length === 0 ? (
                <EmptyState
                  size="compact"
                  iconVariant="neutral"
                  title="Nenhuma tarefa aqui"
                  icon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="1.5" className="text-zinc-500">
                      <path d="M22 12h-6l-2 3H10l-2-3H2" />
                      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                    </svg>
                  }
                />
              ) : (
                colTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    currentUserId={currentUserId}
                    onClick={() => onTaskClick(task.id)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
