import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/auth/getPermissions';
import { createClient } from '@/lib/supabase/server';
import { CalendarioClient } from './CalendarioClient';
import type { CalendarioEvent, CustomEvent } from './CalendarioClient';

export default async function CalendarioPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const opId = ctx.profile.operation_id;
  const canSeeFinancial = ctx.permissions.pode_ver_financeiro;
  const isHeadOrDono = ctx.profile.role === 'head' || ctx.profile.role === 'dono';

  // Busca 3 meses ao redor do atual
  const now  = new Date();
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

  // Recursos monitorados
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

  // Eventos customizados do calendário
  const { data: customRaw } = await supabase
    .from('calendar_events')
    .select('id, title, description, event_date, event_time, event_type, color, created_by')
    .eq('operation_id', opId)
    .gte('event_date', from)
    .lte('event_date', to)
    .order('event_date', { ascending: true });

  const customEvents: CustomEvent[] = (customRaw ?? []).map((c: {
    id: string; title: string; description: string | null;
    event_date: string; event_time: string | null;
    event_type: string; color: string; created_by: string;
  }) => ({
    id:          c.id,
    title:       c.title,
    description: c.description,
    event_date:  c.event_date,
    event_time:  c.event_time,
    event_type:  c.event_type,
    color:       c.color,
    created_by:  c.created_by,
  }));

  // Adiciona eventos custom na lista principal
  for (const c of customEvents) {
    events.push({
      id:    c.id,
      date:  c.event_date,
      label: c.title,
      layer: 'custom',
      meta:  c.event_type,
    });
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-white/[0.06] relative anim-slide-down border-bottom-run overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-orange-500/30 via-orange-500/8 to-transparent" />
        <div className="absolute -top-8 -left-8 w-48 h-48 bg-orange-500/[0.04] blur-3xl rounded-full pointer-events-none" />
        <div className="flex items-center gap-4 relative">
          <div className="w-1.5 h-8 bg-gradient-to-b from-orange-400 to-orange-600 rounded-full shrink-0 shadow-[0_0_12px_rgba(249,115,22,0.8)]" />
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Calendário</h1>
            <p className="text-[11px] text-zinc-500 font-mono mt-0.5 tracking-widest uppercase">Eventos · Prazos · Reuniões</p>
          </div>
        </div>
      </div>

      <div className="anim-fade-in delay-200">
        <CalendarioClient
          events={events}
          customEvents={customEvents}
          canSeeFinancial={canSeeFinancial}
          canCreate={isHeadOrDono || true}
          currentUserId={ctx.profile.id}
          isHeadOrDono={isHeadOrDono}
        />
      </div>
    </div>
  );
}
