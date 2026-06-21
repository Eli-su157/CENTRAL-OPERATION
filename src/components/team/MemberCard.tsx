'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  updateMemberAction,
  addOverrideAction,
  removeOverrideAction,
  removeMemberAction,
} from '@/app/app/equipe/actions';
import type { ActionState } from '@/app/app/equipe/actions';
import type { UserRole, UserSector } from '@/lib/types/database';
import type { OverrideType } from '@/lib/auth/permissions';
import { formatCurrency } from '@/lib/utils/format';
import { MetricBlock } from '@/components/ui';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface MemberOverride {
  type: OverrideType;
  value: Record<string, unknown> | null;
}

export interface MemberStats {
  a_fazer:          number;
  fazendo:          number;
  atrasadas:        number;
  concluida_mes:    number;
  /** Materiais no ar criados por este membro — ativado pela Fase D */
  criativos_no_ar?: number;
}

export interface Member {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  sector: UserSector | null;
  created_at: string;
  overrides: MemberOverride[];
}

interface Props {
  member: Member;
  currentUserId: string;
  stats: MemberStats;
  /** Custo do mês (comissões/pagamentos) — null = sem dados ou sem permissão */
  custoMes?: number | null;
  /** Dashboards para o selector de restrito_a_dashboard */
  dashboards?: { id: string; name: string }[];
}

// ── Constantes ────────────────────────────────────────────────────────────────

const roleLabels: Record<UserRole, string> = {
  dono: 'Dono', head: 'Head', lider: 'Líder', executor: 'Executor',
};
const roleBadge: Record<UserRole, string> = {
  dono:     'bg-orange-500 text-white',
  head:     'bg-blue-600 text-white',
  lider:    'bg-emerald-600 text-white',
  executor: 'bg-zinc-600 text-white',
};
const sectorLabels: Record<UserSector, string> = {
  trafego: 'Tráfego', edicao: 'Edição', dev: 'Dev', financeiro: 'Financeiro',
};
const sectorColor: Record<UserSector, string> = {
  trafego:    'text-blue-400 bg-blue-500/10',
  edicao:     'text-violet-400 bg-violet-500/10',
  dev:        'text-zinc-400 bg-zinc-700',
  financeiro: 'text-emerald-400 bg-emerald-500/10',
};
const overrideLabels: Record<OverrideType, string> = {
  ver_financeiro: 'Ver Financeiro',
  atribuir_tarefa: 'Atribuir Tarefa',
  restrito_a_dashboard: 'Restrito a Dashboard',
};
const overrideBadgeCls: Record<OverrideType, string> = {
  ver_financeiro: 'bg-amber-900/50 text-amber-300 border-amber-700/50',
  atribuir_tarefa: 'bg-sky-900/50 text-sky-300 border-sky-700/50',
  restrito_a_dashboard: 'bg-rose-900/50 text-rose-300 border-rose-700/50',
};
const needsSector = (role: UserRole) => role === 'lider' || role === 'executor';

// Descrição de desempenho por setor (o que é possível vincular hoje)
const SECTOR_PERF: Record<UserSector, { label: string; available: boolean; hint: string }> = {
  trafego:    { label: 'ROAS das campanhas', available: false, hint: 'Disponível na Fase D — vínculo por pessoa não implementado' },
  edicao:     { label: 'Criativos vencedores', available: false, hint: 'Disponível na Fase D — vínculo material × membro' },
  dev:        { label: 'Integrações ativas', available: false, hint: 'Disponível na Fase D' },
  financeiro: { label: 'Lançamentos do período', available: false, hint: 'Disponível na Fase D' },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function SaveButton({ label = 'Salvar' }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="px-3 py-1.5 rounded-md text-xs font-semibold bg-orange-500 hover:bg-orange-400 text-white transition-colors disabled:opacity-50">
      {pending ? '...' : label}
    </button>
  );
}

