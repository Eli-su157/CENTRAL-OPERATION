'use client';

// UTMifyQueuePanel — fila de atribuição UTMify aguardando casamento com vendas.
// Itens aqui são eventos de tracker que chegaram antes da venda correspondente.

import { useTransition } from 'react';

export interface UTMifyQueueItem {
  id: string;
  external_id: string | null;
  buyer_email: string | null;
  amount: number | null;
  occurred_at: string;
  utm: Record<string, string | null> | null;
  created_at: string;
}

interface Props {
  items: UTMifyQueueItem[];
}

function formatCurrency(v: number | null): string {
  if (!v) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `${min}m atrás`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

export function UTMifyQueuePanel({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 py-4">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <p className="text-xs text-zinc-600">Fila vazia — todos os eventos foram casados com vendas.</p>
      </div>
    );
  }

  const isStale = (iso: string) => Date.now() - new Date(iso).getTime() > 48 * 3600_000;

  return (
    <div className="bg-[#0f0f12] border border-amber-500/15 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.05]">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        <p className="text-xs text-amber-400 font-semibold">{items.length} evento{items.length > 1 ? 's' : ''} aguardando venda correspondente</p>
      </div>
      <div className="max-h-52 overflow-y-auto divide-y divide-white/[0.03]">
        {items.map(item => {
          const stale = isStale(item.created_at);
          return (
            <div key={item.id} className={`flex items-start gap-3 px-4 py-2.5 ${stale ? 'bg-red-950/10' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {item.buyer_email && (
                    <span className="text-xs text-zinc-300 truncate font-mono">{item.buyer_email}</span>
                  )}
                  {item.external_id && (
                    <span className="text-[10px] text-zinc-600 font-mono truncate">{item.external_id.slice(0, 12)}</span>
                  )}
                  <span className="text-xs text-zinc-400 num ml-auto shrink-0">{formatCurrency(item.amount)}</span>
                </div>
                {item.utm && (
                  <div className="flex gap-2 flex-wrap">
                    {item.utm.source && <span className="text-[10px] text-zinc-700">src:{item.utm.source}</span>}
                    {item.utm.campaign && <span className="text-[10px] text-zinc-700">camp:{item.utm.campaign?.slice(0, 20)}</span>}
                  </div>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-[10px] font-mono ${stale ? 'text-red-500' : 'text-zinc-600'}`}>
                  {relativeTime(item.created_at)}
                </p>
                {stale && <p className="text-[10px] text-red-600">expirado</p>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-4 py-2 border-t border-white/[0.04]">
        <p className="text-[10px] text-zinc-700">
          Itens com mais de 48h sem casamento são automaticamente descartados.
        </p>
      </div>
    </div>
  );
}
