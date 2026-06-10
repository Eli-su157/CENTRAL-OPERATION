'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/auth/getPermissions';

export type MaterialActionState = { error: string } | { success: true } | null;

async function assertEdicaoAccess() {
  const ctx = await getAuthContext();
  if (!ctx) return null;
  const ok =
    ctx.profile.sector === 'edicao' ||
    ctx.profile.role === 'dono' ||
    ctx.profile.role === 'head';
  return ok ? ctx : null;
}

// Supabase-js 2.107+ requer Relationships no GenericTable para resolver os tipos de insert/update.
// Este projeto usa Database type manual (sem geração automática) que não inclui Relationships.
// A camada de segurança é o RLS no Supabase — o cast para any é seguro aqui.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSupabaseAny() {
  const client = await createClient();
  return client as unknown as {
    from: (table: string) => {
      insert: (data: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
      update: (data: Record<string, unknown>) => {
        eq: (col: string, val: string) => {
          eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
        };
      };
      delete: () => {
        eq: (col: string, val: string) => {
          eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
        };
      };
    };
  };
}

// ---- CRIAR MATERIAL ----

export async function createMaterialAction(
  prevState: MaterialActionState,
  formData: FormData
): Promise<MaterialActionState> {
  const ctx = await assertEdicaoAccess();
  if (!ctx) return { error: 'Sem permissão.' };

  const dashboardId = (formData.get('dashboard_id') as string) || null;
  const type = formData.get('type') as string;
  const title = (formData.get('title') as string)?.trim();
  const storageKind = formData.get('storage_kind') as 'upload' | 'link';
  const storagePath = (formData.get('storage_path') as string) || null;
  const externalUrl = (formData.get('external_url') as string)?.trim() || null;
  const status = (formData.get('status') as string) || 'em_producao';
  const adReference = (formData.get('ad_reference') as string)?.trim() || null;

  if (!type || !title) return { error: 'Título e tipo são obrigatórios.' };
  if (storageKind === 'upload' && !storagePath) return { error: 'Faça o upload do arquivo antes de salvar.' };
  if (storageKind === 'link' && !externalUrl) return { error: 'Informe o link externo.' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const { error } = await supabase.from('materials').insert({
    operation_id: ctx.profile.operation_id,
    dashboard_id: dashboardId,
    type,
    title,
    storage_kind: storageKind,
    storage_path: storageKind === 'upload' ? storagePath : null,
    external_url: storageKind === 'link' ? externalUrl : null,
    status,
    ad_reference: adReference,
    created_by: ctx.userId,
  });

  if (error) return { error: 'Erro ao criar material.' };

  revalidatePath(`/app/d/${dashboardId}/edicao`);
  revalidatePath(`/app/d/${dashboardId}`);
  return { success: true };
}

// ---- ATUALIZAR STATUS (ação rápida) ----

export async function updateMaterialStatusAction(
  prevState: MaterialActionState,
  formData: FormData
): Promise<MaterialActionState> {
  const ctx = await assertEdicaoAccess();
  if (!ctx) return { error: 'Sem permissão.' };

  const materialId = formData.get('materialId') as string;
  const status = formData.get('status') as string;
  const dashboardId = formData.get('dashboardId') as string;

  if (!materialId || !status) return { error: 'Dados inválidos.' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const { error } = await supabase
    .from('materials')
    .update({ status })
    .eq('id', materialId)
    .eq('operation_id', ctx.profile.operation_id);

  if (error) return { error: 'Erro ao atualizar status.' };

  revalidatePath(`/app/d/${dashboardId}/edicao`);
  revalidatePath(`/app/d/${dashboardId}`);
  return { success: true };
}

// ---- ATUALIZAR MATERIAL ----

export async function updateMaterialAction(
  prevState: MaterialActionState,
  formData: FormData
): Promise<MaterialActionState> {
  const ctx = await assertEdicaoAccess();
  if (!ctx) return { error: 'Sem permissão.' };

  const materialId = formData.get('materialId') as string;
  const dashboardId = (formData.get('dashboard_id') as string) || null;
  const title = (formData.get('title') as string)?.trim();
  const adReference = (formData.get('ad_reference') as string)?.trim() || null;
  const status = formData.get('status') as string;

  if (!materialId || !title) return { error: 'Dados inválidos.' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const { error } = await supabase
    .from('materials')
    .update({ title, ad_reference: adReference, status })
    .eq('id', materialId)
    .eq('operation_id', ctx.profile.operation_id);

  if (error) return { error: 'Erro ao atualizar material.' };

  revalidatePath(`/app/d/${dashboardId}/edicao`);
  return { success: true };
}

// ---- VINCULAR ANÚNCIO (de-para manual criativo ↔ ad_id) ----

export async function linkAdAction(
  prevState: MaterialActionState,
  formData: FormData
): Promise<MaterialActionState> {
  const ctx = await assertEdicaoAccess();
  if (!ctx) return { error: 'Sem permissão.' };

  const materialId  = formData.get('materialId')  as string;
  const dashboardId = formData.get('dashboardId') as string;
  const adId        = (formData.get('ad_id') as string)?.trim() || null;

  if (!materialId) return { error: 'Material inválido.' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const { error } = await supabase
    .from('materials')
    .update({ ad_reference: adId })
    .eq('id', materialId)
    .eq('operation_id', ctx.profile.operation_id);

  if (error) return { error: 'Erro ao vincular anúncio.' };

  revalidatePath(`/app/d/${dashboardId}/edicao`);
  return { success: true };
}

// ---- EXCLUIR MATERIAL ----

export async function deleteMaterialAction(
  prevState: MaterialActionState,
  formData: FormData
): Promise<MaterialActionState> {
  const ctx = await assertEdicaoAccess();
  if (!ctx) return { error: 'Sem permissão.' };

  const materialId = formData.get('materialId') as string;
  const storagePath = formData.get('storage_path') as string | null;
  const dashboardId = formData.get('dashboardId') as string;

  if (!materialId) return { error: 'Dados inválidos.' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const { error } = await supabase
    .from('materials')
    .delete()
    .eq('id', materialId)
    .eq('operation_id', ctx.profile.operation_id);

  if (error) return { error: 'Erro ao excluir material.' };

  if (storagePath) {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const admin = createAdminClient();
    await admin.storage.from('materials').remove([storagePath]);
  }

  revalidatePath(`/app/d/${dashboardId}/edicao`);
  revalidatePath(`/app/d/${dashboardId}`);
  return { success: true };
}
