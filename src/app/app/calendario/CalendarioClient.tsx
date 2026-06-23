'use client';

import { useState, useMemo, useTransition, useEffect, useRef } from 'react';
import { createCalendarEventAction, deleteCalendarEventAction } from './actions';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type EventLayer = 'a_receber' | 'a_pagar' | 'tarefa' | 'recurso' | 'custom';

export interface CalendarioEvent {
  id:    string;
  date:  string;
  label: string;
  layer: EventLayer;
  meta?: string;
}

export interface CustomEvent {
  id:          string;
  title:       string;
  description: string | null;
  event_date:  string;
  event_time:  string | null;
  event_type:  string;
  color:       string;
  created_by:  string;
}

interface Props {
  events:          CalendarioEvent[];
  customEvents:    CustomEvent[];
  canSeeFinancial: boolean;
  canCreate:       boolean;
  currentUserId:   string;
  isHeadOrDono:    boolean;
}

// ── Config camadas ─────────────────────────────────────────────────────────────

const LAYER_CONFIG = {
  a_receber: { label: 'A receber',          dot: 'bg-emerald-400', pill: 'bg-emerald-500/[0.12] border-emerald-500/20 text-emerald-300' },
  a_pagar:   { label: 'A pagar',            dot: 'bg-red-400',     pill: 'bg-red-500/[0.12] border-red-500/20 text-red-300' },
  tarefa:    { label: 'Prazo de tarefa',    dot: 'bg-orange-400',  pill: 'bg-orange-500/[0.12] border-orange-500/20 text-orange-300' },
  recurso:   { label: 'Recurso monitorado', dot: 'bg-zinc-400',    pill: 'bg-zinc-500/[0.12] border-zinc-500/20 text-zinc-400' },
  custom:    { label: 'Evento',             dot: 'bg-blue-400',    pill: 'bg-blue-500/[0.12] border-blue-500/20 text-blue-300' },
};

const EVENT_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  reuniao:   { label: 'Reunião',   icon: '👥', color: 'blue'   },
  prazo:     { label: 'Prazo',     icon: '⏱️', color: 'red'    },
  lembrete:  { label: 'Lembrete', icon: '🔔', color: 'amber'  },
  outro:     { label: 'Outro',     icon: '📌', color: 'orange' },
};

const COLOR_OPTIONS = [
  { value: 'orange', label: 'Laranja', cls: 'bg-orange-500' },
  { value: 'blue',   label: 'Azul',    cls: 'bg-blue-500'   },
  { value: 'emerald',label: 'Verde',   cls: 'bg-emerald-500'},
  { value: 'red',    label: 'Vermelho',cls: 'bg-red-500'    },
  { value: 'purple', label: 'Roxo',    cls: 'bg-purple-500' },
  { value: 'amber',  label: 'Amarelo', cls: 'bg-amber-500'  },
];

const ALL_LAYERS: EventLayer[] = ['a_receber', 'a_pagar', 'tarefa', 'recurso', 'custom'];

