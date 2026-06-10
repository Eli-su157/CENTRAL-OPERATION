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

// ---- tipos ----
export interface MemberOverride {
  type: OverrideType;
  value: Record<string, unknown> | null;
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
}

// ---- constants ----
const roleLabels: Record<UserRole, string> = {
  dono: 'Dono', head: 'Head', lider: 'Líder', executor: 'Executor',
};
const roleBadge: Record<UserRole, string> = {
  dono: 'bg-violet-600', head: 'bg-blue-600', lider: 'bg-emerald-600', executor: 'bg-zinc-600',
};
const sectorLabels: Record<UserSector, string> = {
  trafego: 'Tráfego', edicao: 'Edição', dev: 'Dev', financeiro: 'Financeiro',
};
const overrideLabels: Record<OverrideType, string> = {
  ver_financeiro: 'Ver Financeiro',
  atribuir_tarefa: 'Atribuir Tarefa',
  restrito_a_dashboard: 'Restrito a Dashboard',
};
const overrideBadge: Record<OverrideType, string> = {
  ver_financeiro: 'bg-amber-900 text-amber-300 border-amber-700',
  atribuir_tarefa: 'bg-sky-900 text-sky-300 border-sky-700',
  restrito_a_dashboard: 'bg-rose-900 text-rose-300 border-rose-700',
};
const needsSector = (role: UserRole) => role === 'lider' || role === 'executor';

// ---- sub-components ----

