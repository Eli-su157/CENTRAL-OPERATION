import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/auth/getPermissions';
import { createClient } from '@/lib/supabase/server';
import { CalendarioClient } from './CalendarioClient';
import type { CalendarioEvent } from './CalendarioClient';

export default async function CalendarioPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/');

  const supabase = await createClient();
  const opId = ctx.profile.operation_id;
  const canSeeFinancial = ctx.permissions.pode_ver_financeiro;

  // Busca os 3 meses ao redor do atual para navegação sem refetch
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
  const to   = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().split('T')[0];

  const events: CalendarioEvent[] = [];

  // Tarefas com prazo
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, due_date, status')
    .eq('operation_id', opId)
    .not('due_date', 'is', null)
    .gte('due_date', from)
    .lte('due_date', to);

  for (const t of tasks ?? []) {
    if (!t.due_date) continue;
    events.push({
      id:    t.id,
      date:  t.due_date,
      label: t.title,
      layer: 'tarefa',
      meta:  t.status,
    });
  }

  // Lançamentos financeiros (só se tiver permissão)
  if (canSeeFinancial) {
    const { data: entries } = await supabase
      .from('finance_entries')
      .select('id, entry_date, category, amount, status, direction')
      .eq('operation_id', opId)
      .in('status', ['a_receber', 'a_pagar'])
      .gte('entry_date', from)
      .lte('entry_date', to);

    for (const e of entries ?? []) {
      const layer = e.status === 'a_receber' ? 'a_receber' : 'a_pagar';
      const valor = new Intl.NumberFormat('pt-BR', {
        style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
      }).format(Number(e.amount));
      events.push({
        id:    e.id,
        date:  e.entry_date,
        label: `${e.category ?? (e.direction === 'entrada' ? 'Entrada' : 'Saída')} · ${valor}`,
        layer,
        meta:  e.status,
      });
    }
  }

  // Recursos monitorados com last_checked_at (vencimento técnico = cheque mais antigo)
  const { data: resources } = await supabase
    .from('monitored_resources')
    .select('id, label, last_checked_at, status')
    .eq('operation_id', opId)
    .not('last_checked_at', 'is', null);

  for (const r of resources ?? []) {
    if (!r.last_checked_at) continue;
    const dateOnly = (r.last_checked_at as string).split('T')[0];
    if (dateOnly < from || dateOnly > to) continue;
    events.push({
      id:    r.id,
      date:  dateOnly,
      label: r.label,
      layer: 'recurso',
      meta:  r.status,
    });
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="mb-8 pb-6 border-b border-white/[0.05] relative">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-orange-500/20 via-orange-500/5 to-transparent" />
        <div className="flex items-center gap-3 mb-1">
          <div className="w-1 h-6 bg-orange-500 rounded-full shrink-0" />
          <h1 className="text-2xl font-bold text-white tracking-tight">Calendário</h1>
        </div>
      </div>

      <CalendarioClient
        events={events}
        canSeeFinancial={canSeeFinancial}
      />
    </div>
  );
}
