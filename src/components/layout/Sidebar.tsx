'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/actions';
import type { UserRole } from '@/lib/types/database';

interface Dashboard { id: string; name: string }

interface Props {
  user: { name: string; role: UserRole; email: string };
  operation: { name: string };
  dashboards: Dashboard[];
  canManageTeam: boolean;
  canSeeFinancial: boolean;
  canSeeReports: boolean;
  onClose?: () => void;
}

const roleLabels: Record<UserRole, string> = {
  dono: 'Dono', head: 'Head', lider: 'Líder', executor: 'Executor',
};
const roleBadge: Record<UserRole, string> = {
  dono: 'bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20',
  head: 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20',
  lider: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20',
  executor: 'bg-zinc-500/10 text-zinc-400 ring-1 ring-zinc-500/20',
};

function NavLink({
  href, children, exact = false, onClick,
}: {
  href: string; children: React.ReactNode; exact?: boolean; onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
        active
          ? 'bg-violet-500/10 text-violet-300 font-medium shadow-inner-top'
          : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]'
      }`}
    >
      {children}
    </Link>
  );
}

export function Sidebar({ user, operation, dashboards, canManageTeam, canSeeFinancial, canSeeReports, onClose }: Props) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-[#0e0e0e] border-r border-white/[0.05] flex flex-col h-full">

      {/* Brand */}
      <div className="px-4 py-4 border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-violet flex items-center justify-center shrink-0 shadow-glow-violet">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-white uppercase tracking-[0.15em] leading-none">Central</p>
            <p className="text-xs text-zinc-500 truncate mt-0.5">{operation.name}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 flex flex-col">

        <NavLink href="/app" exact onClick={onClose}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="shrink-0">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Visão Geral
        </NavLink>

        {dashboards.length > 0 && (
          <>
            <p className="section-title">Produtos</p>
            {dashboards.map(d => {
              const href = `/app/d/${d.id}`;
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={d.id}
                  href={href}
                  onClick={onClose}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                    active
                      ? 'bg-violet-500/10 text-violet-300 font-medium'
                      : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${
                    active ? 'bg-violet-400' : 'bg-zinc-700 group-hover:bg-zinc-500'
                  }`} />
                  <span className="truncate">{d.name}</span>
                </Link>
              );
            })}
          </>
        )}

        {canManageTeam && (
          <>
            <p className="section-title">Gestão</p>
            <NavLink href="/app/equipe" onClick={onClose}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="shrink-0">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Equipe
            </NavLink>
          </>
        )}

        <p className="section-title">Comando</p>
        <NavLink href="/app/tarefas" onClick={onClose}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="shrink-0">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          Tarefas
        </NavLink>
        {canSeeFinancial && (
          <NavLink href="/app/financeiro" onClick={onClose}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="shrink-0">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            Financeiro
          </NavLink>
        )}
        {canSeeReports && (
          <NavLink href="/app/relatorios" onClick={onClose}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="shrink-0">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            Relatórios
          </NavLink>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/[0.05] p-3 space-y-1">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center shrink-0 text-xs font-bold text-white">
            {user.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-zinc-200 truncate leading-tight">{user.name}</p>
            <span className={`inline-flex text-[10px] px-1.5 py-px rounded-md font-semibold tracking-wide mt-0.5 ${roleBadge[user.role]}`}>
              {roleLabels[user.role]}
            </span>
          </div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.04] transition-all duration-150"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sair da conta
          </button>
        </form>
      </div>
    </aside>
  );
}
