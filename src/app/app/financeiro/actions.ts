'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/auth/getPermissions';

export type FinanceActionState = { error: string } | { success: true } | null;

// ---- CRIAR LANÇAMENTO ----

export async function createEntryAction(
  prevState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: 'Não autenticado.' };
  if (!ctx.permissions.pode_ver_financeiro) return { error: 'Sem permissão de acesso financeiro.' };

  const direction = formData.get('direction') as 'entrada' | 'saida';
  const category = (formData.get('category') as string)?.trim();
  const description = (formData.get('description') as string)?.trim() || null;
  const amountStr = formData.get('amount') as string;
  const entryDate = formData.get('entry_date') as string;
  const status = (formData.get('status') as string) || 'pago';
  const dashboardId = (formData.get('dashboard_id') as string) || null;
  const recurring = formData.get('recurring') === 'true';
  const recurrencePeriod = (formData.get('recurrence_period') as string) || null;
  const recurrenceEnd = (formData.get('recurrence_end') as string) || null;
  const relatedUserId = (formData.get('related_user_id') as string) || null;

  if (!direction || !category || !amountStr || !entryDate) {
    return { error: 'Preencha os campos obrigatórios.' };
  }

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) return { error: 'Valor inválido.' };

  const supabase = await createClient();
  const { error } = await supabase.from('finance_entries').insert({
    operation_id: ctx.profile.operation_id,
    dashboard_id: dashboardId || null,
    direction,
    category,
    description,
    amount,
    entry_date: entryDate,
    status: status as 'pago' | 'a_pagar' | 'a_receber',
    recurring,
    recurrence_period: recurring ? (recurrencePeriod as 'mensal' | 'diario' | 'semanal' | 'trimestral' | 'anual' | null) : null,
    recurrence_end: recurring && recurrenceEnd ? recurrenceEnd : null,
    related_user_id: relatedUserId || null,
    created_by: ctx.userId,
  });

  if (error) return { error: 'Erro ao criar lançamento.' };

  // Se recorrente, gera as repetições automáticas até recurrence_end
  if (recurring && recurrencePeriod && recurrenceEnd) {
    await generateRecurrences({
      supabase,
      operationId: ctx.profile.operation_id,
      dashboardId: dashboardId || null,
      direction,
      category,
      description,
      amount,
      baseDate: entryDate,
      period: recurrencePeriod as 'mensal' | 'diario' | 'semanal' | 'trimestral' | 'anual',
      endDate: recurrenceEnd,
      status: status as 'pago' | 'a_pagar' | 'a_receber',
      relatedUserId: relatedUserId || null,
      createdBy: ctx.userId,
    });
  }

  revalidatePath('/app/financeiro');
  revalidatePath('/app');
  return { success: true };
}

// Gera lançamentos recorrentes a partir da data base até recurrence_end
async function generateRecurrences(opts: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  operationId: string;
  dashboardId: string | null;
  direction: 'entrada' | 'saida';
  category: string;
  description: string | null;
  amount: number;
  baseDate: string;
  period: 'diario' | 'semanal' | 'mensal' | 'trimestral' | 'anual';
  endDate: string;
  status: 'pago' | 'a_pagar' | 'a_receber';
  relatedUserId: string | null;
  createdBy: string;
}) {
  const dates: string[] = [];
  const base = new Date(opts.baseDate + 'T12:00:00Z');
  const end = new Date(opts.endDate + 'T12:00:00Z');
  const next = new Date(base);

  const increment = () => {
    switch (opts.period) {
      case 'diario':      next.setDate(next.getDate() + 1); break;
      case 'semanal':     next.setDate(next.getDate() + 7); break;
      case 'mensal':      next.setMonth(next.getMonth() + 1); break;
      case 'trimestral':  next.setMonth(next.getMonth() + 3); break;
      case 'anual':       next.setFullYear(next.getFullYear() + 1); break;
    }
  };

  increment(); // pula o próprio lançamento base
  while (next <= end && dates.length < 60) { // máx. 60 recorrências
    dates.push(next.toISOString().split('T')[0]);
    increment();
  }

  if (dates.length === 0) return;

  await opts.supabase.from('finance_entries').insert(
    dates.map(d => ({
      operation_id: opts.operationId,
      dashboard_id: opts.dashboardId,
      direction: opts.direction,
      category: opts.category,
      description: opts.description,
      amount: opts.amount,
      entry_date: d,
      status: opts.status,
      recurring: true,
      recurrence_period: opts.period,
      related_user_id: opts.relatedUserId,
      created_by: opts.createdBy,
    }))
  );
}

// ---- ATUALIZAR LANÇAMENTO ----

export async function updateEntryAction(
  prevState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const ctx = await getAuthContext();
  if (!ctx?.permissions.pode_ver_financeiro) return { error: 'Sem permissão.' };

  const entryId = formData.get('entryId') as string;
  if (!entryId) return { error: 'Dados inválidos.' };

  const amountStr = formData.get('amount') as string;
  const amount = amountStr ? parseFloat(amountStr) : undefined;
  if (amount !== undefined && (isNaN(amount) || amount <= 0)) return { error: 'Valor inválido.' };

  const directionRaw = formData.get('direction') as string;
  const categoryRaw = formData.get('category') as string;
  const entryDateRaw = formData.get('entry_date') as string;
  const statusRaw = formData.get('status') as string;

  if (directionRaw && !['entrada', 'saida'].includes(directionRaw)) {
    return { error: 'Direção inválida.' };
  }
  if (statusRaw && !['pago', 'a_pagar', 'a_receber'].includes(statusRaw)) {
    return { error: 'Status inválido.' };
  }

  const updatePayload: Record<string, unknown> = {
    description: (formData.get('description') as string)?.trim() || null,
    dashboard_id: (formData.get('dashboard_id') as string) || null,
  };
  if (directionRaw) updatePayload.direction = directionRaw as 'entrada' | 'saida';
  if (categoryRaw) updatePayload.category = categoryRaw;
  if (amount !== undefined) updatePayload.amount = amount;
  if (entryDateRaw) updatePayload.entry_date = entryDateRaw;
  if (statusRaw) updatePayload.status = statusRaw as 'pago' | 'a_pagar' | 'a_receber';

  const supabase = await createClient();
  const { error } = await supabase
    .from('finance_entries')
    .update(updatePayload)
    .eq('id', entryId)
    .eq('operation_id', ctx.profile.operation_id);

  if (error) return { error: 'Erro ao atualizar.' };

  revalidatePath('/app/financeiro');
  revalidatePath('/app');
  return { success: true };
}

// ---- EXCLUIR LANÇAMENTO ----

export async function deleteEntryAction(
  prevState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const ctx = await getAuthContext();
  if (!ctx?.permissions.pode_ver_financeiro) return { error: 'Sem permissão.' };

  const entryId = formData.get('entryId') as string;
  if (!entryId) return { error: 'Dados inválidos.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('finance_entries')
    .delete()
    .eq('id', entryId)
    .eq('operation_id', ctx.profile.operation_id);

  if (error) return { error: 'Erro ao excluir.' };

  revalidatePath('/app/financeiro');
  revalidatePath('/app');
  return { success: true };
}
