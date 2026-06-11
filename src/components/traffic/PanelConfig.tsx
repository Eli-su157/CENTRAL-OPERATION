'use client';

import { useState, useActionState } from 'react';
import { savePanelConfigAction } from '@/app/app/d/[dashboardId]/trafego/actions';
import type { TrafficActionState } from '@/app/app/d/[dashboardId]/trafego/actions';
import { useFormStatus } from 'react-dom';
import { DEFAULT_BLOCK_ORDER } from '@/lib/traffic/panelDefaults';

export const BLOCK_LABELS: Record<string, string> = {
  metas:         'Metas do Mês',
  decisao:       'Visão de Decisão',
  funil:         'Funil de Conversão',
  reconciliacao: 'Reconciliação de Fontes',
  saude:         'Saúde das Contas',
  temporal:      'Evolução Temporal',
  alertas:       'Alertas',
};

export { DEFAULT_BLOCK_ORDER, DEFAULT_ENABLED_BLOCKS } from '@/lib/traffic/panelDefaults';

interface Props {
  dashboardId: string;
  enabled: Record<string, boolean>;
  order: string[];
}

function SaveBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="px-4 py-2 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50">
      {pending ? 'Salvando...' : 'Salvar configuração'}
    </button>
  );
}

export function PanelConfig({ dashboardId, enabled, order }: Props) {
  const [open, setOpen] = useState(false);
  const [localEnabled, setLocalEnabled] = useState(enabled);
  const [state, action] = useActionState(
    savePanelConfigAction as (s: TrafficActionState, f: FormData) => Promise<TrafficActionState>,
    null
  );

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-violet-400 transition-colors">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
        </svg>
        Configurar blocos
      </button>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-white">Configurar blocos do painel</p>
        <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="dashboardId" value={dashboardId} />
        <input type="hidden" name="enabled_blocks" value={JSON.stringify(localEnabled)} />
        <input type="hidden" name="block_order" value={JSON.stringify(order)} />

        {state && 'error' in state && <p className="text-xs text-red-400">{state.error}</p>}

        <div className="grid grid-cols-2 gap-2">
          {DEFAULT_BLOCK_ORDER.map(blockId => (
            <label key={blockId} className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={!!localEnabled[blockId]}
                onChange={e => setLocalEnabled(prev => ({ ...prev, [blockId]: e.target.checked }))}
                className="w-4 h-4 rounded bg-zinc-800 border-zinc-600 text-violet-500 focus:ring-violet-500"
              />
              <span className="text-sm text-zinc-300">{BLOCK_LABELS[blockId]}</span>
            </label>
          ))}
        </div>

        <div className="flex gap-3">
          <SaveBtn />
          <button type="button" onClick={() => setOpen(false)}
            className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white border border-zinc-700 transition-colors">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
