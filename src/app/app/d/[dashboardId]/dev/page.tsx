import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/auth/getPermissions';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { TasksPageClient } from '@/components/tasks/TasksPageClient';
import { MonitoringClient } from '@/components/dev/MonitoringClient';
import { IntegrationCenterClient } from '@/components/dev/IntegrationCenterClient';
import { IntegrationsPanel } from '@/components/dev/IntegrationsPanel';
import { TechEventsLog, type WebhookLogRow } from '@/components/dev/TechEventsLog';
import { UTMifyQueuePanel, type UTMifyQueueItem } from '@/components/dev/UTMifyQueuePanel';
import { buildStructureHealth } from '@/lib/mock/structure';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { SectionHeader } from '@/components/ui';
import type { Task, TaskMember, TaskComment, TaskAttachment } from '@/lib/types/tasks';
import type { UserSector } from '@/lib/types/database';
import type { MonitoredResource, IntegrationConnection } from '@/lib/mock/structure';

interface Props {
  params: Promise<{ dashboardId: string }>;
}

// Tipo raw de membro vindo do banco
interface RawMember { id: string; full_name: string; email: string; role: string; sector: string | null }

export default async function DevPanelPage({ params }: Props) {
  const { dashboardId } = await params;

  const ctx = await getAuthContext();
  if (!ctx) redirect('/');

  const canAccess =
    ctx.profile.sector === 'dev' ||
    ctx.profile.role === 'dono' ||
    ctx.profile.role === 'head';

  if (!canAccess) redirect(`/app/d/${dashboardId}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;

  // Constrói promise de tarefas antes do Promise.all para incluí-la no mesmo round
  const tasksPromise = supabase
    .from('tasks')
    .select('*, task_comments(id, body, created_at, user_id), task_attachments(*)')
    .eq('operation_id', ctx.profile.operation_id)
    .eq('sector', 'dev')
    .order('created_at', { ascending: false });

  // Todas as queries em um único round
  const [dashboardRes, membersRes, dashboardsRes, resourcesRes, connectionsRes, tasksRes, webhookLogsRes, utmifyQueueRes] = await Promise.all([
    supabase
      .from('dashboards')
      .select('id, name, primary_sale_provider')
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
      .from('monitored_resources')
      .select('id, kind, label, url, status, manual_note, last_checked_at')
      .eq('operation_id', ctx.profile.operation_id)
      .eq('dashboard_id', dashboardId)
      .order('created_at'),

    // Conexões: NUNCA retorna credentials_encrypted ao client
    supabase
      .from('integration_connections')
      .select('id, provider, category, status, last_event_at, config')
      .eq('operation_id', ctx.profile.operation_id)
      .eq('dashboard_id', dashboardId)
      .order('category'),

    tasksPromise,

    // Webhook logs (últimos 30) — somente dono/head via RLS
    supabase
      .from('webhook_logs')
      .select('id, provider, status, error_msg, received_at')
      .eq('operation_id', ctx.profile.operation_id)
      .order('received_at', { ascending: false })
      .limit(30),

    // Fila UTMify pendente
    supabase
      .from('utmify_queue')
      .select('id, external_id, buyer_email, amount, occurred_at, utm, created_at')
      .eq('operation_id', ctx.profile.operation_id)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  if (!dashboardRes.data) redirect('/app');

  const dashboardRow = dashboardRes.data as { name: string; primary_sale_provider: string | null };
  const dashboardName = dashboardRow.name;
  const primaryProvider = dashboardRow.primary_sale_provider ?? null;

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

  // Signed URLs para anexos
  const filePaths = tasks.flatMap(t => t.task_attachments).filter(a => a.type === 'arquivo').map(a => a.url);
  if (filePaths.length > 0) {
    const admin = createAdminClient();
    const { data: signedData } = await admin.storage.from('task-attachments').createSignedUrls(filePaths, 3600);
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
  const devMembers = allMembers.filter(m => m.sector === 'dev' || m.role === 'dono' || m.role === 'head');
  const assignableMembers = scope === 'todos' ? allMembers : scope === 'meu_setor' ? devMembers : [];

  // ----- MONITORAMENTO -----
  const rawResources = (resourcesRes.data ?? []) as MonitoredResource[];
  const rawConnections = (connectionsRes.data ?? []) as IntegrationConnection[];
  const health = buildStructureHealth(rawResources, rawConnections);

  const canManage = canAccess;
  const canDelete = ctx.profile.role === 'dono' || ctx.profile.role === 'head';
  const webhookLogs = (webhookLogsRes.data ?? []) as WebhookLogRow[];
  const utmifyQueue = (utmifyQueueRes.data ?? []) as UTMifyQueueItem[];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Breadcrumb
        items={[
          { label: 'Visão Geral', href: '/app' },
          { label: dashboardName, href: `/app/d/${dashboardId}` },
          { label: 'Dev' },
        ]}
      />
      <div className="mb-8 pb-6 border-b border-white/[0.05] relative">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-orange-500/20 via-orange-500/5 to-transparent" />
        <div className="flex items-center gap-3 mb-1">
          <div className="w-1 h-6 bg-orange-500 rounded-full shrink-0" />
          <h1 className="text-2xl font-bold text-white tracking-tight">{dashboardName}</h1>
          <span className="text-xs bg-zinc-900/80 text-zinc-500 border border-zinc-800 px-2 py-0.5 rounded font-semibold">
            Dev
          </span>
        </div>
        <p className="text-sm text-zinc-600 pl-4">Demandas técnicas · Monitoramento · Integrações</p>
      </div>

      {/* Alertas de infra */}
      {health.alerts.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {health.alerts.map((alert, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 text-xs bg-red-950/60 border border-red-800/60 text-red-400 px-3 py-1.5 rounded-lg">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              {alert}
            </span>
          ))}
        </div>
      )}

      {/* SEÇÃO 1: DEMANDAS TÉCNICAS */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-0.5 h-4 bg-orange-500 rounded-full" />
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-widest">Demandas Técnicas</h2>
        </div>
        <TasksPageClient
          tasks={tasks}
          members={devMembers}
          assignableMembers={assignableMembers}
          dashboards={dashboards}
          currentUserId={ctx.userId}
          currentSector={ctx.profile.sector as UserSector | null}
          scope={scope}
          canCreate={scope !== 'nenhum'}
        />
      </section>

      {/* SEÇÃO 2: MONITORAMENTO */}
      <section className="mb-10">
        <SectionHeader variant="section" title="Monitoramento de Estrutura" />
        <MonitoringClient
          pages={health.pages}
          domains={health.domains}
          dashboardId={dashboardId}
          canManage={canManage}
        />
      </section>

      {/* SEÇÃO 3: SAÚDE DAS INTEGRAÇÕES — painel técnico com DenseTable */}
      <section className="mb-10">
        <SectionHeader variant="section" title="Saúde das Integrações"
          badge={`${health.connections.length} conexões`} />
        <IntegrationsPanel
          connections={health.connections}
          canManage={canManage}
          manageHref="#configurar-integracoes"
        />
      </section>

      {/* SEÇÃO 4: LOG DE EVENTOS TÉCNICOS */}
      <section className="mb-10">
        <SectionHeader variant="section" title="Log de Eventos Técnicos"
          badge={`${webhookLogs.length} recentes`} />
        <TechEventsLog logs={webhookLogs} />
      </section>

      {/* SEÇÃO 5: FILA UTMIFY */}
      {utmifyQueue.length > 0 && (
        <section className="mb-10">
          <SectionHeader variant="section" title="Fila UTMify"
            badge={`${utmifyQueue.length} pendentes`} />
          <UTMifyQueuePanel items={utmifyQueue} />
        </section>
      )}

      {/* SEÇÃO 6: CONFIGURAÇÃO DE INTEGRAÇÕES (credenciais, edição) */}
      <section id="configurar-integracoes">
        <SectionHeader variant="section" title="Configurar Integrações" />
        <IntegrationCenterClient
          connections={health.connections}
          dashboardId={dashboardId}
          canManage={canManage}
          canDelete={canDelete}
          primaryProvider={primaryProvider}
        />
      </section>
    </div>
  );
}
