'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { saveGoalsAction } from '@/app/app/d/[dashboardId]/trafego/actions';
import type { TrafficActionState } from '@/app/app/d/[dashboardId]/trafego/actions';
import { formatCurrency } from '@/lib/utils/format';

interface Goals {
  meta_gasto: number | null;
  meta_faturamento: number | null;
  roas_alvo: number | null;
}

interface Props {
  dashboardId: string;
  period: string; // YYYY-MM
  goals: Goals;
  actual: {
    gasto_dia: number;
    faturamento_dia: number;
    roas_confirmado: number;
    roas_projetado: number;
  };
  diasNoMes: number;
  diaAtual: number;
}

function pace(actual: number, meta: number, diaAtual: number, diasNoMes: number): {
  projecao: number; status: 'ok' | 'risco' | 'critico';
} {
  const projecao = (actual / diaAtual) * diasNoMes;
  const pct = projecao / meta;
  return {
    projecao,
    status: pct >= 0.95 ? 'ok' : pct >= 0.75 ? 'risco' : 'critico',
  };
}

function ProgressBar({ value, max, status }: { value: number; max: number; status: string }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = status === 'ok' ? 'bg-emerald-500' : status === 'risco' ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function SaveBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="text-xs px-3 py-1.5 rounded-md bg-orange-500 hover:bg-orange-400 text-white transition-colors disabled:opacity-50">
      {pending ? '...' : 'Salvar'}
    </button>
  );
}

const inputCls = 'bg-[#0D0D0D] border border-white/[0.08] text-white rounded-md px-2.5 py-1.5 text-sm w-28 focus:outline-none focus:ring-1 focus:ring-orange-500/40';

export function MetasBlock({ dashboardId, period, goals, actual, diasNoMes, diaAtual }: Props) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState(
    saveGoalsAction as (s: TrafficActionState, f: FormData) => Promise<TrafficActionState>,
    null
  );

  const gastoMonth = actual.gasto_dia * diaAtual;  // estimativa simples (mock)
  const fatMonth   = actual.faturamento_dia * diaAtual;

  const gastoPace  = goals.meta_gasto ? pace(gastoMonth, goals.meta_gasto, diaAtual, diasNoMes) : null;
  const fatPace    = goals.meta_faturamento ? pace(fatMonth, goals.meta_faturamento, diaAtual, diasNoMes) : null;
  const roasStatus = goals.roas_alvo
    ? (actual.roas_confirmado >= goals.roas_alvo ? 'ok' : actual.roas_confirmado >= goals.roas_alvo * 0.85 ? 'risco' : 'critico')
    : 'ok';

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Metas do Mês</p>
          <p className="text-xs text-zinc-600 mt-0.5">{period} · dia {diaAtual}/{diasNoMes}</p>
        </div>
        <button onClick={() => setEditing(e => !e)}
          className="text-xs text-zinc-500 hover:text-orange-400 transition-colors">
          {editing ? 'Cancelar' : 'Editar metas'}
        </button>
      </div>

      {editing ? (
        <form action={action} className="flex flex-col gap-3" onSubmit={() => setEditing(false)}>
          <input type="hidden" name="dashboardId" value={dashboardId} />
          <input type="hidden" name="period" value={period} />
          {state && 'error' in state && <p className="text-xs text-red-400">{state.error}</p>}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Meta gasto (R$)</p>
              <input name="meta_gasto" type="number" step="100" defaultValue={goals.meta_gasto ?? ''} placeholder="0" className={inputCls} />
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Meta faturamento (R$)</p>
              <input name="meta_faturamento" type="number" step="100" defaultValue={goals.meta_faturamento ?? ''} placeholder="0" className={inputCls} />
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">ROAS alvo</p>
              <input name="roas_alvo" type="number" step="0.1" defaultValue={goals.roas_alvo ?? 3} className={inputCls} />
            </div>
          </div>
          <SaveBtn />
        </form>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Gasto */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-zinc-400">Gasto</p>
              {goals.meta_gasto && (
                <span className={`text-xs font-medium ${
                  gastoPace?.status === 'ok' ? 'text-emerald-400' :
                  gastoPace?.status === 'risco' ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {goals.meta_gasto ? ((gastoMonth / goals.meta_gasto) * 100).toFixed(0) : 0}%
                </span>
              )}
            </div>
            <p className="text-lg font-bold text-white tabular-nums">{formatCurrency(actual.gasto_dia)}<span className="text-xs text-zinc-500 font-normal">/dia</span></p>
            {goals.meta_gasto && gastoPace && (
              <>
                <ProgressBar value={gastoMonth} max={goals.meta_gasto} status={gastoPace.status} />
                <p className="text-xs text-zinc-600 mt-1">
                  Pace: {formatCurrency(gastoPace.projecao)} / meta {formatCurrency(goals.meta_gasto)}
                </p>
              </>
            )}
          </div>

          {/* Faturamento */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-zinc-400">Faturamento</p>
              {goals.meta_faturamento && (
                <span className={`text-xs font-medium ${
                  fatPace?.status === 'ok' ? 'text-emerald-400' :
                  fatPace?.status === 'risco' ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {((fatMonth / goals.meta_faturamento) * 100).toFixed(0)}%
                </span>
              )}
            </div>
            <p className="text-lg font-bold text-white tabular-nums">{formatCurrency(actual.faturamento_dia)}<span className="text-xs text-zinc-500 font-normal">/dia</span></p>
            {goals.meta_faturamento && fatPace && (
              <>
                <ProgressBar value={fatMonth} max={goals.meta_faturamento} status={fatPace.status} />
                <p className="text-xs text-zinc-600 mt-1">
                  Pace: {formatCurrency(fatPace.projecao)} / meta {formatCurrency(goals.meta_faturamento)}
                </p>
              </>
            )}
          </div>

          {/* ROAS duplo */}
          <div>
            <p className="text-xs text-zinc-400 mb-1.5">ROAS</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold tabular-nums ${
                roasStatus === 'ok' ? 'text-emerald-400' : roasStatus === 'risco' ? 'text-amber-400' : 'text-red-400'
              }`}>
                {actual.roas_confirmado.toFixed(2)}x
              </span>
              <span className="text-sm text-zinc-500 tabular-nums" title="ROAS projetado (inclui pix gerado)">
                ~{actual.roas_projetado.toFixed(2)}x
              </span>
            </div>
            <p className="text-xs text-zinc-600">
              confirmado · projetado · alvo {goals.roas_alvo?.toFixed(2) ?? '—'}x
            </p>
            {goals.roas_alvo && (
              <ProgressBar
                value={actual.roas_confirmado}
                max={goals.roas_alvo}
                status={roasStatus}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
