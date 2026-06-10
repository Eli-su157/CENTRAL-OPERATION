interface Alert {
  id: string;
  type: 'warning' | 'danger' | 'info';
  message: string;
}

interface Props {
  alerts: Alert[];
}

const alertStyle = {
  warning: {
    bar: 'bg-amber-950/60 border-amber-800',
    dot: 'bg-amber-400',
    text: 'text-amber-300',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  danger: {
    bar: 'bg-red-950/60 border-red-800',
    dot: 'bg-red-400',
    text: 'text-red-300',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  info: {
    bar: 'bg-blue-950/60 border-blue-800',
    dot: 'bg-blue-400',
    text: 'text-blue-300',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
};

export function AlertsBar({ alerts }: Props) {
  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mb-6">
      {alerts.map(alert => {
        const style = alertStyle[alert.type];
        return (
          <div
            key={alert.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${style.bar}`}
          >
            <span className={style.text}>{style.icon}</span>
            <p className={`${style.text} leading-snug`}>{alert.message}</p>
          </div>
        );
      })}
    </div>
  );
}
