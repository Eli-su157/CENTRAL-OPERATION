'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { signUpOwner } from '@/app/actions';
import { SubmitButton } from './SubmitButton';

const inputCls =
  'w-full bg-[var(--surface-2)] border border-[var(--border)] text-foreground placeholder-foreground/20 px-3 py-2.5 rounded text-sm focus:outline-none transition-colors';

export default function SignupCard() {
  const [state, action] = useActionState(signUpOwner, null);

  return (
    <div className="login-card anim-in bg-[var(--surface-1)] rounded-xl p-8 w-full">
      <h2 className="text-foreground font-semibold text-base mb-1">Criar operação</h2>
      <p className="text-foreground/40 text-sm mb-6">Você será o Dono e poderá convidar sua equipe depois.</p>

      <form action={action} className="flex flex-col gap-4">
        {state?.error && (
          <div className="border border-red-800 bg-red-950 text-red-400 px-4 py-3 rounded text-sm">
            {state.error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="sc-fullName" className="text-xs font-medium text-foreground/30 uppercase tracking-widest">
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

        <div className="flex flex-col gap-1.5">
          <label htmlFor="sc-operationName" className="text-xs font-medium text-foreground/30 uppercase tracking-widest">
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

        <div className="flex flex-col gap-1.5">
          <label htmlFor="sc-email" className="text-xs font-medium text-foreground/30 uppercase tracking-widest">
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

        <div className="flex flex-col gap-1.5">
          <label htmlFor="sc-password" className="text-xs font-medium text-foreground/30 uppercase tracking-widest">
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

        <SubmitButton label="Criar Conta" loadingLabel="Criando..." />
      </form>

      <p className="mt-6 pt-5 border-t border-[var(--border)] text-sm text-foreground/40">
        Já tem conta?{' '}
        <Link href="/" className="text-brand hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
