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

interface Props {
  params: Promise<{ dashboardId: string }>;
}

// Tipo dos dados de membro vindo do Supabase
interface RawMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  sector: string | null;
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

  const [dashboardRes, membersRes, dashboardsRes, materialsRes, adPerfRows, salesUtmRes] = await Promise.all([
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

    // Desempenho de anúncios do mês atual (para cruzar com materials.ad_reference)
    fetchAdPerformance(supabase, dashboardId, monthStart(), monthEnd()),

    // Vendas do mês com UTM para atribuição de receita por criativo
    supabase
      .from('sales')
      .select('amount, utm')
      .eq('dashboard_id', dashboardId)
      .eq('status', 'aprovado')
      .gte('occurred_at', monthStart())
      .lte('occurred_at', `${monthEnd()}T23:59:59.999Z`)
      .then((r: { data: { amount: number; utm: Record<string, string | null> | null }[] | null }) => r.data ?? []),
  ]);

  // Tarefas separado para aplicar filtro de setor sem quebrar o tuple inference
  const tasksQuery = supabase
    .from('tasks')
    .select('*, task_comments(id, body, created_at, user_id), task_attachments(*)')
    .eq('operation_id', ctx.profile.operation_id)
    .eq('sector', 'edicao')
    .order('created_at', { ascending: false });

  const tasksRes = ctx.permissions.pode_atribuir_tarefa === 'nenhum'
    ? await tasksQuery.eq('assignee_user_id', ctx.userId)
    : await tasksQuery;

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

  // Signed URLs para anexos de tarefas
  const filePaths = tasks
    .flatMap(t => t.task_attachments)
    .filter(a => a.type === 'arquivo')
    .map(a => a.url);

  if (filePaths.length > 0) {
    const admin = createAdminClient();
    const { data: signedData } = await admin.storage
      .from('task-attachments')
      .createSignedUrls(filePaths, 3600);

    const signedMap: Record<string, string> = {};
    for (const item of signedData ?? []) {
      if (!item.error && item.signedUrl && item.path) signedMap[item.path] = item.signedUrl;
    }
    for (const task of tasks) {
      for (const att of task.task_attachments) {
        if (att.type === 'arquivo' && signedMap[att.url]) att.url = signedMap[att.url];
      }
    }
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

  // ----- MATERIAIS -----
  interface RawMaterial {
    id: string; title: string; type: string; status: string;
    storage_kind: string; storage_path: string | null;
    external_url: string | null; ad_reference: string | null;
    dashboard_id: string | null;
  }

  const rawMaterials: RawMaterial[] = (materialsRes.data ?? []) as RawMaterial[];

  const uploadPaths = rawMaterials
    .filter(m => m.storage_kind === 'upload' && m.storage_path)
    .map(m => m.storage_path as string);

  const signedUrlMap: Record<string, string> = {};
  if (uploadPaths.length > 0) {
    const admin = createAdminClient();
    const { data: signedData } = await admin.storage
      .from('materials')
      .createSignedUrls(uploadPaths, 3600);

    for (const item of signedData ?? []) {
      if (!item.error && item.signedUrl && item.path) signedUrlMap[item.path] = item.signedUrl;
    }
  }

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

  // Computar desempenho real por criativo (cruzando ad_performance + sales UTM)
  // roasAlvo = 3.0 por padrão; pode ser personalizado pela traffic_goals no futuro
  const salesForPerf = (salesUtmRes as { amount: number; utm: Record<string, string | null> | null }[]);
  const performances = new Map<string, RealMaterialPerformance>();
  for (const m of materials) {
    if (m.ad_reference && m.status === 'no_ar') {
      const perf = computeMaterialPerformance(m.ad_reference, adPerfRows, salesForPerf, 3.0);
      if (perf) performances.set(m.id, perf);
    }
  }

  // Anúncios disponíveis para vínculo manual (da ad_performance deste dashboard)
  const availableAds = getAvailableAds(adPerfRows);

  const dashboardName = (dashboardRes.data as { id: string; name: string } | null)?.name ?? '';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href={`/app/d/${dashboardId}`}
          className="text-zinc-500 hover:text-white transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">{dashboardName}</h1>
            <span className="text-xs bg-violet-950 text-violet-400 border border-violet-800 px-2 py-0.5 rounded-full font-medium">
              Edição
            </span>
          </div>
          <p className="text-sm text-zinc-500">Tarefas de criação + Biblioteca de materiais</p>
        </div>
      </div>

      {/* ===== SEÇÃO 1: TAREFAS DE CRIAÇÃO ===== */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-0.5 h-4 bg-violet-500 rounded-full" />
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-widest">
            Tarefas de Criação
          </h2>
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

      {/* ===== SEÇÃO 2: BIBLIOTECA DE MATERIAIS ===== */}
      <section>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-0.5 h-4 bg-violet-500 rounded-full" />
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-widest">
            Biblioteca de Materiais
          </h2>
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
