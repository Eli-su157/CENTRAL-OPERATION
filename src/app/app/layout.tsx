import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/auth/getPermissions';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/AppShell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/');

  const supabase = await createClient();

  // Modo demo: usa dashboards e operação fixos
  let dashboards: { id: string; name: string }[];
  let operationName: string;

  if (process.env.NEXT_PUBLIC_DEMO === 'true') {
    const { DEMO_DASHBOARDS } = await import('@/lib/demo');
    dashboards = DEMO_DASHBOARDS;
    operationName = 'Central Demo';
  } else {
    const [dashboardsRes, operationRes] = await Promise.all([
      supabase
        .from('dashboards')
        .select('id, name')
        .eq('operation_id', ctx.profile.operation_id)
        .order('created_at'),
      supabase
        .from('operations')
        .select('name')
        .eq('id', ctx.profile.operation_id)
        .single(),
    ]);

    dashboards = dashboardsRes.data ?? [];
    operationName = operationRes.data?.name ?? '';

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
    >
      {children}
    </AppShell>
  );
}
