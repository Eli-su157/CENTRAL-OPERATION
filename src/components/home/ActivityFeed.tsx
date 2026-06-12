// Feed de atividade — Server Component.
// Renderiza os últimos eventos do negócio em ordem cronológica.

import { formatCurrency } from '@/lib/utils/format';

export interface FeedEvent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  dashboard_id: string | null;
  created_at: string;
}

const TYPE_ICON: Record<string, string> = {
  venda_aprovada:          '💰',
  reembolso:               '↩️',
  chargeback:              '⚠️',
  meta_em_risco:           '📉',
  plataforma_desconectada: '🔌',
  tracker_desconectado:    '📡',
  criativo_vencedor:       '🏆',
  conta_bloqueada:         '🚫',
  recurso_caiu:            '🔴',
  comissao_lancada:        '💸',
};

const TYPE_COLOR: Record<string, string> = {
  venda_aprovada:          'text-emerald-400',
  reembolso:               'text-amber-400',
  chargeback:              'text-red-400',
  meta_em_risco:           'text-amber-400',
  plataforma_desconectada: 'text-red-400',
  tracker_desconectado:    'text-amber-400',
  criativo_vencedor:       'text-violet-400',
  conta_bloqueada:         'text-red-400',
  recurso_caiu:            'text-red-400',
  comissao_lancada:        'text-blue-400',
};

function describeEvent(type: string, payload: Record<string, unknown>): string {
  const fmt = (n: number) => formatCurrency(n);
  switch (type) {
    case 'venda_aprovada':
      return `Venda ${fmt(Number(payload['amount'] ?? 0))} via ${payload['provider'] ?? '—'}`;
    case 'reembolso':
      return `Reembolso ${fmt(Number(payload['amount'] ?? 0))} — ${payload['provider'] ?? '—'}`;
    case 'chargeback':
      return `Chargeback ${fmt(Number(payload['amount'] ?? 0))}`;
    case 'meta_em_risco':
      return `Meta de ${payload['tipo'] ?? ''} em risco — pace ${Number(payload['pct'] ?? 0).toFixed(0)}%`;
    case 'plataforma_desconectada':
      return `${payload['provider'] ?? 'Plataforma'} desconectada`;
    case 'tracker_desconectado':
      return `Tracker ${payload['provider'] ?? ''} sem sinal`;
    case 'criativo_vencedor':
      return `Criativo "${payload['ad_name'] ?? '—'}" ROAS ${Number(payload['roas'] ?? 0).toFixed(2)}x`;
    case 'conta_bloqueada':
      return `Conta ${payload['account_name'] ?? ''} (${payload['platform'] ?? ''}) bloqueada`;
    case 'recurso_caiu':
      return `${payload['label'] ?? 'Recurso'} ${payload['status'] === 'lento' ? 'lento' : 'fora do ar'}`;
    case 'comissao_lancada':
      return `Comissão ${fmt(Number(payload['amount'] ?? 0))} lançada`;
    default:
      return type;
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

interface Props {
  events: FeedEvent[];
}

export function ActivityFeed({ events }: Props) {
  if (events.length === 0) {
    return (
      <div className="relative bg-[#161616] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
        <div className="px-5 py-4 border-b border-white/[0.04]">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.1em]">Feed de Atividade</p>
        </div>
        <div className="px-5 py-10 text-center">
          <p className="text-xs text-zinc-600">Nenhum evento registrado ainda.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-[#161616] border border-white/[0.06] rounded-xl overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
      <div className="px-5 py-4 border-b border-white/[0.04]">
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.1em]">Feed de Atividade</p>
      </div>
      <div className="divide-y divide-white/[0.04] max-h-80 overflow-y-auto">
        {events.map(ev => (
          <div key={ev.id} className="flex items-start gap-3 px-5 py-3">
            <span className="text-sm shrink-0 mt-0.5">{TYPE_ICON[ev.type] ?? '🔔'}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium ${TYPE_COLOR[ev.type] ?? 'text-zinc-300'}`}>
                {describeEvent(ev.type, ev.payload)}
              </p>
              <p className="text-[10px] text-zinc-600 mt-0.5">{timeAgo(ev.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
