'use client';

import { useState } from 'react';
import { ResourceRow } from './ResourceRow';
import { ResourceForm } from './ResourceForm';
import type { MonitoredResource } from '@/lib/mock/structure';

interface Props {
  pages:       MonitoredResource[];
  domains:     MonitoredResource[];
  dashboardId: string;
  canManage:   boolean;
}

function Section({
  title, icon, items, dashboardId, canManage,
}: {
  title: string; icon: React.ReactNode;
  items: MonitoredResource[]; dashboardId: string; canManage: boolean;
}) {
  return (
    <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-zinc-500">{icon}</span>
        <p className="kpi-label">{title}</p>
        <span className="ml-auto text-[10px] text-zinc-600 tabular-nums">{items.length}</span>
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

function formatLastChecked(iso: string | null): string {
  if (!iso) return 'aguardando 1ª checagem';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'agora mesmo';
  if (min < 60) return `${min} min atrás`;
  const h = Math.floor(min / 60);
  return `${h}h atrás`;
}

export function MonitoringClient({ pages, domains, dashboardId, canManage }: Props) {
  const [showForm, setShowForm] = useState(false);
  const all = [...pages, ...domains];
  const totalFora  = all.filter(r => r.status === 'fora').length;
  const totalLento = all.filter(r => r.status === 'lento').length;
  const totalNoAr  = all.filter(r => r.status === 'no_ar').length;

  // Última checagem do cron (mais recente entre todos os recursos)
  const lastChecked = all
    .filter(r => r.last_checked_at)
    .sort((a, b) => (b.last_checked_at ?? '').localeCompare(a.last_checked_at ?? ''))[0]
    ?.last_checked_at ?? null;

  return (
    <div>
      {/* Stats + badge do health-check automático */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            totalFora > 0  ? 'bg-red-500 animate-pulse' :
            totalLento > 0 ? 'bg-amber-400' :
            all.length > 0 ? 'bg-emerald-400' : 'bg-zinc-700'
          }`} />
          <span className="text-xs text-zinc-400 font-medium">
            {totalFora > 0  ? `${totalFora} fora do ar` :
             totalLento > 0 ? `${totalLento} lentos` :
             all.length > 0 ? `${totalNoAr} operacionais` : 'Sem recursos cadastrados'}
          </span>
        </div>

        {/* Informa que é o health-check real */}
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-700 ml-auto">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          health-check automático · {formatLastChecked(lastChecked)}
        </div>

        {canManage && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white/[0.04] hover:bg-white/[0.07] text-zinc-400 border border-white/[0.07] hover:text-zinc-200 transition-all"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Adicionar recurso
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Section title="PÁGINAS & CHECKOUT"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
            </svg>
          }
          items={pages} dashboardId={dashboardId} canManage={canManage}
        />
        <Section title="DOMÍNIOS & SSL"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          }
          items={domains} dashboardId={dashboardId} canManage={canManage}
        />
      </div>

      {showForm && <ResourceForm dashboardId={dashboardId} onClose={() => setShowForm(false)} />}
    </div>
  );
}
