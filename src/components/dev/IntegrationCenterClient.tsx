'use client';

import { useState, useTransition } from 'react';
import { ConnectionForm } from './ConnectionForm';
import {
  updateConnectionStatusAction,
  deleteConnectionAction,
  setPrimaryProviderAction,
} from '@/app/app/d/[dashboardId]/dev/actions';
import {
  formatProvider,
  STATUS_COLOR, STATUS_DOT, STATUS_LABEL,
  type IntegrationConnection, type IntegrationStatus,
} from '@/lib/mock/structure';

const CATEGORY_LABEL: Record<string, string> = {
  venda:      'Vendas',
  tracker:    'Tracker de Atribuição',
  atribuicao: 'Atribuição (legado)',
  trafego:    'Tráfego',
  banco:      'Open Finance / Banco',
};

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  venda: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  tracker: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  ),
  atribuicao: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  trafego: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  banco: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  ),
};

const STATUS_CYCLE: IntegrationStatus[] = ['conectada', 'desconectada', 'erro'];

interface ConnectionRowProps {
  conn: IntegrationConnection;
  dashboardId: string;
  canManage: boolean;
  canDelete: boolean;
  onEdit: (c: IntegrationConnection) => void;
}

function ConnectionRow({ conn, dashboardId, canManage, canDelete, onEdit }: ConnectionRowProps) {
  const [isPending, startTransition] = useTransition();

  function cycleStatus() {
    const idx = STATUS_CYCLE.indexOf(conn.status as IntegrationStatus);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    startTransition(async () => {
      const fd = new FormData();
      fd.set('connectionId', conn.id);
      fd.set('dashboardId', dashboardId);
      fd.set('status', next);
      await updateConnectionStatusAction(null, fd);
    });
  }

  function handleDelete() {
    if (!confirm(`Excluir conexão ${formatProvider(conn.provider)}? As credenciais serão apagadas.`)) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('connectionId', conn.id);
      fd.set('dashboardId', dashboardId);
      await deleteConnectionAction(null, fd);
    });
  }

  return (
    <div className={`flex items-center gap-3 py-3 border-b border-zinc-800/50 last:border-0 ${isPending ? 'opacity-50' : ''}`}>
      {/* Status dot */}
      <button
        onClick={canManage ? cycleStatus : undefined}
        disabled={!canManage || isPending}
        className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT[conn.status]} ${canManage ? 'cursor-pointer hover:opacity-70 transition-opacity' : 'cursor-default'}`}
        title={canManage ? 'Clique para alterar status' : STATUS_LABEL[conn.status]}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-white">{formatProvider(conn.provider)}</p>
          <span className={`text-xs ${STATUS_COLOR[conn.status]}`}>
            {STATUS_LABEL[conn.status]}
          </span>
        </div>
        {conn.last_event_at ? (
          <p className="text-xs text-zinc-600">
            Último evento: {new Date(conn.last_event_at).toLocaleString('pt-BR')}
          </p>
        ) : (
          <p className="text-xs text-zinc-700">Sem eventos recebidos</p>
        )}
      </div>

      {/* Credentials indicator */}
      <div className="shrink-0 text-xs">
        <span className="text-emerald-700 font-mono" title="Credenciais armazenadas">🔒</span>
      </div>

      {canManage && (
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onEdit(conn)} className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors" title="Editar">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          {canDelete && (
            <button onClick={handleDelete} className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors" title="Excluir">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Selector de provider primário de receita — só exibido para dono/head na seção Vendas.
// Quando definido, apenas vendas desse provider entram no DRE.
function PrimaryProviderSelector({
  vendaProviders,
  primaryProvider,
  dashboardId,
}: {
  vendaProviders: string[];
  primaryProvider: string | null;
  dashboardId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [current, setCurrent] = useState(primaryProvider ?? '');

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    setCurrent(value);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('dashboardId', dashboardId);
      fd.set('primary_sale_provider', value);
      await setPrimaryProviderAction(null, fd);
    });
  }

  return (
    <div className="mt-3 pt-3 border-t border-zinc-700/50 flex items-center gap-2 flex-wrap">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-500 shrink-0">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p className="text-xs text-zinc-400 shrink-0">Fonte primária de receita:</p>
      <select
        value={current}
        onChange={handleChange}
        disabled={isPending}
        className="flex-1 min-w-[160px] text-xs bg-[#0D0D0D] border border-white/[0.08] text-zinc-300 rounded-lg px-2 py-1 focus:outline-none focus:border-amber-600 disabled:opacity-50"
      >
        <option value="">— contar todos (sem fonte definida)</option>
        {vendaProviders.map(p => (
          <option key={p} value={p}>{formatProvider(p)}</option>
        ))}
      </select>
      {isPending && <span className="text-xs text-zinc-600">salvando…</span>}
      {!current && vendaProviders.length > 1 && (
        <span className="text-xs text-amber-600">Múltiplos providers — risco de dupla contagem</span>
      )}
    </div>
  );
}

interface Props {
  connections: IntegrationConnection[];
  dashboardId: string;
  canManage: boolean;
  canDelete: boolean;
  primaryProvider: string | null;
}

export function IntegrationCenterClient({ connections, dashboardId, canManage, canDelete, primaryProvider }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editConn, setEditConn] = useState<IntegrationConnection | undefined>(undefined);

  const byCategory = {
    venda:      connections.filter(c => c.category === 'venda'),
    tracker:    connections.filter(c => c.category === 'tracker'),
    atribuicao: connections.filter(c => c.category === 'atribuicao'),
    trafego:    connections.filter(c => c.category === 'trafego'),
    banco:      connections.filter(c => c.category === 'banco'),
  };

  const totalConectadas = connections.filter(c => c.status === 'conectada').length;
  const totalErro = connections.filter(c => c.status === 'erro').length;

  function openEdit(conn: IntegrationConnection) {
    setEditConn(conn);
    setShowForm(true);
  }

  return (
    <div>
      {/* Stats + add button */}
      <div className="flex items-center gap-4 mb-4">
        <div>
          <p className="text-lg font-bold tabular-nums text-white">{connections.length}</p>
          <p className="text-xs text-zinc-500">Conexões</p>
        </div>
        {totalConectadas > 0 && (
          <div>
            <p className="text-lg font-bold tabular-nums text-emerald-400">{totalConectadas}</p>
            <p className="text-xs text-zinc-500">Conectadas</p>
          </div>
        )}
        {totalErro > 0 && (
          <div>
            <p className="text-lg font-bold tabular-nums text-red-400">{totalErro}</p>
            <p className="text-xs text-zinc-500">Com erro</p>
          </div>
        )}
        {canManage && (
          <button
            onClick={() => { setEditConn(undefined); setShowForm(true); }}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors border border-zinc-700"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nova conexão
          </button>
        )}
      </div>

      {/* Grouped by category */}
      <div className="flex flex-col gap-3">
        {(Object.keys(byCategory) as Array<keyof typeof byCategory>).map(cat => {
          const items = byCategory[cat];

          // Open Finance / Banco: sempre exibe como "Em breve"
          if (cat === 'banco') {
            return (
              <div key="banco" className="bg-zinc-900/60 border border-dashed border-zinc-800 rounded-xl p-4 opacity-60">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-zinc-600">{CATEGORY_ICON['banco']}</span>
                  <p className="text-xs font-semibold text-zinc-600 uppercase tracking-widest">Open Finance / Banco</p>
                  <span className="ml-auto text-[10px] bg-zinc-800 text-zinc-600 px-1.5 py-px rounded font-semibold">Em breve</span>
                </div>
                <p className="text-xs text-zinc-700">
                  Conecte sua conta bancária (Pluggy, Belvo, Klavi) para conciliação automática.
                </p>
              </div>
            );
          }

          if (items.length === 0 && !canManage) return null;
          const vendaProviders = cat === 'venda' ? items.map(c => c.provider) : [];
          const showPrimarySelector = cat === 'venda' && canDelete && vendaProviders.length > 0;
          return (
            <div key={cat} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-zinc-500">{CATEGORY_ICON[cat]}</span>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">{CATEGORY_LABEL[cat]}</p>
                <span className="ml-auto text-xs text-zinc-600">{items.length}</span>
              </div>
              {items.length === 0 ? (
                <p className="text-xs text-zinc-700 py-1">Nenhuma conexão. {canManage && 'Adicione acima.'}</p>
              ) : (
                items.map(conn => (
                  <ConnectionRow
                    key={conn.id}
                    conn={conn}
                    dashboardId={dashboardId}
                    canManage={canManage}
                    canDelete={canDelete}
                    onEdit={openEdit}
                  />
                ))
              )}
              {showPrimarySelector && (
                <PrimaryProviderSelector
                  vendaProviders={vendaProviders}
                  primaryProvider={primaryProvider}
                  dashboardId={dashboardId}
                />
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-zinc-700 mt-3">
        O provider primário define qual fonte conta no DRE. Vendas de outros providers são gravadas para auditoria mas não somam receita.
      </p>

      {showForm && (
        <ConnectionForm
          dashboardId={dashboardId}
          editConnection={editConn}
          onClose={() => { setShowForm(false); setEditConn(undefined); }}
        />
      )}
    </div>
  );
}
