'use client';

import { useState, useMemo } from 'react';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type EventLayer = 'a_receber' | 'a_pagar' | 'tarefa' | 'recurso';

export interface CalendarioEvent {
  id:    string;
  date:  string; // YYYY-MM-DD
  label: string;
  layer: EventLayer;
  meta?: string;
}

interface Props {
  events:          CalendarioEvent[];
  canSeeFinancial: boolean;
}

// ── Configuração de camadas ────────────────────────────────────────────────────

interface LayerConfig {
  label:    string;
  dot:      string; // classe Tailwind para o bullet
  pill:     string; // classes para a pílula de evento
  pillText: string;
}

const LAYER_CONFIG: Record<EventLayer, LayerConfig> = {
  a_receber: {
    label:    'A receber',
    dot:      'bg-emerald-400',
    pill:     'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300',
    pillText: 'text-emerald-300',
  },
  a_pagar: {
    label:    'A pagar',
    dot:      'bg-red-400',
    pill:     'bg-red-500/10 border border-red-500/20 text-red-300',
    pillText: 'text-red-300',
  },
  tarefa: {
    label:    'Prazos de tarefa',
    dot:      'bg-orange-400',
    pill:     'bg-orange-500/10 border border-orange-500/20 text-orange-300',
    pillText: 'text-orange-300',
  },
  recurso: {
    label:    'Recursos monitorados',
    dot:      'bg-zinc-400',
    pill:     'bg-zinc-500/10 border border-zinc-500/20 text-zinc-400',
    pillText: 'text-zinc-400',
  },
};

const ALL_LAYERS: EventLayer[] = ['a_receber', 'a_pagar', 'tarefa', 'recurso'];

// ── Helpers de data ────────────────────────────────────────────────────────────

const WEEKDAYS   = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstWeekday(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function toIso(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ── Componente principal ───────────────────────────────────────────────────────

export function CalendarioClient({ events, canSeeFinancial }: Props) {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  // Camadas visíveis — financeiras desativadas se sem permissão
  const defaultActive = useMemo<Record<EventLayer, boolean>>(() => ({
    a_receber: canSeeFinancial,
    a_pagar:   canSeeFinancial,
    tarefa:    true,
    recurso:   true,
  }), [canSeeFinancial]);

  const [active, setActive] = useState<Record<EventLayer, boolean>>(defaultActive);

  function toggleLayer(l: EventLayer) {
    setActive(prev => ({ ...prev, [l]: !prev[l] }));
  }

  // Navegação de mês
  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }
  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  // Grade de células
  const daysInMonth  = getDaysInMonth(year, month);
  const firstWeekday = getFirstWeekday(year, month);
  const prevDays     = getDaysInMonth(year, month === 0 ? 11 : month - 1);

  const cells: { day: number; type: 'prev' | 'current' | 'next'; iso: string }[] = [];

  const prevYear  = month === 0 ? year - 1 : year;
  const prevMonth0 = month === 0 ? 11 : month - 1;
  const nextYear  = month === 11 ? year + 1 : year;
  const nextMonth0 = month === 11 ? 0 : month + 1;

  for (let i = firstWeekday - 1; i >= 0; i--) {
    const d = prevDays - i;
    cells.push({ day: d, type: 'prev', iso: toIso(prevYear, prevMonth0, d) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, type: 'current', iso: toIso(year, month, d) });
  }
  const trailing = 42 - cells.length;
  for (let d = 1; d <= trailing; d++) {
    cells.push({ day: d, type: 'next', iso: toIso(nextYear, nextMonth0, d) });
  }

  // Índice de eventos por data (filtrado pelas camadas ativas)
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

  // Camadas disponíveis para o usuário (sem as financeiras se sem permissão)
  const visibleLayers = canSeeFinancial
    ? ALL_LAYERS
    : ALL_LAYERS.filter(l => l !== 'a_receber' && l !== 'a_pagar');

  return (
    <div className="flex flex-col gap-4">

      {/* Filtros de camada */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold text-zinc-600 uppercase tracking-[0.1em] mr-1">
          Camadas
        </span>
        {visibleLayers.map(layer => {
          const cfg = LAYER_CONFIG[layer];
          const on  = active[layer];
          return (
            <button
              key={layer}
              onClick={() => toggleLayer(layer)}
              className={`
                flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150
                ${on
                  ? cfg.pill
                  : 'bg-transparent border-zinc-800 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400'}
              `}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${on ? cfg.dot : 'bg-zinc-700'}`} />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Card do calendário */}
      <div className="bg-[#111111] border border-white/[0.06] rounded-xl overflow-hidden">

        {/* Seletor de mês */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <button
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] transition-all duration-150"
            aria-label="Mês anterior"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-white">
              {MONTH_NAMES[month]}{' '}
              <span className="text-zinc-500 font-normal">{year}</span>
            </h2>
            {!isCurrentMonth && (
              <button
                onClick={goToday}
                className="text-xs text-orange-400 border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 rounded hover:bg-orange-500/20 transition-colors"
              >
                Hoje
              </button>
            )}
          </div>

          <button
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] transition-all duration-150"
            aria-label="Próximo mês"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Grade */}
        <div className="p-4">

          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-[11px] font-semibold text-zinc-600 uppercase tracking-[0.08em] py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Células */}
          <div className="grid grid-cols-7 gap-px bg-white/[0.04] rounded-lg overflow-hidden">
            {cells.map((cell, i) => {
              const isCurrent = cell.type === 'current';
              const isToday   = isCurrent && cell.day === today.getDate() && isCurrentMonth;
              const dayEvents = isCurrent ? (eventsByDate.get(cell.iso) ?? []) : [];

              // Máx 3 pílulas visíveis; resto vira "+N"
              const MAX_PILLS = 3;
              const shown  = dayEvents.slice(0, MAX_PILLS);
              const hidden = dayEvents.length - shown.length;

              return (
                <div
                  key={i}
                  className={`
                    relative bg-[#111111] min-h-[88px] p-1.5 flex flex-col gap-1
                    transition-colors duration-100
                    ${isCurrent ? 'hover:bg-white/[0.025]' : ''}
                  `}
                >
                  {/* Número do dia */}
                  <span className={`
                    self-start inline-flex items-center justify-center w-6 h-6 rounded-full
                    text-xs leading-none shrink-0
                    ${isToday
                      ? 'bg-orange-500 text-white font-bold'
                      : isCurrent
                        ? 'text-zinc-300 font-medium'
                        : 'text-zinc-700 font-normal'}
                  `}>
                    {cell.day}
                  </span>

                  {/* Pílulas de eventos */}
                  {shown.map(ev => {
                    const cfg = LAYER_CONFIG[ev.layer];
                    return (
                      <div
                        key={ev.id}
                        title={ev.label}
                        className={`
                          flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] leading-tight
                          truncate w-full cursor-default select-none
                          ${cfg.pill}
                        `}
                      >
                        <span className={`w-1 h-1 rounded-full shrink-0 ${cfg.dot}`} />
                        <span className="truncate">{ev.label}</span>
                      </div>
                    );
                  })}

                  {hidden > 0 && (
                    <span className="text-[10px] text-zinc-600 px-1.5">
                      +{hidden} mais
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
