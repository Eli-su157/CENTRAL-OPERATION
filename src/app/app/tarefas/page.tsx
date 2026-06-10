import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/auth/getPermissions';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { TasksPageClient } from '@/components/tasks/TasksPageClient';
import type { Task, TaskMember, TaskComment, TaskAttachment } from '@/lib/types/tasks';
import type { UserSector } from '@/lib/types/database';

export default async function TarefasPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/');

  const supabase = await createClient();
  const scope = ctx.permissions.pode_atribuir_tarefa;

  // ---- Buscar dados em paralelo ----
  const [tasksRes, membersRes, dashboardsRes] = await Promise.all([
    // Tarefas filtradas pelo scope
    (() => {
      let q = supabase
        .from('tasks')
        .select('*, task_comments(id, body, created_at, user_id), task_attachments(*)')
        .eq('operation_id', ctx.profile.operation_id)
        .order('created_at', { ascending: false });

      // Scope meu_setor: só tarefas do próprio setor
      if (scope === 'meu_setor' && ctx.profile.sector) {
        q = q.eq('sector', ctx.profile.sector);
      }
      // Scope nenhum: só tarefas atribuídas a si
      if (scope === 'nenhum') {
        q = q.eq('assignee_user_id', ctx.userId);
      }
      return q;
    })(),
    // Todos os membros da operação
    supabase
      .from('profiles')
      .select('id, full_name, email, role, sector')
      .eq('operation_id', ctx.profile.operation_id)
      .order('full_name'),
    // Dashboards da operação
    supabase
      .from('dashboards')
      .select('id, name')
      .eq('operation_id', ctx.profile.operation_id)
      .order('created_at'),
  ]);

  const rawTasks = tasksRes.data ?? [];
  const allMembers: TaskMember[] = (membersRes.data ?? []).map(m => ({
    id: m.id,
    full_name: m.full_name,
    email: m.email,
    role: m.role,
    sector: m.sector as UserSector | null,
  }));
  const dashboards = dashboardsRes.data ?? [];

  // Mapa de membros para lookups eficientes
  const membersMap = Object.fromEntries(allMembers.map(m => [m.id, m]));

  // Montar tarefas com relações (join em JS)
  const tasks: Task[] = rawTasks.map(t => ({
    id: t.id,
    operation_id: t.operation_id,
    dashboard_id: t.dashboard_id,
    title: t.title,
    description: t.description,
    assignee_user_id: t.assignee_user_id,
    sector: t.sector as UserSector,
    priority: t.priority as Task['priority'],
    due_date: t.due_date,
    status: t.status as Task['status'],
    created_by_user_id: t.created_by_user_id,
    created_at: t.created_at,
    updated_at: t.updated_at,
    assignee: t.assignee_user_id ? (membersMap[t.assignee_user_id] ?? null) : null,
    creator: membersMap[t.created_by_user_id] ?? null,
    dashboard: t.dashboard_id ? (dashboards.find(d => d.id === t.dashboard_id) ?? null) : null,
    task_comments: ((t.task_comments ?? []) as TaskComment[]).map(c => ({
      ...c,
      commenter: membersMap[c.user_id] ?? null,
    })),
    task_attachments: (t.task_attachments ?? []) as TaskAttachment[],
  }));

  // Signed URLs para anexos de arquivo (bucket privado).
  // O admin client gera as URLs após a verificação de acesso já feita acima.
  const filePaths = tasks
    .flatMap(t => t.task_attachments)
    .filter(a => a.type === 'arquivo')
    .map(a => a.url);

  if (filePaths.length > 0) {
    const admin = createAdminClient();
    const { data: signedData } = await admin.storage
      .from('task-attachments')
      .createSignedUrls(filePaths, 3600); // expira em 1 hora

    const signedMap: Record<string, string> = {};
    for (const item of signedData ?? []) {
      if (!item.error && item.signedUrl && item.path) {
        signedMap[item.path] = item.signedUrl;
      }
    }
    // Substitui o path armazenado pela signed URL antes de passar ao client
    for (const task of tasks) {
      for (const att of task.task_attachments) {
        if (att.type === 'arquivo' && signedMap[att.url]) {
          att.url = signedMap[att.url];
        }
      }
    }
  }

  // Membros que o usuário atual pode atribuir (respeita scope)
  const assignableMembers =
    scope === 'todos'
      ? allMembers
      : scope === 'meu_setor' && ctx.profile.sector
      ? allMembers.filter(m => m.sector === ctx.profile.sector)
      : [];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <TasksPageClient
        tasks={tasks}
        members={allMembers}
        assignableMembers={assignableMembers}
        dashboards={dashboards}
        currentUserId={ctx.userId}
        currentSector={ctx.profile.sector as UserSector | null}
        scope={scope}
        canCreate={scope !== 'nenhum'}
      />
    </div>
  );
}
