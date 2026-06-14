'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { signUpOwner } from '@/app/actions';
import { SubmitButton } from './SubmitButton';

const inputCls =
  'w-full bg-[var(--surface-0)] border border-[var(--border)] text-foreground placeholder-foreground/20 px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-brand/40 focus:ring-1 focus:ring-brand/15 transition-all';

export default function SignupCard() {
  const [state, action] = useActionState(signUpOwner, null);

  return (
    <div className="login-card anim-in bg-[var(--surface-1)] rounded-2xl p-8 w-full" style={{ animationDelay: '80ms' }}>

      {/* Header do card */}
      <div className="flex items-center gap-3 mb-8 pb-6 border-b border-[var(--border)]">
        <div className="w-8 h-8 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <rect x="1" y="1" width="5" height="5" rx="1" fill="#f97316" />
            <rect x="8" y="1" width="5" height="5" rx="1" fill="#f97316" opacity=".5" />
            <rect x="8" y="8" width="5" height="5" rx="1" fill="#f97316" />
            <rect x="1" y="8" width="5" height="5" rx="1" fill="#f97316" opacity=".5" />
          </svg>
        </div>
        <div>
          <h2 className="text-foreground font-semibold text-sm leading-none">Criar operação</h2>
          <p className="text-foreground/35 text-xs mt-1">Você será o Dono da conta</p>
        </div>
      </div>

      <form action={action} className="flex flex-col gap-5">
        {state?.error && (
          <div className="border border-red-800/60 bg-red-950/40 text-red-400 px-4 py-3 rounded-lg text-xs">
            {state.error}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="sc-fullName" className="text-[10px] font-semibold text-foreground/30 uppercase tracking-[0.15em]">
            Seu nome
          </label>
          <input
            id="sc-fullName"
            name="fullName"
            type="text"
            required
            autoComplete="name"
            placeholder="João Silva"
            className={inputCls}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="sc-operationName" className="text-[10px] font-semibold text-foreground/30 uppercase tracking-[0.15em]">
            Nome da operação
          </label>
          <input
            id="sc-operationName"
            name="operationName"
            type="text"
            required
            placeholder="Ex: Lançamento Alfa"
            className={inputCls}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="sc-email" className="text-[10px] font-semibold text-foreground/30 uppercase tracking-[0.15em]">
            E-mail
          </label>
          <input
            id="sc-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="seu@email.com"
            className={inputCls}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="sc-password" className="text-[10px] font-semibold text-foreground/30 uppercase tracking-[0.15em]">
            Senha
          </label>
          <input
            id="sc-password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            minLength={8}
            className={inputCls}
          />
        </div>

        <div className="pt-1">
          <SubmitButton label="Criar Conta" loadingLabel="Criando..." />
        </div>
      </form>

      <p className="mt-6 text-sm text-foreground/30 text-center">
        Já tem conta?{' '}
        <Link href="/" className="text-brand hover:text-brand/80 transition-colors font-medium">
          Entrar →
        </Link>
      </p>
    </div>
  );
}
