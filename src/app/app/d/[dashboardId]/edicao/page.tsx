import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/auth/getPermissions';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { TasksPageClient } from '@/components/tasks/TasksPageClient';
import { MaterialsLibraryClient } from '@/components/materials/MaterialsLibraryClient';
import type { Task, TaskMember, TaskComment, TaskAttachment } from '@/lib/types/tasks';
import type { UserSector, MaterialType, MaterialStatus, MaterialStorageKind } from '@/lib/types/database';
import type { MaterialData } from '@/components/materials/MaterialCard';
import {
  fetchAdPerformance,
  computeMaterialPerformance,
  getAvailableAds,
  type RealMaterialPerformance,
} from '@/lib/materials/performance';
import { monthStart, monthEnd } from '@/lib/finance/calc';
import { Breadcrumb } from '@/components/layout/Breadcrumb';

interface Props {
  params: Promise<{ dashboardId: string }>;
}

interface RawMember { id: string; full_name: string; email: string; role: string; sector: string | null }
interface RawMaterial {
  id: string; title: string; type: string; status: string;
  storage_kind: string; storage_path: string | null;
  external_url: string | null; ad_reference: string | null;
  dashboard_id: string | null;
}

export default async function EdicaoPanelPage({ params }: Props) {
  const { dashboardId } = await params;

  const ctx = await getAuthContext();
  if (!ctx) redirect('/');

  const canAccess =
    ctx.profile.sector === 'edicao' ||
    ctx.profile.role === 'dono' ||
    ctx.profile.role === 'head';

  if (!canAccess) redirect(`/app/d/${dashboardId}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;

  // Constrói a promise de tarefas antes do Promise.all para incluí-la no mesmo round
  const tasksBaseQuery = supabase
    .from('tasks')
    .select('*, task_comments(id, body, created_at, user_id), task_attachments(*)')
    .eq('operation_id', ctx.profile.operation_id)
    .eq('sector', 'edicao')
    .order('created_at', { ascending: false });

  const tasksPromise =
    ctx.permissions.pode_atribuir_tarefa === 'nenhum'
      ? tasksBaseQuery.eq('assignee_user_id', ctx.userId)
      : tasksBaseQuery;

  // Round único — 7 queries em paralelo (tasks entra aqui, não em round separado)
  const [dashboardRes, membersRes, dashboardsRes, materialsRes, adPerfRows, salesUtmRes, tasksRes] =
    await Promise.all([
      supabase
        .from('dashboards')
        .select('id, name')
        .eq('id', dashboardId)
        .eq('operation_id', ctx.profile.operation_id)
        .maybeSingle(),

      supabase
        .from('profiles')
        .select('id, full_name, email, role, sector')
        .eq('operation_id', ctx.profile.operation_id)
        .order('full_name'),

      supabase
        .from('dashboards')
        .select('id, name')
        .eq('operation_id', ctx.profile.operation_id)
        .order('created_at'),

      supabase
        .from('materials')
        .select('id, title, type, status, storage_kind, storage_path, external_url, ad_reference, dashboard_id')
        .eq('operation_id', ctx.profile.operation_id)
        .eq('dashboard_id', dashboardId)
        .order('created_at', { ascending: false }),

      fetchAdPerformance(supabase, dashboardId, monthStart(), monthEnd()),

      supabase
        .from('sales')
        .select('amount, utm')
        .eq('dashboard_id', dashboardId)
        .eq('status', 'aprovado')
        .gte('occurred_at', monthStart())
        .lte('occurred_at', `${monthEnd()}T23:59:59.999Z`)
        .then((r: { data: { amount: number; utm: Record<string, string | null> | null }[] | null }) => r.data ?? []),

      tasksPromise,
    ]);

  if (!dashboardRes.data) redirect('/app');

  // ----- TAREFAS -----
  const allMembers: TaskMember[] = ((membersRes.data ?? []) as RawMember[]).map(m => ({
    id: m.id,
    full_name: m.full_name,
    email: m.email,
    role: m.role as TaskMember['role'],
    sector: m.sector as UserSector | null,
  }));

  const dashboards: { id: string; name: string }[] = (dashboardsRes.data ?? []) as { id: string; name: string }[];
  const membersMap = Object.fromEntries(allMembers.map(m => [m.id, m]));

  const tasks: Task[] = ((tasksRes.data ?? []) as Record<string, unknown>[]).map(t => ({
    id: t.id as string,
    operation_id: t.operation_id as string,
    dashboard_id: t.dashboard_id as string | null,
    title: t.title as string,
    description: t.description as string | null,
    assignee_user_id: t.assignee_user_id as string | null,
    sector: t.sector as UserSector,
    priority: t.priority as Task['priority'],
    due_date: t.due_date as string | null,
    status: t.status as Task['status'],
    created_by_user_id: t.created_by_user_id as string,
    created_at: t.created_at as string,
    updated_at: t.updated_at as string,
    assignee: (t.assignee_user_id as string | null) ? (membersMap[t.assignee_user_id as string] ?? null) : null,
    creator: membersMap[t.created_by_user_id as string] ?? null,
    dashboard: (t.dashboard_id as string | null) ? (dashboards.find(d => d.id === t.dashboard_id) ?? null) : null,
    task_comments: ((t.task_comments ?? []) as TaskComment[]).map(c => ({
      ...c,
      commenter: membersMap[(c as TaskComment).user_id] ?? null,
    })),
    task_attachments: (t.task_attachments ?? []) as TaskAttachment[],
  }));

  // ----- MATERIAIS -----
  const rawMaterials: RawMaterial[] = (materialsRes.data ?? []) as RawMaterial[];
  const uploadPaths = rawMaterials
    .filter(m => m.storage_kind === 'upload' && m.storage_path)
    .map(m => m.storage_path as string);

  const filePaths = tasks
    .flatMap(t => t.task_attachments)
    .filter(a => a.type === 'arquivo')
    .map(a => a.url);

  // Signed URLs para tasks e materials em paralelo (um único round adicional, condicional)
  const admin = createAdminClient();
  const [taskSignedData, materialSignedData] = await Promise.all([
    filePaths.length > 0
      ? admin.storage.from('task-attachments').createSignedUrls(filePaths, 3600)
      : Promise.resolve({ data: [] }),
    uploadPaths.length > 0
      ? admin.storage.from('materials').createSignedUrls(uploadPaths, 3600)
      : Promise.resolve({ data: [] }),
  ]);

  const taskSignedMap: Record<string, string> = {};
  for (const item of taskSignedData.data ?? []) {
    if (!item.error && item.signedUrl && item.path) taskSignedMap[item.path] = item.signedUrl;
  }
  for (const task of tasks) {
    for (const att of task.task_attachments) {
      if (att.type === 'arquivo' && taskSignedMap[att.url]) att.url = taskSignedMap[att.url];
    }
  }

  const signedUrlMap: Record<string, string> = {};
  for (const item of materialSignedData.data ?? []) {
    if (!item.error && item.signedUrl && item.path) signedUrlMap[item.path] = item.signedUrl;
  }

  const scope = ctx.permissions.pode_atribuir_tarefa;
  const edicaoMembers = allMembers.filter(
    m => m.sector === 'edicao' || m.role === 'dono' || m.role === 'head'
  );
  const assignableMembers =
    scope === 'todos'
      ? allMembers
      : scope === 'meu_setor'
      ? edicaoMembers
      : [];

  const materials: MaterialData[] = rawMaterials.map(m => ({
    id: m.id,
    title: m.title,
    type: m.type as MaterialType,
    status: m.status as MaterialStatus,
    storage_kind: m.storage_kind as MaterialStorageKind,
    storage_path: m.storage_path,
    external_url: m.external_url,
    ad_reference: m.ad_reference,
    dashboard_id: m.dashboard_id,
    signedUrl: m.storage_path ? signedUrlMap[m.storage_path] : undefined,
  }));

  const salesForPerf = (salesUtmRes as { amount: number; utm: Record<string, string | null> | null }[]);
  const performances = new Map<string, RealMaterialPerformance>();
  for (const m of materials) {
    if (m.ad_reference && m.status === 'no_ar') {
      const perf = computeMaterialPerformance(m.ad_reference, adPerfRows, salesForPerf, 3.0);
      if (perf) performances.set(m.id, perf);
    }
  }

  const availableAds = getAvailableAds(adPerfRows);
  const dashboardName = (dashboardRes.data as { id: string; name: string } | null)?.name ?? '';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Breadcrumb
        items={[
          { label: 'Visão Geral', href: '/app' },
          { label: dashboardName, href: `/app/d/${dashboardId}` },
          { label: 'Edição' },
        ]}
      />
      <div className="mb-8 pb-6 border-b border-white/[0.05] relative">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-orange-500/20 via-orange-500/5 to-transparent" />
        <div className="flex items-center gap-3 mb-1">
          <div className="w-1 h-6 bg-orange-500 rounded-full shrink-0" />
          <h1 className="text-2xl font-bold text-white tracking-tight">{dashboardName}</h1>
          <span className="text-xs bg-zinc-900/80 text-zinc-500 border border-zinc-800 px-2 py-0.5 rounded font-semibold">
            Edição
          </span>
        </div>
        <p className="text-sm text-zinc-600 pl-4">Tarefas de criação + Biblioteca de materiais</p>
      </div>

      {/* TAREFAS DE CRIAÇÃO */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-0.5 h-4 bg-orange-500 rounded-full" />
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-widest">Tarefas de Criação</h2>
        </div>
        <TasksPageClient
          tasks={tasks}
          members={edicaoMembers}
          assignableMembers={assignableMembers}
          dashboards={dashboards}
          currentUserId={ctx.userId}
          currentSector={ctx.profile.sector as UserSector | null}
          scope={scope}
          canCreate={scope !== 'nenhum'}
        />
      </section>

      {/* BIBLIOTECA DE MATERIAIS */}
      <section>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-0.5 h-4 bg-orange-500 rounded-full" />
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-widest">Biblioteca de Materiais</h2>
        </div>
        <MaterialsLibraryClient
          materials={materials}
          dashboardId={dashboardId}
          operationId={ctx.profile.operation_id}
          canManage={canAccess}
          performances={performances}
          availableAds={availableAds}
        />
      </section>
    </div>
  );
}
