'use server';

import { headers } from 'next/headers';
import { revalidatePath, revalidateTag } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthContext } from '@/lib/auth/getPermissions';
import type { UserRole, UserSector } from '@/lib/types/database';
import type { OverrideType } from '@/lib/auth/permissions';

export type ActionState = { error: string } | { success: string } | null;
export type InviteState =
  | { error: string }
  | { token: string; email: string; link: string }
  | null;

// ---- CRIAR CONVITE ----

export async function createInviteAction(
  prevState: InviteState,
  formData: FormData
): Promise<InviteState> {
  const ctx = await getAuthContext();
  if (!ctx?.permissions.pode_gerenciar_equipe) return { error: 'Sem permissão.' };

  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const role = formData.get('role') as UserRole;
  const sector = (formData.get('sector') || null) as UserSector | null;

  if (!email || !role) return { error: 'Preencha e-mail e papel.' };
  if ((role === 'lider' || role === 'executor') && !sector) {
    return { error: 'Líder e Executor precisam de um setor.' };
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from('invites')
    .select('id')
    .eq('operation_id', ctx.profile.operation_id)
    .eq('email', email)
    .eq('status', 'pendente')
    .maybeSingle();

  if (existing) return { error: 'Já existe um convite pendente para este e-mail.' };

  // Checar se já é membro
  const { data: existingMember } = await admin
    .from('profiles')
    .select('id')
    .eq('operation_id', ctx.profile.operation_id)
    .eq('email', email)
    .maybeSingle();

  if (existingMember) return { error: 'Este e-mail já é membro da operação.' };

  const { data: invite, error } = await admin
    .from('invites')
    .insert({ operation_id: ctx.profile.operation_id, email, role, sector })
    .select()
    .single();

  if (error || !invite) return { error: 'Erro ao criar convite.' };

  const headersList = await headers();
  const host = headersList.get('host') ?? 'localhost:3000';
  const protocol = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https';
  const link = `${protocol}://${host}/convite/${invite.token}`;

  revalidatePath('/app/equipe');
  return { token: invite.token, email: invite.email, link };
}

// ---- CANCELAR CONVITE ----

export async function cancelInviteAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const ctx = await getAuthContext();
  if (!ctx?.permissions.pode_gerenciar_equipe) return { error: 'Sem permissão.' };

  const inviteId = formData.get('inviteId') as string;
  if (!inviteId) return { error: 'Dados inválidos.' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('invites')
    .update({ status: 'expirado' })
    .eq('id', inviteId)
    .eq('operation_id', ctx.profile.operation_id);

  if (error) return { error: 'Erro ao cancelar convite.' };

  revalidatePath('/app/equipe');
  return { success: 'Convite cancelado.' };
}

// ---- ATUALIZAR PAPEL / SETOR ----

export async function updateMemberAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const ctx = await getAuthContext();
  if (!ctx?.permissions.pode_gerenciar_equipe) return { error: 'Sem permissão.' };

  const memberId = formData.get('memberId') as string;
  const role = formData.get('role') as UserRole;
  const sector = (formData.get('sector') || null) as UserSector | null;

  if (!memberId || !role) return { error: 'Dados inválidos.' };
  if (memberId === ctx.userId) return { error: 'Você não pode alterar o próprio papel.' };
  if ((role === 'lider' || role === 'executor') && !sector) {
    return { error: 'Líder e Executor precisam de setor.' };
  }

  const sectorValue = role === 'dono' || role === 'head' ? null : sector;

  const admin = createAdminClient();
  const { error } = await admin
    .from('profiles')
    .update({ role, sector: sectorValue })
    .eq('id', memberId)
    .eq('operation_id', ctx.profile.operation_id);

  if (error) return { error: 'Erro ao atualizar membro.' };

  revalidateTag('auth-profile');
  revalidatePath('/app/equipe');
  return { success: 'Papel atualizado com sucesso.' };
}

// ---- ADICIONAR / SOBRESCREVER OVERRIDE ----

export async function addOverrideAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const ctx = await getAuthContext();
  if (!ctx?.permissions.pode_gerenciar_equipe) return { error: 'Sem permissão.' };

  const memberId = formData.get('memberId') as string;
  const type = formData.get('type') as OverrideType;
  const escopo = formData.get('escopo') as string | null;
  const dashboardId = formData.get('dashboardId') as string | null;

  if (!memberId || !type) return { error: 'Dados inválidos.' };

  let value: Record<string, unknown> | null = null;
  if (type === 'atribuir_tarefa') {
    value = { escopo: escopo ?? 'meu_setor' };
  } else if (type === 'restrito_a_dashboard' && dashboardId) {
    value = { dashboard_id: dashboardId };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('permission_overrides')
    .upsert(
      { operation_id: ctx.profile.operation_id, user_id: memberId, type, value },
      { onConflict: 'user_id,type' }
    );

  if (error) return { error: 'Erro ao adicionar exceção.' };

  revalidateTag('auth-profile');
  revalidatePath('/app/equipe');
  return { success: 'Exceção adicionada.' };
}

// ---- REMOVER OVERRIDE ----

export async function removeOverrideAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const ctx = await getAuthContext();
  if (!ctx?.permissions.pode_gerenciar_equipe) return { error: 'Sem permissão.' };

  const memberId = formData.get('memberId') as string;
  const type = formData.get('type') as OverrideType;
  if (!memberId || !type) return { error: 'Dados inválidos.' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('permission_overrides')
    .delete()
    .eq('user_id', memberId)
    .eq('operation_id', ctx.profile.operation_id)
    .eq('type', type);

  if (error) return { error: 'Erro ao remover exceção.' };

  revalidateTag('auth-profile');
  revalidatePath('/app/equipe');
  return { success: 'Exceção removida.' };
}

// ---- REMOVER MEMBRO ----

export async function removeMemberAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const ctx = await getAuthContext();
  if (!ctx?.permissions.pode_gerenciar_equipe) return { error: 'Sem permissão.' };

  const memberId = formData.get('memberId') as string;
  if (!memberId) return { error: 'Dados inválidos.' };
  if (memberId === ctx.userId) return { error: 'Você não pode remover a si mesmo.' };

  const admin = createAdminClient();

  const { error: profileError } = await admin
    .from('profiles')
    .delete()
    .eq('id', memberId)
    .eq('operation_id', ctx.profile.operation_id);

  if (profileError) return { error: 'Erro ao remover membro.' };

  await admin.auth.admin.deleteUser(memberId);

  revalidateTag('auth-profile');
  revalidatePath('/app/equipe');
  return { success: 'Membro removido.' };
}
