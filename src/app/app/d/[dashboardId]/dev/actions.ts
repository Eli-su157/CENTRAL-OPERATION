'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/auth/getPermissions';
import { encryptCredentials } from '@/lib/crypto/credentials';

export type DevActionState = { error: string } | { success: true } | null;

async function assertDevAccess() {
  const ctx = await getAuthContext();
  if (!ctx) return null;
  const ok =
    ctx.profile.sector === 'dev' ||
    ctx.profile.role === 'dono' ||
    ctx.profile.role === 'head';
  return ok ? ctx : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = async () => (await createClient()) as any;

// ================================================================
// MONITORED RESOURCES
// ================================================================

export async function createResourceAction(
  prevState: DevActionState,
  formData: FormData
): Promise<DevActionState> {
  const ctx = await assertDevAccess();
  if (!ctx) return { error: 'Sem permissão.' };

  const dashboardId = (formData.get('dashboard_id') as string) || null;
  const kind = formData.get('kind') as string;
  const label = (formData.get('label') as string)?.trim();
  const url = (formData.get('url') as string)?.trim();

  if (!kind || !label || !url) return { error: 'Preencha todos os campos.' };

  const supabase = await db();
  const { error } = await supabase.from('monitored_resources').insert({
    operation_id: ctx.profile.operation_id,
    dashboard_id: dashboardId,
    kind,
    label,
    url,
    status: 'desconhecido',
  });

  if (error) return { error: 'Erro ao criar recurso.' };
  revalidatePath(`/app/d/${dashboardId}/dev`);
  return { success: true };
}

export async function updateResourceStatusAction(
  prevState: DevActionState,
  formData: FormData
): Promise<DevActionState> {
  const ctx = await assertDevAccess();
  if (!ctx) return { error: 'Sem permissão.' };

  const resourceId = formData.get('resourceId') as string;
  const dashboardId = formData.get('dashboardId') as string;
  const status = formData.get('status') as string;
  const manual_note = (formData.get('manual_note') as string)?.trim() || null;

  if (!resourceId || !status) return { error: 'Dados inválidos.' };

  const supabase = await db();
  const { error } = await supabase
    .from('monitored_resources')
    .update({ status, manual_note })
    .eq('id', resourceId)
    .eq('operation_id', ctx.profile.operation_id);

  if (error) return { error: 'Erro ao atualizar status.' };
  revalidatePath(`/app/d/${dashboardId}/dev`);
  return { success: true };
}

export async function deleteResourceAction(
  prevState: DevActionState,
  formData: FormData
): Promise<DevActionState> {
  const ctx = await assertDevAccess();
  if (!ctx) return { error: 'Sem permissão.' };

  const resourceId = formData.get('resourceId') as string;
  const dashboardId = formData.get('dashboardId') as string;

  const supabase = await db();
  const { error } = await supabase
    .from('monitored_resources')
    .delete()
    .eq('id', resourceId)
    .eq('operation_id', ctx.profile.operation_id);

  if (error) return { error: 'Erro ao excluir recurso.' };
  revalidatePath(`/app/d/${dashboardId}/dev`);
  return { success: true };
}

// ================================================================
// INTEGRATION CONNECTIONS
// ================================================================

export async function createConnectionAction(
  prevState: DevActionState,
  formData: FormData
): Promise<DevActionState> {
  const ctx = await assertDevAccess();
  if (!ctx) return { error: 'Sem permissão.' };

  const dashboardId = (formData.get('dashboard_id') as string) || null;
  const category = formData.get('category') as string;
  const provider = formData.get('provider') as string;
  const configRaw = (formData.get('config') as string)?.trim() || '{}';
  const credentialsRaw = (formData.get('credentials') as string)?.trim() || '';

  if (!category || !provider) return { error: 'Selecione categoria e provider.' };

  let config: Record<string, unknown> = {};
  try {
    config = JSON.parse(configRaw);
  } catch {
    return { error: 'Config inválida. Use formato JSON.' };
  }

  // Criptografa credenciais antes de persistir (NUNCA salvar em plain text)
  let credentials_encrypted: string | null = null;
  if (credentialsRaw) {
    try {
      credentials_encrypted = encryptCredentials(credentialsRaw);
    } catch {
      return { error: 'Erro ao criptografar credenciais. Verifique ENCRYPTION_KEY.' };
    }
  }

  const supabase = await db();
  const { error } = await supabase.from('integration_connections').insert({
    operation_id: ctx.profile.operation_id,
    dashboard_id: dashboardId,
    category,
    provider,
    status: 'desconectada',
    config,
    credentials_encrypted,
    created_by: ctx.userId,
  });

  if (error) return { error: 'Erro ao criar conexão.' };
  revalidatePath(`/app/d/${dashboardId}/dev`);
  return { success: true };
}

export async function updateConnectionAction(
  prevState: DevActionState,
  formData: FormData
): Promise<DevActionState> {
  const ctx = await assertDevAccess();
  if (!ctx) return { error: 'Sem permissão.' };

  const connectionId = formData.get('connectionId') as string;
  const dashboardId = (formData.get('dashboard_id') as string) || null;
  const configRaw = (formData.get('config') as string)?.trim() || '{}';
  const credentialsRaw = (formData.get('credentials') as string)?.trim() || '';

  if (!connectionId) return { error: 'ID inválido.' };

  let config: Record<string, unknown> = {};
  try {
    config = JSON.parse(configRaw);
  } catch {
    return { error: 'Config inválida. Use formato JSON.' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatePayload: Record<string, any> = { config };

  // Só atualiza credenciais se o usuário forneceu algo novo
  if (credentialsRaw) {
    try {
      updatePayload.credentials_encrypted = encryptCredentials(credentialsRaw);
    } catch {
      return { error: 'Erro ao criptografar credenciais.' };
    }
  }

  const supabase = await db();
  const { error } = await supabase
    .from('integration_connections')
    .update(updatePayload)
    .eq('id', connectionId)
    .eq('operation_id', ctx.profile.operation_id);

  if (error) return { error: 'Erro ao atualizar conexão.' };
  revalidatePath(`/app/d/${dashboardId}/dev`);
  return { success: true };
}

export async function updateConnectionStatusAction(
  prevState: DevActionState,
  formData: FormData
): Promise<DevActionState> {
  const ctx = await assertDevAccess();
  if (!ctx) return { error: 'Sem permissão.' };

  const connectionId = formData.get('connectionId') as string;
  const dashboardId = formData.get('dashboardId') as string;
  const status = formData.get('status') as string;

  if (!connectionId || !status) return { error: 'Dados inválidos.' };

  const supabase = await db();
  const { error } = await supabase
    .from('integration_connections')
    .update({ status })
    .eq('id', connectionId)
    .eq('operation_id', ctx.profile.operation_id);

  if (error) return { error: 'Erro ao atualizar status.' };
  revalidatePath(`/app/d/${dashboardId}/dev`);
  return { success: true };
}

export async function deleteConnectionAction(
  prevState: DevActionState,
  formData: FormData
): Promise<DevActionState> {
  const ctx = await assertDevAccess();
  if (!ctx) return { error: 'Sem permissão.' };

  const connectionId = formData.get('connectionId') as string;
  const dashboardId = formData.get('dashboardId') as string;

  // Só dono/head pode excluir conexões (credenciais sensíveis)
  if (ctx.profile.role !== 'dono' && ctx.profile.role !== 'head') {
    return { error: 'Só Dono ou Head pode excluir conexões.' };
  }

  const supabase = await db();
  const { error } = await supabase
    .from('integration_connections')
    .delete()
    .eq('id', connectionId)
    .eq('operation_id', ctx.profile.operation_id);

  if (error) return { error: 'Erro ao excluir conexão.' };
  revalidatePath(`/app/d/${dashboardId}/dev`);
  return { success: true };
}

// ================================================================
// FONTE DA VERDADE — provider primário de receita por dashboard
// ================================================================

export async function setPrimaryProviderAction(
  prevState: DevActionState,
  formData: FormData
): Promise<DevActionState> {
  const ctx = await assertDevAccess();
  if (!ctx) return { error: 'Sem permissão.' };

  // Só dono/head define a fonte primária de receita
  if (ctx.profile.role !== 'dono' && ctx.profile.role !== 'head') {
    return { error: 'Só Dono ou Head pode definir o provider primário.' };
  }

  const dashboardId = formData.get('dashboardId') as string;
  const rawProvider = (formData.get('primary_sale_provider') as string)?.trim() || null;

  if (!dashboardId) return { error: 'Dashboard inválido.' };

  const VALID = new Set(['hotmart', 'paradise', 'vega', 'shopify', '']);
  if (rawProvider && !VALID.has(rawProvider)) return { error: 'Provider inválido.' };

  const primary_sale_provider = rawProvider || null;

  const supabase = await db();
  const { error } = await supabase
    .from('dashboards')
    .update({ primary_sale_provider })
    .eq('id', dashboardId)
    .eq('operation_id', ctx.profile.operation_id);

  if (error) return { error: 'Erro ao salvar provider primário.' };
  revalidatePath(`/app/d/${dashboardId}/dev`);
  revalidatePath(`/app/d/${dashboardId}`);
  revalidatePath('/app');
  return { success: true };
}
