'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { NotificationBell, type NotificationItem } from './NotificationBell';
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
  notifications: NotificationItem[];
  unreadCount: number;
  children: React.ReactNode;
}

export function AppShell({
  user, operation, dashboards, canManageTeam, canSeeFinancial, canSeeReports,
  canSeeIntegrations, notifications, unreadCount, children,
}: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden relative" style={{ background: '#07070a' }}>
      {/* Scanline de fundo sutil */}
      <div className="app-scanline absolute inset-0 pointer-events-none z-0 opacity-30" />
      {/* Glow no canto superior esquerdo */}
      <div className="absolute top-0 left-0 w-96 h-64 bg-orange-500/[0.025] blur-[80px] pointer-events-none z-0 rounded-full" />
      {/* overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed lg:static inset-y-0 left-0 z-30 transition-transform duration-200 lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <Sidebar
          user={user}
          operation={operation}
          dashboards={dashboards}
          canManageTeam={canManageTeam}
          canSeeFinancial={canSeeFinancial}
          canSeeReports={canSeeReports}
          canSeeIntegrations={canSeeIntegrations}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative z-10">

        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 h-12 border-b border-white/[0.06] shrink-0 relative anim-slide-down border-bottom-run" style={{ background: 'rgba(8,8,11,0.95)', backdropFilter: 'blur(8px)' }}>
          {/* linha de acento inferior laranja estática de fundo */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-orange-500/20 via-orange-500/5 to-transparent" />

          {/* Hamburguer mobile */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-zinc-600 hover:text-zinc-300 transition-colors p-1 rounded"
            aria-label="Abrir menu"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-orange-500/90 flex items-center justify-center shadow-[0_0_8px_rgba(249,115,22,0.4)]">
              <svg width="9" height="9" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="6" height="6" fill="white" />
                <rect x="9" y="1" width="6" height="6" fill="white" />
                <rect x="9" y="9" width="6" height="6" fill="white" />
                <rect x="1" y="9" width="6" height="6" fill="white" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-zinc-200 tracking-tight">{operation.name}</span>
          </div>

          <div className="flex-1" />

          <NotificationBell notifications={notifications} unreadCount={unreadCount} />
        </div>

        <main className="flex-1 overflow-y-auto anim-fade-in delay-100">
          {children}
        </main>
      </div>
    </div>
  );
}
