// TechEventsLog — feed de eventos técnicos (webhook_logs + events ERP).
// Reutiliza o motor de eventos/alertas existente — visão técnica para o dev.

export interface WebhookLogRow {
  id: string;
  provider: string;
  status: 'ok' | 'error' | 'ignored';
  error_msg: string | null;
  received_at: string;
}

const STATUS_CLS: Record<string, { badge: string; dot: string }> = {
  ok:      { badge: 'bg-emerald-950/50 text-emerald-500 border-emerald-800/30', dot: 'bg-emerald-400' },
  error:   { badge: 'bg-red-950/50 text-red-400 border-red-800/30',   dot: 'bg-red-500 animate-pulse' },
  ignored: { badge: 'bg-zinc-800 text-zinc-600 border-zinc-700',       dot: 'bg-zinc-600' },
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1)  return 'agora';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

interface Props {
  logs: WebhookLogRow[];
}

export function TechEventsLog({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <div className="bg-[#0f0f12] border border-white/[0.06] rounded-xl p-5 text-center">
        <p className="text-xs text-zinc-500">Nenhum evento registrado ainda.</p>
        <p className="text-[10px] text-zinc-600 mt-1">Webhooks e crons são registrados automaticamente.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0f0f12] border border-white/[0.06] rounded-xl overflow-hidden">
      <div className="max-h-64 overflow-y-auto divide-y divide-white/[0.03]">
        {logs.map(log => {
          const s = STATUS_CLS[log.status] ?? STATUS_CLS.ignored;
          return (
            <div key={log.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-white/[0.01] transition-colors">
              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${s.dot}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-300 font-mono">{log.provider}</span>
                  <span className={`text-[10px] px-1.5 py-px rounded font-semibold border ${s.badge}`}>
                    {log.status}
                  </span>
                </div>
                {log.error_msg && (
                  <p className="text-[10px] text-red-400/80 mt-0.5 truncate">{log.error_msg}</p>
                )}
              </div>
              <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                {relativeTime(log.received_at)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
