import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { getAuthContext } from '@/lib/auth/getPermissions';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { AppShell } from '@/components/layout/AppShell';
import type { NotificationItem } from '@/components/layout/NotificationBell';

type NavData = { dashboards: { id: string; name: string }[]; operationName: string };

// Admin client não usa cookies — compatível com unstable_cache
function getNavData(operationId: string) {
  return unstable_cache(
    async (): Promise<NavData> => {
      const admin = createAdminClient();
      const [dashboardsRes, operationRes] = await Promise.all([
        admin
          .from('dashboards')
          .select('id, name')
          .eq('operation_id', operationId)
          .order('created_at'),
        admin
          .from('operations')
          .select('name')
          .eq('id', operationId)
          .single(),
      ]);
      return {
        dashboards: (dashboardsRes.data ?? []) as { id: string; name: string }[],
        operationName: (operationRes.data as { name: string } | null)?.name ?? '',
      };
    },
    [`nav-data-${operationId}`],
    { revalidate: 30, tags: ['nav-dashboards'] }
  )();
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/');

  let dashboards: { id: string; name: string }[];
  let operationName: string;

  if (process.env.NEXT_PUBLIC_DEMO === 'true') {
    const { DEMO_DASHBOARDS } = await import('@/lib/demo');
    dashboards = DEMO_DASHBOARDS;
    operationName = 'Central Demo';
  } else {
    // Nav data (cacheado) + notificações (não cacheado — tempo-real) em paralelo
    const [nav, notifRes] = await Promise.all([
      getNavData(ctx.profile.operation_id),
      createClient().then(sb =>
        sb
          .from('notifications')
          .select('id, type, title, body, link, read, created_at')
          .eq('user_id', ctx.userId)
          .order('created_at', { ascending: false })
          .limit(30)
      ),
    ]);

    dashboards = nav.dashboards;
    operationName = nav.operationName;

    if (ctx.permissions.restrito_a_dashboard) {
      dashboards = dashboards.filter(d => d.id === ctx.permissions.restrito_a_dashboard);
    }

    const notifications: NotificationItem[] = (notifRes.data ?? []).map(n => ({
      id:         n.id,
      type:       n.type,
      title:      n.title,
      body:       n.body,
      link:       n.link ?? null,
      read:       n.read,
      created_at: n.created_at,
    }));
    const unreadCount = notifications.filter(n => !n.read).length;

    return (
      <AppShell
        user={{ name: ctx.profile.full_name, role: ctx.profile.role, email: ctx.profile.email }}
        operation={{ name: operationName }}
        dashboards={dashboards}
        canManageTeam={ctx.permissions.pode_gerenciar_equipe}
        canSeeFinancial={ctx.permissions.pode_ver_financeiro}
        canSeeReports={ctx.profile.role === 'head' || ctx.profile.role === 'dono'}
        canSeeIntegrations={ctx.profile.role === 'dono' || ctx.profile.role === 'head'}
        notifications={notifications}
        unreadCount={unreadCount}
      >
        {children}
      </AppShell>
    );
  }

  // Demo mode — sem notificações
  return (
    <AppShell
      user={{ name: ctx.profile.full_name, role: ctx.profile.role, email: ctx.profile.email }}
      operation={{ name: operationName }}
      dashboards={dashboards}
      canManageTeam={ctx.permissions.pode_gerenciar_equipe}
      canSeeFinancial={ctx.permissions.pode_ver_financeiro}
      canSeeReports={ctx.profile.role === 'head' || ctx.profile.role === 'dono'}
      canSeeIntegrations={ctx.profile.role === 'dono' || ctx.profile.role === 'head'}
      notifications={[]}
      unreadCount={0}
    >
      {children}
    </AppShell>
  );
}
