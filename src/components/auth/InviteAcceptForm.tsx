'use client';

import { useActionState } from 'react';
import { acceptInvite } from '@/app/actions';
import { SubmitButton } from './SubmitButton';
import type { UserRole, UserSector } from '@/lib/types/database';

const inputCls =
  'w-full bg-[#0D0D0D] border border-white/[0.08] text-white placeholder-zinc-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/30 transition-colors';

const roleLabels: Record<UserRole, string> = {
  dono: 'Dono',
  head: 'Head',
  lider: 'Líder',
  executor: 'Executor',
};

const sectorLabels: Record<UserSector, string> = {
  trafego: 'Tráfego',
  edicao: 'Edição',
  dev: 'Dev',
  financeiro: 'Financeiro',
};

interface Props {
  token: string;
  email: string;
  operationName: string;
  role: UserRole;
  sector: UserSector | null;
}

export function InviteAcceptForm({ token, email, operationName, role, sector }: Props) {
  const [state, action] = useActionState(acceptInvite, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      {state?.error && (
        <div className="bg-red-950 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm">
          {state.error}
        </div>
      )}

      {/* Contexto do convite */}
      <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg p-4 flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-zinc-400">Operação</span>
          <span className="text-white font-medium">{operationName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400">Papel</span>
          <span className="text-orange-400 font-medium">{roleLabels[role]}</span>
        </div>
        {sector && (
          <div className="flex justify-between">
            <span className="text-zinc-400">Setor</span>
            <span className="text-white">{sectorLabels[sector]}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-zinc-400">E-mail</span>
          <span className="text-zinc-300">{email}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="invite-fullName" className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
          Seu nome
        </label>
        <input
          id="invite-fullName"
          name="fullName"
          type="text"
          required
          autoComplete="name"
          placeholder="João Silva"
          className={inputCls}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="invite-password" className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
          Criar senha
        </label>
        <input
          id="invite-password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          minLength={8}
          className={inputCls}
        />
      </div>

      <SubmitButton label="Aceitar Convite" loadingLabel="Processando..." />
    </form>
  );
}
