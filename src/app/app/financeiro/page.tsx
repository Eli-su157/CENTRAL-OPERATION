import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/auth/getPermissions';
import { createClient } from '@/lib/supabase/server';
import { FinancePageClient } from '@/components/finance/FinancePageClient';
import type { FinanceEntry } from '@/lib/finance/calc';

export default async function FinanceiroPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/');
  if (!ctx.permissions.pode_ver_financeiro) redirect('/app');

  const supabase = await createClient();

  const [entriesRes, categoriesRes, dashboardsRes, membersRes] = await Promise.all([
    // Entradas dos últimos 12 meses (suficiente para todos os filtros do cliente)
    supabase
      .from('finance_entries')
      .select('*')
      .eq('operation_id', ctx.profile.operation_id)
      .gte('entry_date', new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0])
      .order('entry_date', { ascending: false }),
    supabase
      .from('finance_categories')
      .select('name, direction')
      .eq('operation_id', ctx.profile.operation_id)
      .order('name'),
    supabase
      .from('dashboards')
      .select('id, name')
      .eq('operation_id', ctx.profile.operation_id),
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('operation_id', ctx.profile.operation_id),
  ]);

  const entries: FinanceEntry[] = (entriesRes.data ?? []).map(e => ({
    id: e.id,
    direction: e.direction as 'entrada' | 'saida',
    category: e.category,
    amount: Number(e.amount),
    entry_date: e.entry_date,
    status: e.status as 'pago' | 'a_pagar' | 'a_receber',
    dashboard_id: e.dashboard_id,
  }));

  // Seed categorias padrão se a operação não tiver nenhuma ainda
  if ((categoriesRes.data ?? []).length === 0) {
    await supabase.rpc('seed_default_categories', {
      p_operation_id: ctx.profile.operation_id,
    });
    // Re-busca
    const fresh = await supabase
      .from('finance_categories')
      .select('name, direction')
      .eq('operation_id', ctx.profile.operation_id)
      .order('name');
    categoriesRes.data = fresh.data;
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <FinancePageClient
        entries={entries}
        categories={(categoriesRes.data ?? []).map(c => ({
          name: c.name,
          direction: c.direction as 'entrada' | 'saida',
        }))}
        dashboards={dashboardsRes.data ?? []}
        members={(membersRes.data ?? []).map(m => ({ id: m.id, full_name: m.full_name }))}
      />
    </div>
  );
}
