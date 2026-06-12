import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { getAuthContext } from '@/lib/auth/getPermissions';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/AppShell';

type NavData = { dashboards: { id: string; name: string }[]; operationName: string };

// Cached por operation_id — TTL 30s + invalidado por tag 'nav-dashboards' nos actions de dashboard
function getNavData(operationId: string) {
  return unstable_cache(
    async (): Promise<NavData> => {
      const supabase = await createClient();
      const [dashboardsRes, operationRes] = await Promise.all([
        supabase
          .from('dashboards')
          .select('id, name')
          .eq('operation_id', operationId)
          .order('created_at'),
        supabase
          .from('operations')
          .select('name')
          .eq('id', operationId)
          .single(),
      ]);
      return {
        dashboards: dashboardsRes.data ?? [],
        operationName: operationRes.data?.name ?? '',
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
    const nav = await getNavData(ctx.profile.operation_id);
    dashboards = nav.dashboards;
    operationName = nav.operationName;

    if (ctx.permissions.restrito_a_dashboard) {
      dashboards = dashboards.filter(d => d.id === ctx.permissions.restrito_a_dashboard);
    }
  }

  return (
    <AppShell
      user={{
        name: ctx.profile.full_name,
        role: ctx.profile.role,
        email: ctx.profile.email,
      }}
      operation={{ name: operationName }}
      dashboards={dashboards}
      canManageTeam={ctx.permissions.pode_gerenciar_equipe}
      canSeeFinancial={ctx.permissions.pode_ver_financeiro}
      canSeeReports={ctx.profile.role === 'head' || ctx.profile.role === 'dono'}
      canSeeIntegrations={ctx.profile.role === 'dono' || ctx.profile.role === 'head'}
    >
      {children}
    </AppShell>
  );
}
