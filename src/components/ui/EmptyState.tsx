import Link from 'next/link';

interface Action {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface Props {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: Action;
  iconVariant?: 'branded' | 'neutral';
  size?: 'default' | 'compact';
  className?: string;
}

export function EmptyState({
  icon, title, description, action,
  iconVariant = 'branded', size = 'default', className = '',
}: Props) {
  const iconBg = iconVariant === 'branded'
    ? 'bg-orange-500/8 border border-orange-500/12'
    : 'bg-white/[0.03] border border-white/[0.05]';
  const iconColor = iconVariant === 'branded' ? 'text-orange-400' : 'text-zinc-600';

  const DefaultIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" className={iconColor}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );

  if (size === 'compact') {
    return (
      <div className={`flex flex-col items-center justify-center py-8 text-center ${className}`}>
        <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg mb-3 ${iconBg}`}>
          {icon ?? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.5" className={iconColor}>
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
          )}
        </div>
        <p className="text-[11px] text-zinc-600 font-mono">{title}</p>
        {description && (
          <p className="text-[10px] text-zinc-700 mt-0.5 max-w-[160px] leading-relaxed font-mono">{description}</p>
        )}
      </div>
    );
  }

  return (
    <div className={`border border-white/[0.04] rounded-xl p-12 text-center bg-[#0a0a0d] relative overflow-hidden ${className}`}>
      {/* grid sutil de fundo */}
      <div className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.018) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      {iconVariant === 'branded' && (
        <div className="absolute inset-0 bg-gradient-to-b from-orange-500/[0.02] to-transparent pointer-events-none" />
      )}
      <div className="relative z-10 flex flex-col items-center">
        {(icon || DefaultIcon) && (
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5 ${iconBg}`}>
            {icon ?? DefaultIcon}
          </div>
        )}
        <p className="text-zinc-300 font-semibold mb-2 tracking-tight">{title}</p>
        {description && (
          <p className="text-zinc-600 text-sm max-w-xs leading-relaxed mb-5 font-mono">{description}</p>
        )}
        {action && (
          action.href ? (
            <Link href={action.href}
              className="text-xs text-orange-400 hover:text-orange-300 font-semibold transition-colors border border-orange-500/15 hover:border-orange-500/25 px-4 py-1.5 rounded-lg font-mono tracking-wide">
              {action.label}
            </Link>
          ) : (
            <button onClick={action.onClick}
              className="text-xs text-orange-400 hover:text-orange-300 font-semibold transition-colors border border-orange-500/15 hover:border-orange-500/25 px-4 py-1.5 rounded-lg font-mono tracking-wide">
              {action.label}
            </button>
          )
        )}
      </div>
    </div>
  );
}
