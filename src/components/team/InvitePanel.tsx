'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createInviteAction, cancelInviteAction } from '@/app/app/equipe/actions';
import type { InviteState, ActionState } from '@/app/app/equipe/actions';
import type { UserRole, UserSector } from '@/lib/types/database';

const inputCls =
  'w-full bg-[#0D0D0D] border border-white/[0.08] text-white placeholder-zinc-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/30';
const labelCls = 'text-xs font-medium text-zinc-400 uppercase tracking-wide';

interface PendingInvite {
  id: string;
  email: string;
  role: UserRole;
  sector: UserSector | null;
  link: string;
  created_at: string;
}

interface Props {
  pendingInvites: PendingInvite[];
}

const roleLabels: Record<UserRole, string> = {
  dono: 'Dono', head: 'Head', lider: 'Líder', executor: 'Executor',
};
const sectorLabels: Record<UserSector, string> = {
  trafego: 'Tráfego', edicao: 'Edição', dev: 'Dev', financeiro: 'Financeiro',
};
const needsSector = (role: UserRole) => role === 'lider' || role === 'executor';

function InviteSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-400 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? 'Criando...' : 'Criar convite'}
    </button>
  );
}

function CancelInviteButton({ inviteId }: { inviteId: string }) {
  const [state, action, isPending] = useActionState(cancelInviteAction as (s: ActionState, f: FormData) => Promise<ActionState>, null);
  return (
    <form action={action} className="inline">
      <input type="hidden" name="inviteId" value={inviteId} />
      <button
        type="submit"
        disabled={isPending}
        className="text-xs text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-50"
      >
        {state && 'error' in state ? state.error : isPending ? '...' : 'Cancelar'}
      </button>
    </form>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="shrink-0 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors"
    >
      {copied ? 'Copiado!' : 'Copiar link'}
    </button>
  );
}

export function InvitePanel({ pendingInvites }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('executor');
  const [panelKey, setPanelKey] = useState(0);
  const [inviteState, inviteAction] = useActionState(createInviteAction as (s: InviteState, f: FormData) => Promise<InviteState>, null);

  const hasLink = inviteState && 'link' in inviteState;
  const hasError = inviteState && 'error' in inviteState;

  function resetPanel() {
    setPanelKey(k => k + 1);
    setOpen(false);
  }

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-white">Convidar pessoa</h2>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-orange-500 hover:bg-orange-400 text-white transition-colors"
          >
            + Convidar
          </button>
        )}
      </div>

      {open && (
        <div key={panelKey} className="mb-6">
          {hasLink ? (
            <div className="flex flex-col gap-4">
              <div className="bg-emerald-950 border border-emerald-800 rounded-lg p-4">
                <p className="text-sm font-medium text-emerald-400 mb-1">
                  Convite criado para {inviteState.email}
                </p>
                <p className="text-xs text-zinc-400">Copie e envie o link abaixo:</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={inviteState.link}
                  className="flex-1 bg-[#0D0D0D] border border-white/[0.08] text-zinc-300 rounded-lg px-3 py-2 text-xs font-mono truncate"
                />
                <CopyButton text={inviteState.link} />
              </div>
              <button
                onClick={resetPanel}
                className="text-sm text-zinc-400 hover:text-white transition-colors self-start"
              >
                ← Criar outro convite
              </button>
            </div>
          ) : (
            <form action={inviteAction} className="flex flex-col gap-4">
              {hasError && (
                <div className="bg-red-950 border border-red-800 text-red-400 px-3 py-2 rounded-lg text-sm">
                  {inviteState.error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <label className={labelCls}>E-mail</label>
                  <input name="email" type="email" required placeholder="pessoa@email.com" className={inputCls} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Papel</label>
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
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls}>Setor</label>
                    <select name="sector" required className={inputCls}>
                      <option value="trafego">Tráfego</option>
                      <option value="edicao">Edição</option>
                      <option value="dev">Dev</option>
                      <option value="financeiro">Financeiro</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <InviteSubmitButton />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-600 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Convites pendentes */}
      {pendingInvites.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium mb-1">
            Pendentes ({pendingInvites.length})
          </p>
          {pendingInvites.map(invite => (
            <div
              key={invite.id}
              className="flex items-center justify-between gap-3 py-2.5 px-3 bg-zinc-800/50 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{invite.email}</p>
                <p className="text-xs text-zinc-500">
                  {roleLabels[invite.role]}
                  {invite.sector ? ` · ${sectorLabels[invite.sector]}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <CopyButton text={invite.link} />
                <CancelInviteButton inviteId={invite.id} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        !open && (
          <p className="text-sm text-zinc-600">Nenhum convite pendente.</p>
        )
      )}
    </div>
  );
}
