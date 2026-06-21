'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/auth/getPermissions';

export async function createCalendarEventAction(_: unknown, fd: FormData) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: 'Não autenticado' };

  const title      = (fd.get('title')      as string | null)?.trim() ?? '';
  const event_date = (fd.get('event_date') as string | null)?.trim() ?? '';
  const event_time = (fd.get('event_time') as string | null)?.trim() || null;
  const event_type = (fd.get('event_type') as string | null) ?? 'outro';
  const color      = (fd.get('color')      as string | null) ?? 'orange';
  const description= (fd.get('description')as string | null)?.trim() || null;

  if (!title)      return { error: 'Título obrigatório' };
  if (!event_date) return { error: 'Data obrigatória' };

  const validTypes = ['reuniao', 'prazo', 'lembrete', 'outro'];
  if (!validTypes.includes(event_type)) return { error: 'Tipo inválido' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const { error } = await supabase.from('calendar_events').insert({
    operation_id: ctx.profile.operation_id,
    created_by:   ctx.profile.id,
    title,
    description,
    event_date,
    event_time,
    event_type,
    color,
  });

  if (error) return { error: error.message };

  revalidatePath('/app/calendario');
  return { ok: true };
}

export async function deleteCalendarEventAction(_: unknown, fd: FormData) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: 'Não autenticado' };

  const id = (fd.get('id') as string | null)?.trim() ?? '';
  if (!id) return { error: 'ID inválido' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', id)
    .eq('operation_id', ctx.profile.operation_id);

  if (error) return { error: error.message };

  revalidatePath('/app/calendario');
  return { ok: true };
}