const WEEKDAYS    = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                     'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// ── Helpers ────────────────────────────────────────────────────────────────────

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstWeekday(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function toIso(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function formatDateBR(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function colorDot(color: string) {
  const map: Record<string, string> = {
    orange: 'bg-orange-500', blue: 'bg-blue-500', emerald: 'bg-emerald-500',
    red: 'bg-red-500', purple: 'bg-purple-500', amber: 'bg-amber-500',
  };
  return map[color] ?? 'bg-zinc-500';
}
function colorPill(color: string) {
  const map: Record<string, string> = {
    orange: 'bg-orange-500/[0.12] border-orange-500/25 text-orange-300',
    blue:   'bg-blue-500/[0.12] border-blue-500/25 text-blue-300',
    emerald:'bg-emerald-500/[0.12] border-emerald-500/25 text-emerald-300',
    red:    'bg-red-500/[0.12] border-red-500/25 text-red-300',
    purple: 'bg-purple-500/[0.12] border-purple-500/25 text-purple-300',
    amber:  'bg-amber-500/[0.12] border-amber-500/25 text-amber-300',
  };
  return map[color] ?? 'bg-zinc-500/[0.12] border-zinc-500/25 text-zinc-300';
}

// ── Modal de criação ───────────────────────────────────────────────────────────

function CreateEventModal({ defaultDate, onClose }: { defaultDate: string; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError]   = useState<string | null>(null);
  const [title, setTitle]   = useState('');
  const [date, setDate]     = useState(defaultDate);
  const [time, setTime]     = useState('');
  const [type, setType]     = useState<'reuniao'|'prazo'|'lembrete'|'outro'>('reuniao');
  const [color, setColor]   = useState('orange');
  const [desc, setDesc]     = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set('title',       title);
    fd.set('event_date',  date);
    fd.set('event_time',  time);
    fd.set('event_type',  type);
    fd.set('color',       color);
    fd.set('description', desc);
    startTransition(async () => {
      const res = await createCalendarEventAction(null, fd);
      if (res && 'error' in res) { setError(res.error); return; }
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-md bg-[#0c0c0f] border border-white/[0.10] rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)]"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'fadeSlideUp 0.18s ease-out' }}
      >
        {/* Header laranja */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500/60 to-transparent" />
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
                <line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/>
              </svg>
            </div>
            <p className="text-sm font-bold text-white">Novo Evento</p>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors p-1 rounded-lg hover:bg-white/[0.05]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">

          {/* Título */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono mb-1.5">Título *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Reunião de alinhamento"
              required
              className="w-full bg-white/[0.03] border border-white/[0.08] text-zinc-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/40 placeholder-zinc-700 transition-colors hover:border-white/[0.12]"
            />
          </div>

          {/* Data + Hora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono mb-1.5">Data *</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="w-full bg-white/[0.03] border border-white/[0.08] text-zinc-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/40 transition-colors hover:border-white/[0.12]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono mb-1.5">Horário</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] text-zinc-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/40 transition-colors hover:border-white/[0.12]"
              />
            </div>
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono mb-1.5">Tipo</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.entries(EVENT_TYPE_CONFIG) as [string, { label: string; icon: string; color: string }][]).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setType(key as typeof type)}
                  className={`flex flex-col items-center gap-1 py-2 rounded-xl border text-[10px] font-semibold transition-all ${
                    type === key
                      ? 'bg-orange-500/10 border-orange-500/30 text-orange-300'
                      : 'bg-white/[0.02] border-white/[0.06] text-zinc-600 hover:text-zinc-400 hover:border-white/[0.10]'
                  }`}
                >
                  <span>{cfg.icon}</span>
                  <span>{cfg.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cor */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono mb-1.5">Cor</label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  title={c.label}
                  className={`w-7 h-7 rounded-full ${c.cls} transition-all flex items-center justify-center ${
                    color === c.value ? 'ring-2 ring-white/60 ring-offset-2 ring-offset-[#0c0c0f]' : 'opacity-50 hover:opacity-80'
                  }`}
                >
                  {color === c.value && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono mb-1.5">Descrição (opcional)</label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={2}
              placeholder="Detalhes adicionais..."
              className="w-full bg-white/[0.03] border border-white/[0.08] text-zinc-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/40 placeholder-zinc-700 resize-none transition-colors hover:border-white/[0.12]"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/[0.06] border border-red-500/15 rounded-xl px-3 py-2">{error}</p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-orange-500 hover:bg-orange-400 text-white transition-all shadow-[0_0_20px_-4px_rgba(249,115,22,0.5)] disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Criando…
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Criar evento
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] border border-white/[0.06] transition-all"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Painel do dia ──────────────────────────────────────────────────────────────

function DayPanel({
  iso, events, customEvents, isHeadOrDono, currentUserId, onClose, onNewEvent,
}: {
  iso: string;
  events: CalendarioEvent[];
  customEvents: CustomEvent[];
  isHeadOrDono: boolean;
  currentUserId: string;
  onClose: () => void;
  onNewEvent: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const customForDay = customEvents.filter(c => c.event_date === iso);

  function handleDelete(id: string) {
    if (!confirm('Excluir este evento?')) return;
    const fd = new FormData();
    fd.set('id', id);
    startTransition(async () => { await deleteCalendarEventAction(null, fd); });
  }

  return (
    <div
      className="bg-[#0c0c0f] border border-white/[0.10] rounded-2xl overflow-hidden"
      style={{ animation: 'fadeSlideUp 0.15s ease-out' }}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div>
          <p className="text-xs font-bold text-white">{formatDateBR(iso)}</p>
          <p className="text-[10px] text-zinc-600 font-mono mt-0.5">{events.length} evento{events.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onNewEvent}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 transition-all"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Novo
          </button>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors p-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="p-3 flex flex-col gap-2 max-h-64 overflow-y-auto">
        {events.length === 0 && (
          <div className="py-6 text-center">
            <p className="text-xs text-zinc-700">Nenhum evento neste dia</p>
            <button
              onClick={onNewEvent}
              className="mt-3 text-xs text-orange-400 hover:text-orange-300 transition-colors"
            >
              + Criar evento
            </button>
          </div>
        )}

        {events.map(ev => {
          const cfg = LAYER_CONFIG[ev.layer];
          const customData = ev.layer === 'custom' ? customForDay.find(c => c.id === ev.id) : null;
          const canDelete = ev.layer === 'custom' && (isHeadOrDono || customData?.created_by === currentUserId);

          return (
            <div key={ev.id} className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${cfg.pill} group`}>
              <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${cfg.dot}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{ev.label}</p>
                {customData?.event_time && (
                  <p className="text-[10px] opacity-70 mt-0.5 font-mono">{customData.event_time.slice(0,5)}</p>
                )}
                {customData?.description && (
                  <p className="text-[10px] opacity-60 mt-1 leading-relaxed line-clamp-2">{customData.description}</p>
                )}
                <p className="text-[9px] opacity-50 mt-0.5 uppercase tracking-wider font-mono">
                  {ev.layer === 'custom'
                    ? EVENT_TYPE_CONFIG[customData?.event_type ?? 'outro']?.label ?? ev.layer
                    : cfg.label}
                </p>
              </div>
              {canDelete && (
                <button
                  onClick={() => handleDelete(ev.id)}
                  disabled={isPending}
                  className="opacity-0 group-hover:opacity-100 text-red-500/60 hover:text-red-400 transition-all p-0.5 rounded shrink-0"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export function CalendarioClient({ events, customEvents, canSeeFinancial, canCreate, currentUserId, isHeadOrDono }: Props) {
  const today = new Date();
  const [year,  setYear]   = useState(today.getFullYear());
  const [month, setMonth]  = useState(today.getMonth());
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [modalOpen, setModalOpen]     = useState(false);
  const [modalDefaultDate, setModalDefaultDate] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  const defaultActive = useMemo<Record<EventLayer, boolean>>(() => ({
    a_receber: canSeeFinancial,
    a_pagar:   canSeeFinancial,
    tarefa:    true,
    recurso:   true,
    custom:    true,
  }), [canSeeFinancial]);

  const [active, setActive] = useState<Record<EventLayer, boolean>>(defaultActive);

  function toggleLayer(l: EventLayer) {
    setActive(prev => ({ ...prev, [l]: !prev[l] }));
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedIso(null);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedIso(null);
  }
  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedIso(null);
  }

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  // Grade
  const daysInMonth  = getDaysInMonth(year, month);
  const firstWeekday = getFirstWeekday(year, month);
  const prevDays     = getDaysInMonth(year, month === 0 ? 11 : month - 1);
  const prevYear0    = month === 0 ? year - 1 : year;
  const prevMonth0   = month === 0 ? 11 : month - 1;
  const nextYear0    = month === 11 ? year + 1 : year;
  const nextMonth0   = month === 11 ? 0 : month + 1;

  type Cell = { day: number; type: 'prev' | 'current' | 'next'; iso: string };
  const cells: Cell[] = [];
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const d = prevDays - i;
    cells.push({ day: d, type: 'prev', iso: toIso(prevYear0, prevMonth0, d) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, type: 'current', iso: toIso(year, month, d) });
  }
  const trailing = 42 - cells.length;
  for (let d = 1; d <= trailing; d++) {
    cells.push({ day: d, type: 'next', iso: toIso(nextYear0, nextMonth0, d) });
  }

  // Índice de eventos por data
  const eventsByDate = useMemo(() => {
    const idx = new Map<string, CalendarioEvent[]>();
    for (const ev of events) {
      if (!active[ev.layer]) continue;
      const list = idx.get(ev.date) ?? [];
      list.push(ev);
      idx.set(ev.date, list);
    }
    return idx;
  }, [events, active]);

  const visibleLayers: EventLayer[] = canSeeFinancial
    ? ALL_LAYERS
    : ALL_LAYERS.filter(l => l !== 'a_receber' && l !== 'a_pagar');

  // Próximos eventos (a partir de hoje, próximos 30 dias)
  const todayDateStr = today.toDateString();
  const upcomingEvents = useMemo(() => {
    const todayIso = toIso(today.getFullYear(), today.getMonth(), today.getDate());
    const limit    = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
    const limitIso = toIso(limit.getFullYear(), limit.getMonth(), limit.getDate());
    return events
      .filter(ev => active[ev.layer] && ev.date >= todayIso && ev.date <= limitIso)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 8);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, active, todayDateStr]);

  function openNewEventModal(iso?: string) {
    setModalDefaultDate(iso ?? toIso(today.getFullYear(), today.getMonth(), today.getDate()));
    setModalOpen(true);
  }

  // Click fora do painel fecha
  useEffect(() => {
    if (!selectedIso) return;
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setSelectedIso(null);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [selectedIso]);

  const selectedEvents = selectedIso ? (eventsByDate.get(selectedIso) ?? []) : [];

  // Stats do mês
  const monthIso = `${year}-${String(month+1).padStart(2,'0')}`;
  const monthEvents = events.filter(ev => ev.date.startsWith(monthIso));
  const monthTasks  = monthEvents.filter(ev => ev.layer === 'tarefa').length;
  const monthCustom = monthEvents.filter(ev => ev.layer === 'custom').length;

  return (
    <>
      {modalOpen && (
        <CreateEventModal
          defaultDate={modalDefaultDate}
          onClose={() => setModalOpen(false)}
        />
      )}

      <div className="flex flex-col gap-5">

        {/* ── Toolbar: filtros + botão novo ──────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.12em] font-mono shrink-0">Camadas</span>
            {visibleLayers.map(layer => {
              const cfg = LAYER_CONFIG[layer];
              const on  = active[layer];
              return (
                <button
                  key={layer}
                  onClick={() => toggleLayer(layer)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
                    on ? `${cfg.pill} border` : 'bg-transparent border-white/[0.07] text-zinc-600 hover:border-white/[0.12] hover:text-zinc-400'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${on ? cfg.dot : 'bg-zinc-700'}`} />
                  {cfg.label}
                </button>
              );
            })}
          </div>
          {canCreate && (
            <button
              onClick={() => openNewEventModal()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-orange-500 hover:bg-orange-400 text-white transition-all shadow-[0_0_20px_-6px_rgba(249,115,22,0.7)] hover:shadow-[0_0_28px_-4px_rgba(249,115,22,0.8)]"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Novo Evento
            </button>
          )}
        </div>

        {/* ── Layout principal: calendário + sidebar ──────────────── */}
        <div className="flex flex-col xl:flex-row gap-5 items-start">

          {/* Calendário */}
          <div className="flex-1 min-w-0 bg-[#0c0c0f] border border-white/[0.08] rounded-2xl overflow-hidden">

            {/* Header do mês */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <button
                onClick={prevMonth}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05] transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              </button>

              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-base font-black text-white text-center">
                    {MONTH_NAMES[month]} <span className="text-zinc-500 font-normal">{year}</span>
                  </h2>
                  <p className="text-[9px] text-zinc-700 font-mono text-center mt-0.5">
                    {monthTasks > 0 && `${monthTasks} prazo${monthTasks !== 1 ? 's' : ''}`}
                    {monthTasks > 0 && monthCustom > 0 && ' · '}
                    {monthCustom > 0 && `${monthCustom} evento${monthCustom !== 1 ? 's' : ''}`}
                  </p>
                </div>
                {!isCurrentMonth && (
                  <button
                    onClick={goToday}
                    className="text-[11px] text-orange-400 border border-orange-500/20 bg-orange-500/10 px-2.5 py-1 rounded-lg hover:bg-orange-500/20 transition-colors font-medium"
                  >
                    Hoje
                  </button>
                )}
              </div>

              <button
                onClick={nextMonth}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05] transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>

            {/* Grade */}
            <div className="p-3">
              {/* Dias da semana */}
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map(d => (
                  <div key={d} className="text-center text-[10px] font-bold text-zinc-700 uppercase tracking-[0.10em] py-2">
                    {d}
                  </div>
                ))}
              </div>

              {/* Células */}
              <div className="grid grid-cols-7 gap-[2px]">
                {cells.map((cell, i) => {
                  const isCurrent = cell.type === 'current';
                  const isToday   = isCurrent && cell.day === today.getDate() && isCurrentMonth;
                  const isSelected = cell.iso === selectedIso;
                  const dayEvents  = isCurrent ? (eventsByDate.get(cell.iso) ?? []) : [];
                  const hasEvents  = dayEvents.length > 0;
                  const MAX_PILLS  = 2;
                  const shown      = dayEvents.slice(0, MAX_PILLS);
                  const hiddenCnt  = dayEvents.length - shown.length;

                  return (
                    <div
                      key={i}
                      onClick={() => {
                        if (!isCurrent) return;
                        if (isSelected) setSelectedIso(null);
                        else { setSelectedIso(cell.iso); }
                      }}
                      onDoubleClick={() => {
                        if (isCurrent && canCreate) openNewEventModal(cell.iso);
                      }}
                      className={`
                        relative min-h-[80px] p-1.5 flex flex-col gap-1 rounded-xl
                        transition-all duration-100 select-none
                        ${!isCurrent ? 'opacity-20 cursor-default' : 'cursor-pointer'}
                        ${isCurrent && !isSelected ? 'hover:bg-white/[0.03]' : ''}
                        ${isSelected ? 'bg-orange-500/[0.08] ring-1 ring-orange-500/30' : ''}
                        ${isToday && !isSelected ? 'bg-orange-500/[0.04]' : ''}
                      `}
                    >
                      {/* Número */}
                      <span className={`
                        self-start inline-flex items-center justify-center w-6 h-6 rounded-full text-xs leading-none shrink-0 transition-all
                        ${isToday
                          ? 'bg-orange-500 text-white font-black shadow-[0_0_10px_rgba(249,115,22,0.5)]'
                          : isCurrent
                            ? 'text-zinc-300 font-semibold'
                            : 'text-zinc-700 font-normal'}
                      `}>
                        {cell.day}
                      </span>

                      {/* Dot cluster para dias com muitos eventos */}
                      {hasEvents && shown.length === 0 && (
                        <div className="flex gap-0.5 flex-wrap px-0.5">
                          {dayEvents.slice(0, 3).map(ev => (
                            <span key={ev.id} className={`w-1.5 h-1.5 rounded-full ${LAYER_CONFIG[ev.layer].dot}`} />
                          ))}
                        </div>
                      )}

                      {/* Pílulas */}
                      {shown.map(ev => {
                        const cfg = LAYER_CONFIG[ev.layer];
                        const customEv = ev.layer === 'custom' ? customEvents.find(c => c.id === ev.id) : null;
                        const pillCls  = customEv ? colorPill(customEv.color) : cfg.pill;
                        const dotCls   = customEv ? colorDot(customEv.color) : cfg.dot;
                        return (
                          <div
                            key={ev.id}
                            title={ev.label}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] leading-tight truncate w-full border ${pillCls}`}
                          >
                            <span className={`w-1 h-1 rounded-full shrink-0 ${dotCls}`} />
                            <span className="truncate font-medium">{ev.label}</span>
                          </div>
                        );
                      })}

                      {hiddenCnt > 0 && (
                        <span className="text-[9px] text-zinc-600 px-1 font-mono">+{hiddenCnt}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hint */}
            <div className="px-4 py-2.5 border-t border-white/[0.04] flex items-center justify-between">
              <p className="text-[9px] text-zinc-700 font-mono">Clique para ver · Duplo-clique para criar</p>
              {canCreate && (
                <button
                  onClick={() => openNewEventModal()}
                  className="text-[9px] text-orange-500/60 hover:text-orange-400 transition-colors font-mono"
                >
                  + novo evento
                </button>
              )}
            </div>
          </div>

          {/* ── Sidebar direita ─────────────────────────────────────── */}
          <div className="w-full xl:w-72 shrink-0 flex flex-col gap-4" ref={panelRef}>

            {/* Painel do dia selecionado */}
            {selectedIso && (
              <div className="relative">
                <DayPanel
                  iso={selectedIso}
                  events={selectedEvents}
                  customEvents={customEvents}
                  isHeadOrDono={isHeadOrDono}
                  currentUserId={currentUserId}
                  onClose={() => setSelectedIso(null)}
                  onNewEvent={() => {
                    openNewEventModal(selectedIso);
                    setSelectedIso(null);
                  }}
                />
              </div>
            )}

            {/* Mini agenda: próximos 30 dias */}
            <div className="bg-[#0c0c0f] border border-white/[0.08] rounded-2xl overflow-hidden">
              <div className="px-4 py-3.5 border-b border-white/[0.05] flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-lg bg-orange-500/10 border border-orange-500/15 flex items-center justify-center shrink-0">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                </div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono flex-1">Próximos 30 dias</p>
                {upcomingEvents.length > 0 && (
                  <span className="text-[9px] text-zinc-700 font-mono">{upcomingEvents.length}</span>
                )}
              </div>

              {upcomingEvents.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mx-auto mb-3">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3f3f46" strokeWidth="1.5">
                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </div>
                  <p className="text-xs text-zinc-700">Sem eventos nos próximos dias</p>
                  {canCreate && (
                    <button
                      onClick={() => openNewEventModal()}
                      className="mt-2 text-xs text-orange-500/60 hover:text-orange-400 transition-colors"
                    >
                      + Criar evento
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {upcomingEvents.map(ev => {
                    const cfg = LAYER_CONFIG[ev.layer];
                    const customEv = ev.layer === 'custom' ? customEvents.find(c => c.id === ev.id) : null;
                    const dotCls   = customEv ? colorDot(customEv.color) : cfg.dot;
                    const [evY, evM, evD] = ev.date.split('-');
                    const isToday2 = ev.date === toIso(today.getFullYear(), today.getMonth(), today.getDate());
                    const isTomorrow = (() => {
                      const tom = new Date(today); tom.setDate(tom.getDate() + 1);
                      return ev.date === toIso(tom.getFullYear(), tom.getMonth(), tom.getDate());
                    })();

                    return (
                      <div key={ev.id} className="flex items-start gap-3 px-4 py-3 group hover:bg-white/[0.02] transition-colors">
                        <div className="shrink-0 text-center pt-0.5">
                          <p className="text-[9px] text-zinc-600 font-mono uppercase">{MONTH_NAMES[parseInt(evM)-1].slice(0,3)}</p>
                          <p className="text-lg font-black text-zinc-300 leading-none">{evD}</p>
                          {isToday2 && <p className="text-[8px] text-orange-400 font-mono">hoje</p>}
                          {isTomorrow && <p className="text-[8px] text-amber-400 font-mono">amanhã</p>}
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotCls}`} />
                            <p className="text-xs font-semibold text-zinc-200 truncate">{ev.label}</p>
                          </div>
                          {customEv?.event_time && (
                            <p className="text-[9px] text-zinc-600 font-mono">{customEv.event_time.slice(0,5)}</p>
                          )}
                          <p className="text-[9px] text-zinc-700 uppercase tracking-wider font-mono mt-0.5">{cfg.label}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Legenda */}
            <div className="bg-[#0c0c0f] border border-white/[0.06] rounded-2xl p-4">
              <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest font-mono mb-3">Legenda</p>
              <div className="flex flex-col gap-2">
                {visibleLayers.map(layer => (
                  <div key={layer} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${LAYER_CONFIG[layer].dot} ${!active[layer] ? 'opacity-30' : ''}`} />
                    <span className={`text-xs transition-colors ${active[layer] ? 'text-zinc-400' : 'text-zinc-700'}`}>
                      {LAYER_CONFIG[layer].label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-white/[0.05]">
                <p className="text-[9px] text-zinc-700 font-mono leading-relaxed">
                  Clique num dia para ver eventos. Duplo-clique para criar novo evento.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
