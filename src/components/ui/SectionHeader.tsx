interface Props {
  title: string;
  subtitle?: string;
  badge?: string;
  variant?: 'page' | 'section';
  action?: React.ReactNode;
}

export function SectionHeader({
  title, subtitle, badge, variant = 'page', action,
}: Props) {
  if (variant === 'section') {
    return (
      <div className="flex items-center gap-2 mb-5">
        <div className="w-[2px] h-3.5 bg-orange-500 rounded-full shrink-0 shadow-[0_0_6px_rgba(249,115,22,0.5)]" />
        <h2 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.15em] font-mono">{title}</h2>
        {badge && (
          <span className="text-[9px] text-zinc-700 font-bold font-mono tracking-wide">{badge}</span>
        )}
        {action && <div className="ml-auto">{action}</div>}
      </div>
    );
  }

  return (
    <div className="mb-8 pb-6 border-b border-white/[0.04] relative">
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-orange-500/15 via-orange-500/5 to-transparent" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-[2px] h-6 bg-orange-500 rounded-sm shrink-0 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
            <h1 className="text-xl font-bold text-white tracking-tight">{title}</h1>
            {badge && (
              <span className="text-[10px] bg-white/[0.04] text-zinc-600 border border-white/[0.06] px-2 py-0.5 rounded font-bold font-mono tracking-wide">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-zinc-600 pl-[11px] font-mono tracking-wide">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0 pt-0.5">{action}</div>}
      </div>
    </div>
  );
}
