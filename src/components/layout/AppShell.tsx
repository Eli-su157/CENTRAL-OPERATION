'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
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
  children: React.ReactNode;
}

export function AppShell({ user, operation, dashboards, canManageTeam, canSeeFinancial, canSeeReports, canSeeIntegrations, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#111111] overflow-hidden">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-30 transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
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

      {/* Content area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-[#0e0e0e] border-b border-white/[0.05] shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-zinc-400 hover:text-white transition-colors p-1"
            aria-label="Abrir menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-orange-500 flex items-center justify-center">
              <svg width="9" height="9" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="6" height="6" fill="white" />
                <rect x="9" y="1" width="6" height="6" fill="white" />
                <rect x="9" y="9" width="6" height="6" fill="white" />
                <rect x="1" y="9" width="6" height="6" fill="white" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-white">{operation.name}</span>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
