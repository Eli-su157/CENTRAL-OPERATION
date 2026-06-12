'use client';

import { useState, useTransition } from 'react';
import { markNotificationsReadAction } from '@/app/app/notifications/actions';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

interface Props {
  notifications: NotificationItem[];
  unreadCount: number;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
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

export function NotificationBell({ notifications, unreadCount }: Props) {
  const [open, setOpen] = useState(false);
  const [localItems, setLocalItems] = useState(notifications);
  const [localCount, setLocalCount] = useState(unreadCount);
  const [, startTransition] = useTransition();

  function handleOpen() {
    setOpen(o => !o);
    if (!open && localCount > 0) {
      const unreadIds = localItems.filter(n => !n.read).map(n => n.id);
      startTransition(async () => {
        await markNotificationsReadAction(unreadIds);
        setLocalItems(items => items.map(n => ({ ...n, read: true })));
        setLocalCount(0);
      });
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] transition-all"
        aria-label="Notificações"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {localCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
            {localCount > 9 ? '9+' : localCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 w-80 bg-[#0e0e0e] border border-white/[0.08] rounded-xl shadow-2xl z-30 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <p className="text-xs font-semibold text-zinc-300 uppercase tracking-widest">Notificações</p>
              {localCount === 0 && (
                <span className="text-[10px] text-zinc-600">tudo lido</span>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {localItems.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-xs text-zinc-600">Sem notificações</p>
                </div>
              ) : (
                localItems.slice(0, 20).map(n => (
                  <a
                    key={n.id}
                    href={n.link ?? '#'}
                    onClick={() => setOpen(false)}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors ${
                      !n.read ? 'bg-orange-500/[0.03]' : ''
                    }`}
                  >
                    <span className="text-base shrink-0 mt-0.5">{TYPE_ICON[n.type] ?? '🔔'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs font-medium truncate ${n.read ? 'text-zinc-400' : 'text-zinc-200'}`}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-zinc-600 shrink-0">{timeAgo(n.created_at)}</span>
                      </div>
                      <p className="text-[11px] text-zinc-600 mt-0.5 line-clamp-2">{n.body}</p>
                    </div>
                    {!n.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 mt-1.5" />
                    )}
                  </a>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
