'use server';

import { revalidateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthContext } from '@/lib/auth/getPermissions';

export async function markNotificationsReadAction(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const ctx = await getAuthContext();
  if (!ctx) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  await supabase
    .from('notifications')
    .update({ read: true })
    .in('id', ids)
    .eq('user_id', ctx.userId);

  revalidateTag(`notifications:${ctx.userId}`);
}

export async function confirmPendingActionAction(actionId: string): Promise<{ error?: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: 'Sem permissão.' };

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = admin as any;

  const { data: action, error: fetchErr } = await a
    .from('pending_actions')
    .select('*')
    .eq('id', actionId)
    .eq('operation_id', ctx.profile.operation_id)
    .eq('status', 'pendente')
    .maybeSingle();

  if (fetchErr || !action) return { error: 'Ação não encontrada.' };

  // Confirma a ação
  await a
    .from('pending_actions')
    .update({ status: 'confirmada', confirmed_by: ctx.userId, confirmed_at: new Date().toISOString() })
    .eq('id', actionId);

  // Se for criar_tarefa, cria a tarefa automaticamente
  if (action.type === 'criar_tarefa' && action.task_payload) {
    const tp = action.task_payload as Record<string, unknown>;
    await a.from('tasks').insert({
      operation_id:       ctx.profile.operation_id,
      dashboard_id:       action.dashboard_id ?? tp['dashboard_id'] ?? null,
      title:              action.title,
      description:        action.description ?? null,
      sector:             action.target_sector ?? 'dev',
      priority:           'alta',
      status:             'a_fazer',
      created_by_user_id: ctx.userId,
    });
  }

  revalidateTag(`pending-actions:${ctx.profile.operation_id}`);
  return {};
}

export async function dismissPendingActionAction(actionId: string): Promise<void> {
  const ctx = await getAuthContext();
  if (!ctx) return;

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from('pending_actions')
    .update({ status: 'descartada', confirmed_by: ctx.userId, confirmed_at: new Date().toISOString() })
    .eq('id', actionId)
    .eq('operation_id', ctx.profile.operation_id);

  revalidateTag(`pending-actions:${ctx.profile.operation_id}`);
}
