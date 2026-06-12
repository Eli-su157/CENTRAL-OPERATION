import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface Props {
  items: BreadcrumbItem[];
  badge?: {
    label: string;
    /** 'orange' | 'zinc' | 'amber' | 'emerald' */
    color?: 'orange' | 'zinc' | 'amber' | 'emerald';
  };
}

const badgeColors = {
  orange:  'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  zinc:    'bg-zinc-800 text-zinc-400 border border-zinc-700',
  amber:   'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

export function Breadcrumb({ items, badge }: Props) {
  return (
    <nav className="flex items-center gap-1.5 text-[11px] text-zinc-600 mb-6" aria-label="Navegação">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <span key={idx} className="flex items-center gap-1.5">
            {idx > 0 && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-800">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-zinc-300 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-zinc-300 font-medium' : ''}>{item.label}</span>
            )}
          </span>
        );
      })}
      {badge && (
        <span className={`ml-1 text-[10px] px-1.5 py-px rounded font-semibold ${badgeColors[badge.color ?? 'zinc']}`}>
          {badge.label}
        </span>
      )}
    </nav>
  );
}
