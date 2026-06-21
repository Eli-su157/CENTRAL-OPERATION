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
  canSeeIntegrations: boolean;
  onClose?: () => void;
}

const roleLabels: Record<UserRole, string> = {
  dono: 'Dono', head: 'Head', lider: 'Líder', executor: 'Executor',
};
const roleBadge: Record<UserRole, string> = {
  dono:     'bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20',
  head:     'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20',
  lider:    'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20',
  executor: 'bg-zinc-800/80 text-zinc-400 ring-1 ring-zinc-700/50',
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
      className={`group relative flex items-center gap-2.5 px-3 py-[7px] text-[13px] rounded-lg transition-all duration-150 ${
        active
          ? 'text-white font-medium bg-white/[0.05] border border-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
          : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03] border border-transparent'
      }`}
    >
      {/* barra de acento esquerda quando ativo */}
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-orange-500 rounded-full shadow-[0_0_6px_rgba(249,115,22,0.6)]" />
      )}
      <span className={`pl-1 ${active ? 'text-orange-400' : 'text-zinc-600 group-hover:text-zinc-400'} transition-colors shrink-0`}>
        {children instanceof Array ? children[0] : null}
      </span>
      {children instanceof Array ? children.slice(1) : children}
    </Link>
  );
}

// NavLink com ícone separado explicitamente
function NavItem({
  href, icon, label, exact = false, onClick,
}: {
  href: string; icon: React.ReactNode; label: string; exact?: boolean; onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group relative flex items-center gap-2.5 px-3 py-[7px] text-[13px] rounded-lg transition-all duration-200 ${
        active
          ? 'text-white font-medium bg-white/[0.05] border border-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] shadow-[0_0_12px_-4px_rgba(249,115,22,0.08)]'
          : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent hover:border-white/[0.04] hover:shadow-[0_0_10px_-4px_rgba(255,255,255,0.04)]'
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
      )}
      <span className={`shrink-0 transition-all duration-200 ${active ? 'text-orange-400 scale-110' : 'text-zinc-600 group-hover:text-orange-400 group-hover:scale-110'}`}>
        {icon}
      </span>
      <span className="transition-all duration-150 group-hover:translate-x-0.5">{label}</span>
    </Link>
  );
}

