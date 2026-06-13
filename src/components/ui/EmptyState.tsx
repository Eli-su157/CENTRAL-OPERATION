// EmptyState — estado vazio com ícone, título, descrição e ação.
// Extraído/generalizado do padrão inline em app/page.tsx, relatorios, kanban.

import Link from 'next/link';

interface Action {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface Props {
  /** SVG inline ou emoji */
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: Action;
  /** 'branded' adiciona fundo laranja no ícone; 'neutral' usa zinc */
  iconVariant?: 'branded' | 'neutral';
  /**
   * 'default' — card com borda/fundo, padding generoso (listas de página)
   * 'compact' — sem card, só ícone + texto, para colunas Kanban e listas inline
   */
  size?: 'default' | 'compact';
  className?: string;
}

export function EmptyState({
  icon, title, description, action,
  iconVariant = 'branded', size = 'default', className = '',
}: Props) {
  const iconBg = iconVariant === 'branded'
    ? 'bg-orange-500/10 border border-orange-500/15'
    : 'bg-white/[0.04] border border-white/[0.06]';
  const iconColor = iconVariant === 'branded' ? 'text-orange-400' : 'text-zinc-500';

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
        <p className="text-[11px] text-[#A1A1AA]">{title}</p>
        {description && (
          <p className="text-[10px] text-zinc-600 mt-0.5 max-w-[160px] leading-relaxed">{description}</p>
        )}
      </div>
    );
  }

  return (
    <div className={`border border-white/[0.05] rounded-xl p-12 text-center bg-[#0D0D0D] relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-b from-orange-500/[0.015] to-transparent pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center">
        {(icon || DefaultIcon) && (
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5 ${iconBg}`}>
            {icon ?? DefaultIcon}
          </div>
        )}
        <p className="text-zinc-200 font-semibold mb-2">{title}</p>
        {description && (
          <p className="text-[#A1A1AA] text-sm max-w-xs leading-relaxed mb-5">{description}</p>
        )}
        {action && (
          action.href ? (
            <Link href={action.href}
              className="text-xs text-orange-400 hover:text-orange-300 font-medium transition-colors border border-orange-500/20 px-3 py-1.5 rounded-lg hover:border-orange-500/30">
              {action.label}
            </Link>
          ) : (
            <button onClick={action.onClick}
              className="text-xs text-orange-400 hover:text-orange-300 font-medium transition-colors border border-orange-500/20 px-3 py-1.5 rounded-lg hover:border-orange-500/30">
              {action.label}
            </button>
          )
        )}
      </div>
    </div>
  );
}