function SaveButton({ label = 'Salvar' }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-3 py-1.5 rounded-md text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50"
    >
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
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${overrideBadge[type]}`}>
        {overrideLabels[type]}
        <button type="submit" title="Remover" className="opacity-60 hover:opacity-100 ml-0.5 leading-none">×</button>
      </span>
      {state && 'error' in state && (
        <span className="ml-2 text-xs text-red-400">{state.error}</span>
      )}
    </form>
  );
}

// ---- main component ----

export function MemberCard({ member, currentUserId }: Props) {
  const [section, setSection] = useState<'edit' | 'override' | 'remove' | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>(member.role);
  const [selectedOverrideType, setSelectedOverrideType] = useState<OverrideType>('ver_financeiro');

  const [editState, editAction] = useActionState(updateMemberAction as (s: ActionState, f: FormData) => Promise<ActionState>, null);
  const [addState, addAction] = useActionState(addOverrideAction as (s: ActionState, f: FormData) => Promise<ActionState>, null);
  const [removeState, removeAction] = useActionState(removeMemberAction as (s: ActionState, f: FormData) => Promise<ActionState>, null);

  const isSelf = member.id === currentUserId;
  const isDono = member.role === 'dono';

  const toggle = (s: typeof section) => setSection(prev => prev === s ? null : s);

  const inputCls =
    'bg-zinc-800 border border-zinc-700 text-white rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent';

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Linha principal */}
      <div className="flex items-center gap-3 p-4">
        <div className="w-9 h-9 rounded-full bg-zinc-700 flex items-center justify-center shrink-0 text-sm font-bold text-white">
          {member.full_name[0]?.toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-white">{member.full_name}</span>
            {isSelf && <span className="text-xs text-zinc-500">(você)</span>}
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full text-white ${roleBadge[member.role]}`}>
              {roleLabels[member.role]}
            </span>
            {member.sector && (
              <span className="text-xs text-zinc-400">{sectorLabels[member.sector]}</span>
            )}
          </div>
          <p className="text-xs text-zinc-500 truncate mt-0.5">{member.email}</p>

          {/* Overrides ativos */}
          {member.overrides.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {member.overrides.map(o => (
                <RemoveOverrideBadge key={o.type} memberId={member.id} type={o.type} />
              ))}
            </div>
          )}
        </div>

        {/* Ações — só para não-donos e não-self */}
        {!isSelf && !isDono && (
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => toggle('edit')}
              className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                section === 'edit'
                  ? 'bg-zinc-700 border-zinc-600 text-white'
                  : 'border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600'
              }`}
            >
              Editar
            </button>
            <button
              onClick={() => toggle('override')}
              className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                section === 'override'
                  ? 'bg-zinc-700 border-zinc-600 text-white'
                  : 'border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600'
              }`}
            >
              Exceção
            </button>
            <button
              onClick={() => toggle('remove')}
              className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                section === 'remove'
                  ? 'bg-red-900 border-red-700 text-red-300'
                  : 'border-zinc-700 text-zinc-500 hover:text-red-400 hover:border-red-800'
              }`}
            >
              Remover
            </button>
          </div>
        )}
      </div>

      {/* Seção: Editar papel/setor */}
      {section === 'edit' && (
        <div className="border-t border-zinc-800 p-4 bg-zinc-800/30">
          <form action={editAction} className="flex flex-col gap-3">
            <input type="hidden" name="memberId" value={member.id} />

            {editState && 'error' in editState && (
              <p className="text-xs text-red-400">{editState.error}</p>
            )}
            {editState && 'success' in editState && (
              <p className="text-xs text-emerald-400">{editState.success}</p>
            )}

            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500 uppercase tracking-wide">Papel</label>
                <select
                  name="role"
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value as UserRole)}
                  className={inputCls}
                >
                  <option value="head">Head</option>
                  <option value="lider">Líder</option>
                  <option value="executor">Executor</option>
                </select>
              </div>

              {needsSector(selectedRole) && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-zinc-500 uppercase tracking-wide">Setor</label>
                  <select
                    name="sector"
                    defaultValue={member.sector ?? ''}
                    required
                    className={inputCls}
                  >
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

      {/* Seção: Adicionar exceção */}
      {section === 'override' && (
        <div className="border-t border-zinc-800 p-4 bg-zinc-800/30">
          <form action={addAction} className="flex flex-col gap-3">
            <input type="hidden" name="memberId" value={member.id} />
            <p className="text-xs text-zinc-400 font-medium">Adicionar exceção de permissão:</p>

            {addState && 'error' in addState && (
              <p className="text-xs text-red-400">{addState.error}</p>
            )}
            {addState && 'success' in addState && (
              <p className="text-xs text-emerald-400">{addState.success}</p>
            )}

            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500 uppercase tracking-wide">Tipo</label>
                <select
                  name="type"
                  value={selectedOverrideType}
                  onChange={e => setSelectedOverrideType(e.target.value as OverrideType)}
                  className={inputCls}
                >
                  <option value="ver_financeiro">Ver Financeiro</option>
                  <option value="atribuir_tarefa">Atribuir Tarefa</option>
                  <option value="restrito_a_dashboard">Restrito a Dashboard</option>
                </select>
              </div>

              {selectedOverrideType === 'atribuir_tarefa' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-zinc-500 uppercase tracking-wide">Escopo</label>
                  <select name="escopo" className={inputCls}>
                    <option value="meu_setor">Meu setor</option>
                    <option value="todos">Todos os setores</option>
                  </select>
                </div>
              )}

              {selectedOverrideType === 'restrito_a_dashboard' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-zinc-500 uppercase tracking-wide">ID do Dashboard</label>
                  <input
                    name="dashboardId"
                    type="text"
                    placeholder="uuid do dashboard"
                    className={`${inputCls} w-48`}
                  />
                </div>
              )}

              <SaveButton label="Adicionar" />
            </div>
          </form>
        </div>
      )}

      {/* Seção: Confirmar remoção */}
      {section === 'remove' && (
        <div className="border-t border-zinc-800 p-4 bg-red-950/20">
          <p className="text-sm text-zinc-300 mb-3">
            Remover <strong>{member.full_name}</strong> da operação? Esta ação não pode ser desfeita.
          </p>

          {removeState && 'error' in removeState && (
            <p className="text-xs text-red-400 mb-2">{removeState.error}</p>
          )}

          <form action={removeAction} className="flex gap-2">
            <input type="hidden" name="memberId" value={member.id} />
            <SaveButton label="Confirmar remoção" />
            <button
              type="button"
              onClick={() => setSection(null)}
              className="px-3 py-1.5 rounded-md text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-600 transition-colors"
            >
              Cancelar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
