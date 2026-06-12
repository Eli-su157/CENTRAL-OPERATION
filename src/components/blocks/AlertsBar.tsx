interface Alert {
  id: string;
  type: 'warning' | 'danger' | 'info';
  message: string;
}

const alertStyle = {
  warning: {
    wrap: 'border-l-2 border-l-amber-500 bg-amber-500/5 border border-amber-500/10',
    icon: 'text-amber-400 bg-amber-500/10 rounded-lg p-1.5',
    text: 'text-amber-200/90',
    dot: 'bg-amber-400',
    svg: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  danger: {
    wrap: 'border-l-2 border-l-red-500 bg-red-500/5 border border-red-500/10',
    icon: 'text-red-400 bg-red-500/10 rounded-lg p-1.5',
    text: 'text-red-200/90',
    dot: 'bg-red-400',
    svg: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  info: {
    wrap: 'border-l-2 border-l-zinc-600 bg-white/[0.02] border border-white/[0.06]',
    icon: 'text-zinc-400 bg-white/[0.04] rounded-lg p-1.5',
    text: 'text-zinc-300',
    dot: 'bg-zinc-500',
    svg: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
};

export function AlertsBar({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mb-5">
      {alerts.map(alert => {
        const s = alertStyle[alert.type];
        return (
          <div key={alert.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl ${s.wrap}`}>
            <span className={s.icon}>{s.svg}</span>
            <p className={`text-sm leading-snug ${s.text}`}>{alert.message}</p>
          </div>
        );
      })}
    </div>
  );
}
