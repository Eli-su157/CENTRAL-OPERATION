'use client';

import { useState } from 'react';
import { ResourceRow } from './ResourceRow';
import { ResourceForm } from './ResourceForm';
import type { MonitoredResource } from '@/lib/mock/structure';

interface Props {
  pages: MonitoredResource[];
  domains: MonitoredResource[];
  dashboardId: string;
  canManage: boolean;
}

function Section({
  title, icon, items, dashboardId, canManage,
}: {
  title: string;
  icon: React.ReactNode;
  items: MonitoredResource[];
  dashboardId: string;
  canManage: boolean;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-zinc-500">{icon}</span>
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">{title}</p>
        <span className="ml-auto text-xs text-zinc-600">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-zinc-700 py-2">Nenhum cadastrado ainda.</p>
      ) : (
        <div>
          {items.map(r => (
            <ResourceRow key={r.id} resource={r} dashboardId={dashboardId} canManage={canManage} />
          ))}
        </div>
      )}
    </div>
  );
}

export function MonitoringClient({ pages, domains, dashboardId, canManage }: Props) {
  const [showForm, setShowForm] = useState(false);

  const totalFora = [...pages, ...domains].filter(r => r.status === 'fora').length;
  const totalLento = [...pages, ...domains].filter(r => r.status === 'lento').length;

  return (
    <div>
      {/* Summary bar */}
      <div className="flex items-center gap-4 mb-4">
        <div>
          <p className="text-lg font-bold tabular-nums text-white">{pages.length + domains.length}</p>
          <p className="text-xs text-zinc-500">Total</p>
        </div>
        {totalFora > 0 && (
          <div>
            <p className="text-lg font-bold tabular-nums text-red-400">{totalFora}</p>
            <p className="text-xs text-zinc-500">Fora</p>
          </div>
        )}
        {totalLento > 0 && (
          <div>
            <p className="text-lg font-bold tabular-nums text-amber-400">{totalLento}</p>
            <p className="text-xs text-zinc-500">Lento</p>
          </div>
        )}
        {canManage && (
          <button
            onClick={() => setShowForm(true)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors border border-zinc-700"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Adicionar recurso
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Section
          title="Páginas & Checkout"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
            </svg>
          }
          items={pages}
          dashboardId={dashboardId}
          canManage={canManage}
        />
        <Section
          title="Domínios & Hospedagem"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          }
          items={domains}
          dashboardId={dashboardId}
          canManage={canManage}
        />
      </div>

      <p className="text-xs text-zinc-700 mt-3">
        Status marcado manualmente — checagem ativa disponível na Fase 10.
      </p>

      {showForm && (
        <ResourceForm dashboardId={dashboardId} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
