import { formatCurrency } from '@/lib/utils/format';

export interface FeedEvent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  dashboard_id: string | null;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; dot: string }> = {
  venda_aprovada: {
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  reembolso: {
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3"/></svg>,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    dot: 'bg-amber-500',
  },
  chargeback: {
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    color: 'text-red-400 bg-red-500/10 border-red-500/20',
    dot: 'bg-red-500',
  },
  meta_em_risco: {
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/></svg>,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    dot: 'bg-amber-400',
  },
  plataforma_desconectada: {
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>,
    color: 'text-red-400 bg-red-500/10 border-red-500/20',
    dot: 'bg-red-500',
  },
  tracker_desconectado: {
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    dot: 'bg-amber-400',
  },
  criativo_vencedor: {
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    color: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    dot: 'bg-orange-500',
  },
  conta_bloqueada: {
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    color: 'text-red-400 bg-red-500/10 border-red-500/20',
    dot: 'bg-red-500',
  },
  recurso_caiu: {
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    color: 'text-red-400 bg-red-500/10 border-red-500/20',
    dot: 'bg-red-500',
  },
  comissao_lancada: {
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    dot: 'bg-blue-400',
  },
};

const DEFAULT_CONFIG = {
  icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>,
  color: 'text-zinc-400 bg-zinc-700/20 border-zinc-700/30',
  dot: 'bg-zinc-600',
};

function describeEvent(type: string, payload: Record<string, unknown>): string {
  const fmt = (n: number) => formatCurrency(n);
  switch (type) {
    case 'venda_aprovada':           return `Venda ${fmt(Number(payload['amount'] ?? 0))} via ${payload['provider'] ?? '—'}`;
    case 'reembolso':                return `Reembolso de ${fmt(Number(payload['amount'] ?? 0))} — ${payload['provider'] ?? '—'}`;
    case 'chargeback':               return `Chargeback de ${fmt(Number(payload['amount'] ?? 0))}`;
    case 'meta_em_risco':            return `Meta de ${payload['tipo'] ?? ''} em risco — pace ${Number(payload['pct'] ?? 0).toFixed(0)}%`;
    case 'plataforma_desconectada':  return `${payload['provider'] ?? 'Plataforma'} desconectada`;
    case 'tracker_desconectado':     return `Tracker ${payload['provider'] ?? ''} sem sinal`;
    case 'criativo_vencedor':        return `Criativo "${payload['ad_name'] ?? '—'}" ROAS ${Number(payload['roas'] ?? 0).toFixed(2)}x`;
    case 'conta_bloqueada':          return `Conta ${payload['account_name'] ?? ''} (${payload['platform'] ?? ''}) bloqueada`;
    case 'recurso_caiu':             return `${payload['label'] ?? 'Recurso'} ${payload['status'] === 'lento' ? 'lento' : 'fora do ar'}`;
    case 'comissao_lancada':         return `Comissão ${fmt(Number(payload['amount'] ?? 0))} lançada`;
    default:                         return type;
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

interface Props {
  events: FeedEvent[];
}

export function ActivityFeed({ events }: Props) {
  if (events.length === 0) {
    return (
      <div className="bg-[#0c0c0f] border border-white/[0.07] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.04] flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="dot-live absolute inline-flex h-full w-full rounded-full bg-zinc-600 opacity-50" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-700" />
          </span>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Feed de Atividade</p>
        </div>
        <div className="px-5 py-12 text-center flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3f3f46" strokeWidth="1.5">
              <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <p className="text-xs text-zinc-600">Nenhum evento registrado ainda.</p>
          <p className="text-[10px] text-zinc-700">Os eventos aparecerão aqui conforme a operação avança.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0c0c0f] border border-white/[0.07] rounded-2xl overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/25 to-transparent" />

      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="dot-live absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Feed de Atividade</p>
        </div>
        <span className="text-[10px] text-zinc-600 font-mono">{events.length} eventos</span>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Linha vertical da timeline */}
        <div className="absolute left-[29px] top-0 bottom-0 w-px bg-gradient-to-b from-white/[0.06] via-white/[0.04] to-transparent pointer-events-none" />

        <div className="max-h-96 overflow-y-auto">
          {events.map((ev, i) => {
            const cfg = TYPE_CONFIG[ev.type] ?? DEFAULT_CONFIG;
            return (
              <div
                key={ev.id}
                className="flex items-start gap-4 px-5 py-3.5 hover:bg-white/[0.015] transition-colors duration-100 group relative anim-slide-up"
                style={{ animationDelay: `${Math.min(i * 25, 250)}ms` }}
              >
                {/* Ícone na timeline */}
                <div className={`w-[18px] h-[18px] rounded-full border flex items-center justify-center shrink-0 mt-0.5 z-10 transition-all duration-200 group-hover:scale-110 ${cfg.color}`}>
                  {cfg.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-xs font-medium leading-snug ${
                      ev.type === 'venda_aprovada' ? 'text-emerald-300' :
                      ['chargeback', 'conta_bloqueada', 'recurso_caiu', 'plataforma_desconectada'].includes(ev.type) ? 'text-red-300' :
                      ['reembolso', 'meta_em_risco', 'tracker_desconectado'].includes(ev.type) ? 'text-amber-300' :
                      ev.type === 'criativo_vencedor' ? 'text-orange-300' :
                      'text-zinc-300'
                    }`}>
                      {describeEvent(ev.type, ev.payload)}
                    </p>
                    <span className="text-[10px] text-zinc-700 font-mono shrink-0 mt-0.5">{timeAgo(ev.created_at)}</span>
                  </div>
                  {ev.dashboard_id && (
                    <p className="text-[10px] text-zinc-600 mt-0.5 font-mono">produto #{ev.dashboard_id.slice(0, 8)}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
