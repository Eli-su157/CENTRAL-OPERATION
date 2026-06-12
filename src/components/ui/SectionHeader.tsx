// SectionHeader — padrão de cabeçalho com barra laranja, presente em toda tela.
// variant="page"    — h1 grande, borda inferior, gradiente (cabeçalho de página)
// variant="section" — h2 pequeno uppercase, sem borda (cabeçalho de seção interna)
//
// Extraído de: padrão inline em todos os page.tsx + dev/edicao sections.

interface Props {
  title: string;
  subtitle?: string;
  badge?: string;
  variant?: 'page' | 'section';
  /** Ação no canto direito (ex: botão, link) */
  action?: React.ReactNode;
}

export function SectionHeader({
  title, subtitle, badge, variant = 'page', action,
}: Props) {
  if (variant === 'section') {
    return (
      <div className="flex items-center gap-2 mb-5">
        <div className="w-0.5 h-4 bg-orange-500 rounded-full shrink-0" />
        <h2 className="text-xs font-semibold text-zinc-300 uppercase tracking-[0.12em]">{title}</h2>
        {badge && (
          <span className="text-[10px] text-zinc-600 font-medium">{badge}</span>
        )}
        {action && <div className="ml-auto">{action}</div>}
      </div>
    );
  }

  return (
    <div className="mb-8 pb-6 border-b border-white/[0.05] relative">
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-orange-500/20 via-orange-500/5 to-transparent" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-orange-500 rounded-full shrink-0" />
            <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
            {badge && (
              <span className="text-xs bg-zinc-900/80 text-zinc-500 border border-zinc-800 px-2 py-0.5 rounded font-semibold">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-zinc-500 pl-4">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0 pt-0.5">{action}</div>}
      </div>
    </div>
  );
}
