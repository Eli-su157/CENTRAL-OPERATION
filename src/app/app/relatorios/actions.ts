'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/auth/getPermissions';
import { generateReportData } from '@/lib/reports/generate';

export type ReportActionState = { error: string } | { success: true; id?: string } | null;

async function assertReportAccess() {
  const ctx = await getAuthContext();
  if (!ctx) return null;
  if (ctx.profile.role !== 'head' && ctx.profile.role !== 'dono') return null;
  return ctx;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = async () => (await createClient()) as any;

// Gera (ou regenera) o rascunho de um período
export async function generateReportAction(
  prevState: ReportActionState,
  formData: FormData
): Promise<ReportActionState> {
  const ctx = await assertReportAccess();
  if (!ctx) return { error: 'Acesso restrito a Head e Dono.' };

  const periodType = formData.get('period_type') as 'semanal' | 'mensal';
  const periodRef  = formData.get('period_ref') as string;

  if (!periodType || !periodRef) return { error: 'Selecione o período.' };

  const supabase = await db();

  // Verifica se já existe um relatório congelado para esse período
  const { data: existing } = await supabase
    .from('operation_reports')
    .select('id, status')
    .eq('operation_id', ctx.profile.operation_id)
    .eq('period_type', periodType)
    .eq('period_ref', periodRef)
    .maybeSingle();

  if (existing?.status === 'congelado') {
    return { error: 'Este período já tem um relatório congelado. Não é possível regenerar.' };
  }

  // Gera os dados
  let generated_data;
  try {
    generated_data = await generateReportData({
      operationId: ctx.profile.operation_id,
      periodType,
      periodRef,
      db: supabase,
    });
  } catch (e) {
    return { error: `Erro ao gerar relatório: ${(e as Error).message}` };
  }

  if (existing) {
    // Atualiza rascunho existente (preserva head_comment)
    const { error } = await supabase
      .from('operation_reports')
      .update({ generated_data })
      .eq('id', existing.id);
    if (error) return { error: 'Erro ao atualizar rascunho.' };
    revalidatePath('/app/relatorios');
    return { success: true, id: existing.id };
  }

  // Cria novo rascunho
  const { data: created, error } = await supabase
    .from('operation_reports')
    .insert({
      operation_id: ctx.profile.operation_id,
      period_type:  periodType,
      period_ref:   periodRef,
      status:       'rascunho',
      generated_data,
      created_by:   ctx.userId,
    })
    .select('id')
    .single();

  if (error || !created) return { error: 'Erro ao criar relatório.' };
  revalidatePath('/app/relatorios');
  return { success: true, id: created.id };
}

// Salva o comentário do Head (rascunho)
export async function saveHeadCommentAction(
  prevState: ReportActionState,
  formData: FormData
): Promise<ReportActionState> {
  const ctx = await assertReportAccess();
  if (!ctx) return { error: 'Acesso restrito.' };

  const reportId   = formData.get('reportId') as string;
  const headComment = (formData.get('head_comment') as string)?.trim() || null;

  const supabase = await db();
  const { error } = await supabase
    .from('operation_reports')
    .update({ head_comment: headComment })
    .eq('id', reportId)
    .eq('operation_id', ctx.profile.operation_id)
    .eq('status', 'rascunho');

  if (error) return { error: 'Erro ao salvar comentário.' };
  revalidatePath('/app/relatorios');
  return { success: true };
}

// Congela o relatório — snapshot imutável
export async function freezeReportAction(
  prevState: ReportActionState,
  formData: FormData
): Promise<ReportActionState> {
  const ctx = await assertReportAccess();
  if (!ctx) return { error: 'Acesso restrito.' };

  const reportId = formData.get('reportId') as string;

  const supabase = await db();
  const { error } = await supabase
    .from('operation_reports')
    .update({ status: 'congelado', frozen_at: new Date().toISOString() })
    .eq('id', reportId)
    .eq('operation_id', ctx.profile.operation_id)
    .eq('status', 'rascunho');

  if (error) return { error: 'Erro ao congelar relatório.' };
  revalidatePath('/app/relatorios');
  return { success: true };
}

// Exclui rascunho (só dono)
export async function deleteReportAction(
  prevState: ReportActionState,
  formData: FormData
): Promise<ReportActionState> {
  const ctx = await getAuthContext();
  if (!ctx || ctx.profile.role !== 'dono') return { error: 'Só o Dono pode excluir relatórios.' };

  const reportId = formData.get('reportId') as string;

  const supabase = await db();
  const { error } = await supabase
    .from('operation_reports')
    .delete()
    .eq('id', reportId)
    .eq('operation_id', ctx.profile.operation_id);

  if (error) return { error: 'Erro ao excluir relatório.' };
  revalidatePath('/app/relatorios');
  return { success: true };
}
