'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthContext } from '@/lib/auth/getPermissions';
import type { TaskStatus, UserSector } from '@/lib/types/database';
import type { AttachmentType } from '@/lib/types/tasks';

export type TaskActionState = { error: string } | { success: true } | null;

// ---- CRIAR TAREFA ----

export async function createTaskAction(
  prevState: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: 'Não autenticado.' };

  const scope = ctx.permissions.pode_atribuir_tarefa;
  if (scope === 'nenhum') return { error: 'Sem permissão para criar tarefas.' };

  const title = (formData.get('title') as string)?.trim();
  const description = (formData.get('description') as string)?.trim() || null;
  const assigneeId = (formData.get('assignee_user_id') as string) || null;
  const sector = formData.get('sector') as UserSector;
  const priority = (formData.get('priority') as string) || 'media';
  const dueDate = (formData.get('due_date') as string) || null;
  const dashboardId = (formData.get('dashboard_id') as string) || null;

  if (!title) return { error: 'Título obrigatório.' };
  if (!sector) return { error: 'Setor obrigatório.' };

  // Validar se o setor está dentro do escopo do criador
  if (scope === 'meu_setor' && sector !== ctx.profile.sector) {
    return { error: 'Você só pode criar tarefas do seu setor.' };
  }

  // Validar se o assignee está dentro do escopo
  if (assigneeId && scope === 'meu_setor') {
    const admin = createAdminClient();
    const { data: assignee } = await admin
      .from('profiles')
      .select('sector')
      .eq('id', assigneeId)
      .eq('operation_id', ctx.profile.operation_id)
      .single();

    if (!assignee || assignee.sector !== ctx.profile.sector) {
      return { error: 'Você só pode atribuir tarefas a pessoas do seu setor.' };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.from('tasks').insert({
    operation_id: ctx.profile.operation_id,
    dashboard_id: dashboardId || null,
    title,
    description,
    assignee_user_id: assigneeId,
    sector,
    priority: priority as 'baixa' | 'media' | 'alta',
    due_date: dueDate || null,
    created_by_user_id: ctx.userId,
  });

  if (error) return { error: 'Erro ao criar tarefa.' };

  revalidatePath('/app/tarefas');
  revalidatePath('/app');
  return { success: true };
}

// ---- ATUALIZAR STATUS ----

export async function updateTaskStatusAction(
  prevState: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: 'Não autenticado.' };

  const taskId = formData.get('taskId') as string;
  const newStatus = formData.get('status') as TaskStatus;

  if (!taskId || !newStatus) return { error: 'Dados inválidos.' };

  const supabase = await createClient();

  // Verificar acesso: assignee, criador, dono ou head
  const { data: task } = await supabase
    .from('tasks')
    .select('id, created_by_user_id, assignee_user_id')
    .eq('id', taskId)
    .eq('operation_id', ctx.profile.operation_id)
    .single();

  if (!task) return { error: 'Tarefa não encontrada.' };

  const canUpdate =
    task.created_by_user_id === ctx.userId ||
    task.assignee_user_id === ctx.userId ||
    ctx.profile.role === 'dono' ||
    ctx.profile.role === 'head';

  if (!canUpdate) return { error: 'Sem permissão.' };

  const { error } = await supabase
    .from('tasks')
    .update({ status: newStatus })
    .eq('id', taskId);

  if (error) return { error: 'Erro ao atualizar status.' };

  revalidatePath('/app/tarefas');
  revalidatePath('/app');
  return { success: true };
}

// ---- EXCLUIR TAREFA ----

export async function deleteTaskAction(
  prevState: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: 'Não autenticado.' };

  const taskId = formData.get('taskId') as string;
  if (!taskId) return { error: 'Dados inválidos.' };

  const supabase = await createClient();

  const { data: task } = await supabase
    .from('tasks')
    .select('created_by_user_id')
    .eq('id', taskId)
    .eq('operation_id', ctx.profile.operation_id)
    .single();

  if (!task) return { error: 'Tarefa não encontrada.' };

  const canDelete =
    task.created_by_user_id === ctx.userId ||
    ctx.profile.role === 'dono' ||
    ctx.profile.role === 'head';

  if (!canDelete) return { error: 'Sem permissão.' };

  await supabase.from('tasks').delete().eq('id', taskId);

  revalidatePath('/app/tarefas');
  revalidatePath('/app');
  return { success: true };
}

// ---- ADICIONAR COMENTÁRIO ----

export async function addCommentAction(
  prevState: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: 'Não autenticado.' };

  const taskId = formData.get('taskId') as string;
  const body = (formData.get('body') as string)?.trim();

  if (!taskId || !body) return { error: 'Comentário vazio.' };

  const supabase = await createClient();

  // Verifica que a tarefa é da operação
  const { data: task } = await supabase
    .from('tasks')
    .select('id')
    .eq('id', taskId)
    .eq('operation_id', ctx.profile.operation_id)
    .single();

  if (!task) return { error: 'Tarefa não encontrada.' };

  const { error } = await supabase.from('task_comments').insert({
    task_id: taskId,
    operation_id: ctx.profile.operation_id,
    user_id: ctx.userId,
    body,
  });

  if (error) return { error: 'Erro ao comentar.' };

  revalidatePath('/app/tarefas');
  return { success: true };
}

// ---- ADICIONAR ANEXO (link ou URL de arquivo já uploadado) ----

export async function addAttachmentAction(
  prevState: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: 'Não autenticado.' };

  const taskId = formData.get('taskId') as string;
  const url = (formData.get('url') as string)?.trim();
  const label = (formData.get('label') as string)?.trim();
  const type = (formData.get('type') as AttachmentType) ?? 'link';

  if (!taskId || !url || !label) return { error: 'Preencha URL e descrição.' };

  const supabase = await createClient();

  const { data: task } = await supabase
    .from('tasks')
    .select('id')
    .eq('id', taskId)
    .eq('operation_id', ctx.profile.operation_id)
    .single();

  if (!task) return { error: 'Tarefa não encontrada.' };

  const { error } = await supabase.from('task_attachments').insert({
    task_id: taskId,
    operation_id: ctx.profile.operation_id,
    type,
    url,
    label,
  });

  if (error) return { error: 'Erro ao adicionar anexo.' };

  revalidatePath('/app/tarefas');
  return { success: true };
}

// ---- EXCLUIR COMENTÁRIO ----

export async function deleteCommentAction(
  prevState: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: 'Não autenticado.' };

  const commentId = formData.get('commentId') as string;
  if (!commentId) return { error: 'Dados inválidos.' };

  const supabase = await createClient();
  await supabase
    .from('task_comments')
    .delete()
    .eq('id', commentId)
    .eq('operation_id', ctx.profile.operation_id);

  revalidatePath('/app/tarefas');
  return { success: true };
}
