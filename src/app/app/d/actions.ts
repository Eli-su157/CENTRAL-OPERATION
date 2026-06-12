'use server';

import { redirect } from 'next/navigation';
import { revalidatePath, revalidateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/auth/getPermissions';

export type DashboardActionState = { error: string } | null;

// ---- CRIAR ----

export async function createDashboardAction(
  prevState: DashboardActionState,
  formData: FormData
): Promise<DashboardActionState> {
  const ctx = await getAuthContext();
  if (!ctx?.permissions.pode_criar_dashboard) return { error: 'Sem permissão.' };

  const name = (formData.get('name') as string)?.trim();
  if (!name) return { error: 'Nome obrigatório.' };
  if (name.length > 50) return { error: 'Máximo de 50 caracteres.' };

  const supabase = await createClient();

  // Verificar limite
  const { count } = await supabase
    .from('dashboards')
    .select('id', { count: 'exact', head: true })
    .eq('operation_id', ctx.profile.operation_id);

  const { data: operation } = await supabase
    .from('operations')
    .select('max_dashboards')
    .eq('id', ctx.profile.operation_id)
    .single();

  const max = operation?.max_dashboards ?? 5;
  if ((count ?? 0) >= max) {
    return { error: `Limite de ${max} dashboards atingido. Exclua um existente ou atualize seu plano.` };
  }

  const { data: dashboard, error } = await supabase
    .from('dashboards')
    .insert({ operation_id: ctx.profile.operation_id, name })
    .select()
    .single();

  if (error || !dashboard) return { error: 'Erro ao criar dashboard.' };

  revalidateTag('nav-dashboards');
  redirect(`/app/d/${dashboard.id}`);
}

// ---- RENOMEAR ----

export async function renameDashboardAction(
  prevState: DashboardActionState,
  formData: FormData
): Promise<DashboardActionState> {
  const ctx = await getAuthContext();
  if (!ctx?.permissions.pode_criar_dashboard) return { error: 'Sem permissão.' };

  const dashboardId = formData.get('dashboardId') as string;
  const name = (formData.get('name') as string)?.trim();

  if (!dashboardId || !name) return { error: 'Dados inválidos.' };
  if (name.length > 50) return { error: 'Máximo de 50 caracteres.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('dashboards')
    .update({ name })
    .eq('id', dashboardId)
    .eq('operation_id', ctx.profile.operation_id);

  if (error) return { error: 'Erro ao renomear.' };

  revalidateTag('nav-dashboards');
  revalidatePath(`/app/d/${dashboardId}`);
  revalidatePath('/app');
  return null;
}

// ---- EXCLUIR ----

export async function deleteDashboardAction(
  prevState: DashboardActionState,
  formData: FormData
): Promise<DashboardActionState> {
  const ctx = await getAuthContext();
  if (!ctx?.permissions.pode_criar_dashboard) return { error: 'Sem permissão.' };

  const dashboardId = formData.get('dashboardId') as string;
  if (!dashboardId) return { error: 'Dados inválidos.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('dashboards')
    .delete()
    .eq('id', dashboardId)
    .eq('operation_id', ctx.profile.operation_id);

  if (error) return { error: 'Erro ao excluir.' };

  revalidateTag('nav-dashboards');
  redirect('/app');
}
