import { STATUS_LABELS } from '@/lib/types/tasks';
import type { Task, TaskStatus } from '@/lib/types/tasks';
import { TaskCard } from './TaskCard';

const COLUMNS: { status: TaskStatus; color: string }[] = [
  { status: 'a_fazer', color: 'text-zinc-400' },
  { status: 'fazendo', color: 'text-blue-400' },
  { status: 'concluida', color: 'text-emerald-400' },
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
                <span className={`text-xs font-semibold uppercase tracking-widest ${col.color}`}>
                  {STATUS_LABELS[col.status]}
                </span>
              </div>
              <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">
                {colTasks.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2 flex-1">
              {colTasks.length === 0 ? (
                <div className="border border-dashed border-zinc-800 rounded-lg p-6 text-center">
                  <p className="text-xs text-zinc-700">Vazio</p>
                </div>
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