function RemoveOverrideBadge({ memberId, type }: { memberId: string; type: OverrideType }) {
  const [state, action] = useActionState(removeOverrideAction as (s: ActionState, f: FormData) => Promise<ActionState>, null);
  return (
    <form action={action} className="inline-flex items-center">
      <input type="hidden" name="memberId" value={memberId} />
      <input type="hidden" name="type" value={type} />
      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${overrideBadgeCls[type]}`}>
        {overrideLabels[type]}
        <button type="submit" title="Remover" className="opacity-60 hover:opacity-100 ml-0.5">×</button>
      </span>
      {state && 'error' in state && <span className="ml-2 text-xs text-red-400">{state.error}</span>}
    </form>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function MemberCard({ member, currentUserId, stats, custoMes, dashboards = [] }: Props) {
  const [section, setSection] = useState<'edit' | 'override' | 'remove' | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>(member.role);
  const [selectedOverrideType, setSelectedOverrideType] = useState<OverrideType>('ver_financeiro');

  const [editState,   editAction]   = useActionState(updateMemberAction as (s: ActionState, f: FormData) => Promise<ActionState>, null);
  const [addState,    addAction]    = useActionState(addOverrideAction   as (s: ActionState, f: FormData) => Promise<ActionState>, null);
  const [removeState, removeAction] = useActionState(removeMemberAction  as (s: ActionState, f: FormData) => Promise<ActionState>, null);

  const isSelf  = member.id === currentUserId;
  const isDono  = member.role === 'dono';
  const toggle  = (s: typeof section) => setSection(prev => prev === s ? null : s);

  const inputCls = 'bg-[#0D0D0D] border border-white/[0.08] text-white rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/40';

  const joinedDate = new Date(member.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  const perf = member.sector ? SECTOR_PERF[member.sector] : null;

  return (
    <div className={`bg-[#0f0f12] rounded-xl border overflow-hidden shimmer-sweep hover:-translate-y-0.5 transition-all duration-300 ${
      stats.atrasadas > 0
        ? 'border-red-900/30 hover:border-red-800/40'
        : 'border-white/[0.06] hover:border-orange-500/20'
    }`}>
      {/* ── Linha principal ──────────────────────────────────── */}
      <div className="flex items-start gap-3 p-4">
        {/* Avatar */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white ${
          stats.atrasadas > 0 ? 'bg-red-900/50' : 'bg-gradient-to-br from-zinc-600 to-zinc-800'
        }`}>
          {member.full_name[0]?.toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {/* Nome + badges */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-zinc-200">{member.full_name}</span>
            {isSelf && <span className="text-[10px] text-zinc-600">(você)</span>}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${roleBadge[member.role]}`}>
              {roleLabels[member.role]}
            </span>
            {member.sector && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${sectorColor[member.sector]}`}>
                {sectorLabels[member.sector]}
              </span>
            )}
            {/* Data de entrada */}
            <span className="text-[10px] text-zinc-700">desde {joinedDate}</span>
          </div>
          <p className="text-xs text-zinc-600 truncate">{member.email}</p>

          {/* Overrides ativos */}
          {member.overrides.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {member.overrides.map(o => (
                <RemoveOverrideBadge key={o.type} memberId={member.id} type={o.type} />
              ))}
            </div>
          )}
        </div>

        {/* Ações */}
        {!isSelf && !isDono && (
          <div className="flex gap-1 shrink-0">
            <button onClick={() => toggle('edit')}
              className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                section === 'edit'
                  ? 'bg-white/[0.08] border-white/[0.12] text-white'
                  : 'border-white/[0.07] text-zinc-500 hover:text-zinc-200 hover:border-white/[0.10]'
              }`}>
              Papel
            </button>
            <button onClick={() => toggle('override')}
              className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                section === 'override'
                  ? 'bg-white/[0.08] border-white/[0.12] text-white'
                  : 'border-white/[0.07] text-zinc-500 hover:text-zinc-200 hover:border-white/[0.10]'
              }`}>
              Exceção
            </button>
            <button onClick={() => toggle('remove')}
              className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                section === 'remove'
                  ? 'bg-red-900/60 border-red-700 text-red-300'
                  : 'border-white/[0.07] text-zinc-600 hover:text-red-400 hover:border-red-900'
              }`}>
              ×
            </button>
          </div>
        )}
      </div>

      {/* ── Métricas de carga e desempenho ───────────────────── */}
      <div className="px-4 pb-4 border-t border-white/[0.04] pt-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <MetricBlock
            label="Fazendo"
            value={String(stats.fazendo)}
            valueClass={stats.fazendo > 0 ? 'text-amber-400' : 'text-zinc-600'}
          />
          <MetricBlock
            label="A fazer"
            value={String(stats.a_fazer)}
            valueClass={stats.a_fazer > 0 ? 'text-zinc-200' : 'text-zinc-600'}
          />
          <MetricBlock
            label="Atrasadas"
            value={String(stats.atrasadas)}
            valueClass={stats.atrasadas > 0 ? 'text-red-400' : 'text-zinc-600'}
          />
          <MetricBlock
            label="Concluídas (mês)"
            value={String(stats.concluida_mes)}
            valueClass={stats.concluida_mes > 0 ? 'text-emerald-400' : 'text-zinc-600'}
          />
        </div>

        {/* Custo do mês (só Dono/Head — passado do servidor com proteção) */}
        {custoMes !== undefined && custoMes !== null && (
          <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
            <span className="text-[10px] text-zinc-600 uppercase tracking-[0.1em] font-semibold">Custo mês</span>
            <span className="text-xs font-semibold num text-red-400">{formatCurrency(custoMes)}</span>
            {stats.concluida_mes > 0 && custoMes > 0 && (
              <span className="text-[10px] text-zinc-700 ml-1">
                · {formatCurrency(custoMes / stats.concluida_mes)}/tarefa
              </span>
            )}
          </div>
        )}

        {/* Performance por setor — editor tem dado real; demais em breve */}
        {perf && (
          <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04] mt-2">
            <span className="text-[10px] text-zinc-600 uppercase tracking-[0.1em] font-semibold">{perf.label}</span>
            {member.sector === 'edicao' && stats.criativos_no_ar !== undefined ? (
              <span className="text-xs font-semibold text-emerald-400">
                {stats.criativos_no_ar} no ar
              </span>
            ) : (
              <span className="badge-neutral">Em breve</span>
            )}
          </div>
        )}
      </div>

      {/* ── Seção: Editar papel/setor ─────────────────────────── */}
      {section === 'edit' && (
        <div className="border-t border-white/[0.05] p-4 bg-white/[0.01]">
          <p className="text-[10px] text-zinc-600 uppercase tracking-[0.1em] font-semibold mb-3">Editar papel e setor</p>
          <form action={editAction} className="flex flex-col gap-3">
            <input type="hidden" name="memberId" value={member.id} />
            {editState && 'error' in editState && <p className="text-xs text-red-400">{editState.error}</p>}
            {editState && 'success' in editState && <p className="text-xs text-emerald-400">{editState.success}</p>}
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-600 uppercase tracking-[0.1em] font-semibold">Papel</label>
                <select name="role" value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value as UserRole)}
                  className={inputCls}>
                  <option value="head">Head</option>
                  <option value="lider">Líder</option>
                  <option value="executor">Executor</option>
                </select>
              </div>
              {needsSector(selectedRole) && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-zinc-600 uppercase tracking-[0.1em] font-semibold">Setor</label>
                  <select name="sector" defaultValue={member.sector ?? ''} required className={inputCls}>
                    <option value="">Selecione...</option>
                    <option value="trafego">Tráfego</option>
                    <option value="edicao">Edição</option>
                    <option value="dev">Dev</option>
                    <option value="financeiro">Financeiro</option>
                  </select>
                </div>
              )}
              <SaveButton label="Salvar papel" />
            </div>
          </form>
        </div>
      )}

      {/* ── Seção: Exceção de permissão ───────────────────────── */}
      {section === 'override' && (
        <div className="border-t border-white/[0.05] p-4 bg-white/[0.01]">
          <p className="text-[10px] text-zinc-600 uppercase tracking-[0.1em] font-semibold mb-3">Exceção de permissão</p>
          <form action={addAction} className="flex flex-col gap-3">
            <input type="hidden" name="memberId" value={member.id} />
            {addState && 'error' in addState && <p className="text-xs text-red-400">{addState.error}</p>}
            {addState && 'success' in addState && <p className="text-xs text-emerald-400">{addState.success}</p>}
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-600 uppercase tracking-[0.1em] font-semibold">Tipo</label>
                <select name="type" value={selectedOverrideType}
                  onChange={e => setSelectedOverrideType(e.target.value as OverrideType)}
                  className={inputCls}>
                  <option value="ver_financeiro">Ver Financeiro</option>
                  <option value="atribuir_tarefa">Atribuir Tarefa</option>
                  <option value="restrito_a_dashboard">Restrito a Dashboard</option>
                </select>
              </div>
              {selectedOverrideType === 'atribuir_tarefa' && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-zinc-600 uppercase tracking-[0.1em] font-semibold">Escopo</label>
                  <select name="escopo" className={inputCls}>
                    <option value="meu_setor">Meu setor</option>
                    <option value="todos">Todos</option>
                  </select>
                </div>
              )}
              {selectedOverrideType === 'restrito_a_dashboard' && dashboards.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-zinc-600 uppercase tracking-[0.1em] font-semibold">Dashboard</label>
                  <select name="dashboardId" className={inputCls}>
                    <option value="">Selecione...</option>
                    {dashboards.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
              <SaveButton label="Adicionar" />
            </div>
          </form>
        </div>
      )}

      {/* ── Seção: Confirmar remoção ──────────────────────────── */}
      {section === 'remove' && (
        <div className="border-t border-red-900/30 p-4 bg-red-950/10">
          <p className="text-sm text-zinc-300 mb-3">
            Remover <strong className="text-white">{member.full_name}</strong> da operação? Esta ação não pode ser desfeita.
          </p>
          {removeState && 'error' in removeState && <p className="text-xs text-red-400 mb-2">{removeState.error}</p>}
          <form action={removeAction} className="flex gap-2">
            <input type="hidden" name="memberId" value={member.id} />
            <SaveButton label="Confirmar remoção" />
            <button type="button" onClick={() => setSection(null)}
              className="px-3 py-1.5 rounded-md text-xs text-zinc-400 hover:text-white border border-white/[0.07] hover:border-white/[0.12] transition-colors">
              Cancelar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