export function Sidebar({ user, operation, dashboards, canManageTeam, canSeeFinancial, canSeeReports, canSeeIntegrations, onClose }: Props) {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex flex-col h-full border-r border-white/[0.06] anim-slide-right relative"
      style={{ background: 'linear-gradient(180deg, #0a0a0e 0%, #08080b 100%)' }}>

      {/* Linha laranja andando no topo da sidebar */}
      <div className="absolute top-0 left-0 right-0 h-[1px] overflow-hidden pointer-events-none z-10">
        <div className="absolute inset-0 line-gradient-run opacity-70" />
        <div className="absolute inset-0 line-gradient-run opacity-40" style={{ animationDelay: '1.5s', animationDirection: 'reverse' }} />
      </div>

      {/* Linha laranja descendo pela borda direita da sidebar */}
      <div className="absolute top-0 right-0 bottom-0 w-[1px] overflow-hidden pointer-events-none z-10">
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(180deg, rgba(249,115,22,0) 0%, rgba(249,115,22,0.5) 40%, rgba(255,180,80,0.8) 50%, rgba(249,115,22,0.5) 60%, rgba(249,115,22,0) 100%)',
          backgroundSize: '100% 200%',
          animation: 'gradient-run 4s ease infinite',
        }} />
      </div>

      {/* Brand */}
      <div className="px-4 py-5 border-b border-white/[0.05] relative overflow-hidden">
        {/* fundo de glow atrás do logo */}
        <div className="absolute top-0 left-0 w-32 h-full bg-orange-500/[0.04] blur-2xl pointer-events-none" />
        <div className="flex items-center gap-3 relative">
          {/* Logo premium */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shrink-0 anim-logo-glow ring-1 ring-orange-400/40 anim-float shadow-[0_0_20px_rgba(249,115,22,0.5)]">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="6" height="6" fill="white" />
              <rect x="9" y="1" width="6" height="6" fill="white" />
              <rect x="9" y="9" width="6" height="6" fill="white" />
              <rect x="1" y="9" width="6" height="6" fill="white" />
            </svg>
          </div>
          <div className="min-w-0 anim-slide-up delay-100">
            <p className="text-[12px] font-black text-white uppercase tracking-[0.2em] leading-none font-mono">
              CENTRAL
            </p>
            <p className="text-[10px] text-orange-400/70 truncate mt-1 font-mono tracking-widest uppercase">
              {operation.name}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-0.5">

        <div className="anim-slide-right delay-150">
        <NavItem href="/app" exact onClick={onClose}
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          }
          label="Visão Geral"
        />
        </div>

        {dashboards.length > 0 && (
          <>
            <p className="section-title mt-2">Produtos</p>
            {dashboards.map(d => {
              const href = `/app/d/${d.id}`;
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={d.id}
                  href={href}
                  onClick={onClose}
                  className={`relative flex items-center gap-2.5 px-3 py-[7px] text-[13px] rounded-lg transition-all duration-150 ${
                    active
                      ? 'text-white font-medium bg-white/[0.05] border border-white/[0.07]'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03] border border-transparent'
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-orange-500 rounded-full shadow-[0_0_6px_rgba(249,115,22,0.6)]" />
                  )}
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${
                    active ? 'bg-orange-400 shadow-[0_0_4px_rgba(249,115,22,0.7)]' : 'bg-zinc-700'
                  }`} />
                  <span className="truncate">{d.name}</span>
                </Link>
              );
            })}
          </>
        )}

        <div className="anim-slide-right delay-200">
        <p className="section-title mt-2">Comando</p>
        </div>
        <div className="anim-slide-right delay-250">
        <NavItem href="/app/tarefas" onClick={onClose}
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          }
          label="Tarefas"
        />
        </div>
        <div className="anim-slide-right delay-300">
        <NavItem href="/app/calendario" onClick={onClose}
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
          label="Calendário"
        />
        </div>
        {canSeeFinancial && (
          <div className="anim-slide-right delay-400">
          <NavItem href="/app/financeiro" onClick={onClose}
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            }
            label="Financeiro"
          />
          </div>
        )}
        {canSeeReports && (
          <div className="anim-slide-right delay-500">
          <NavItem href="/app/relatorios" onClick={onClose}
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            }
            label="Relatórios"
          />
          </div>
        )}

        {(canManageTeam || canSeeIntegrations) && (
          <div className="anim-slide-right delay-500">
          <p className="section-title mt-2">Gestão</p>
          </div>
        )}
        {canManageTeam && (
          <div className="anim-slide-right delay-600">
          <NavItem href="/app/equipe" onClick={onClose}
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
            label="Equipe"
          />
          </div>
        )}
        {canSeeIntegrations && (
          <div className="anim-slide-right delay-700">
          <NavItem href="/app/integracoes" onClick={onClose}
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            }
            label="Integrações"
          />
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/[0.05] p-3 space-y-0.5 anim-slide-up delay-500">
        <div className="flex items-center gap-2.5 px-2 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          {/* Avatar com glow */}
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-orange-700 flex items-center justify-center shrink-0 text-[12px] font-bold text-white shadow-[0_0_14px_rgba(249,115,22,0.4)] hover:shadow-[0_0_22px_rgba(249,115,22,0.6)] transition-shadow duration-300">
            {user.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-zinc-200 truncate leading-tight">{user.name}</p>
            <span className={`inline-flex text-[9px] px-1.5 py-px rounded font-bold tracking-wider mt-0.5 font-mono ${roleBadge[user.role]}`}>
              {roleLabels[user.role].toUpperCase()}
            </span>
          </div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] text-zinc-700 hover:text-zinc-400 hover:bg-white/[0.03] transition-all duration-150 font-mono tracking-wide"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            SAIR DA CONTA
          </button>
        </form>
      </div>
    </aside>
  );
}
