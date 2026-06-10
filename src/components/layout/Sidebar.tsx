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
  dono: 'bg-violet-900 text-violet-300',
  head: 'bg-blue-900 text-blue-300',
  lider: 'bg-emerald-900 text-emerald-300',
  executor: 'bg-zinc-800 text-zinc-400',
};

function NavLink({
  href,
  children,
  exact = false,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  exact?: boolean;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
        active
          ? 'bg-violet-950 text-violet-300 font-medium'
          : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
      }`}
    >
      {children}
    </Link>
  );
}

export function Sidebar({ user, operation, dashboards, canManageTeam, canSeeFinancial, canSeeReports, onClose }: Props) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-violet-600 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white uppercase tracking-widest leading-none">Central</p>
            <p className="text-xs text-zinc-500 truncate">{operation.name}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
        {/* Visão Geral */}
        <NavLink href="/app" exact onClick={onClose}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Visão Geral
        </NavLink>

        {/* Dashboards */}
        {dashboards.length > 0 && (
          <>
            <p className="text-xs text-zinc-600 uppercase tracking-widest font-medium px-3 pt-4 pb-1.5">
              Produtos
            </p>
            {dashboards.map(d => {
              const href = `/app/d/${d.id}`;
              const active = pathname === href;
              return (
                <Link
                  key={d.id}
                  href={href}
                  onClick={onClose}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active
                      ? 'bg-violet-950 text-violet-300 font-medium'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-violet-400' : 'bg-zinc-700'}`} />
                  <span className="truncate">{d.name}</span>
                </Link>
              );
            })}
          </>
        )}

        {/* Gestão */}
        {canManageTeam && (
          <>
            <p className="text-xs text-zinc-600 uppercase tracking-widest font-medium px-3 pt-4 pb-1.5">
              Gestão
            </p>
            <NavLink href="/app/equipe" onClick={onClose}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Equipe
            </NavLink>
          </>
        )}

        {/* Comando — Tarefas + Financeiro */}
        <>
          <p className="text-xs text-zinc-600 uppercase tracking-widest font-medium px-3 pt-4 pb-1.5">
            Comando
          </p>
          <NavLink href="/app/tarefas" onClick={onClose}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            Tarefas
          </NavLink>
          {canSeeFinancial && (
            <NavLink href="/app/financeiro" onClick={onClose}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              Financeiro
            </NavLink>
          )}
          {canSeeReports && (
            <NavLink href="/app/relatorios" onClick={onClose}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Relatórios
            </NavLink>
          )}
        </>

        {/* Sem placeholder de fases futuras — removido */}
        <div className="mt-auto pt-4">
          <p className="text-xs text-zinc-700 uppercase tracking-widest font-medium px-3 pb-1.5 hidden">
            Em breve
          </p>
          {([] as { label: string; phase: string }[]).map(item => (
            <div
              key={item.label}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-sm opacity-30 cursor-not-allowed select-none"
            >
              <span className="text-zinc-500">{item.label}</span>
              <span className="text-zinc-700 text-xs">{item.phase}</span>
            </div>
          ))}
        </div>
      </nav>

      {/* User footer */}
      <div className="border-t border-zinc-800 p-3">
        <div className="flex items-center gap-2.5 px-2 py-1.5 mb-2">
          <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center shrink-0 text-xs font-bold text-white">
            {user.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{user.name}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${roleBadge[user.role]}`}>
              {roleLabels[user.role]}
            </span>
          </div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
