'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { login } from '@/app/actions';
import { SubmitButton } from './SubmitButton';

const inputCls =
  'w-full bg-[var(--surface-2)] border border-[var(--border)] text-foreground placeholder-foreground/20 px-3 py-2.5 rounded text-sm focus:outline-none transition-colors';

export default function LoginCard() {
  const [state, action] = useActionState(login, null);

  return (
    <div className="login-card anim-in bg-[var(--surface-1)] rounded-xl p-8 w-full">
      <h2 className="text-foreground font-semibold text-base mb-1">Entrar</h2>
      <p className="text-foreground/40 text-sm mb-6">Entre com sua conta para continuar.</p>

      <form action={action} className="flex flex-col gap-4">
        {state?.error && (
          <div className="border border-red-800 bg-red-950 text-red-400 px-4 py-3 rounded text-sm">
            {state.error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="lc-email" className="text-xs font-medium text-foreground/30 uppercase tracking-widest">
            E-mail
          </label>
          <input
            id="lc-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="seu@email.com"
            className={inputCls}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="lc-password" className="text-xs font-medium text-foreground/30 uppercase tracking-widest">
            Senha
          </label>
          <input
            id="lc-password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className={inputCls}
          />
        </div>

        <SubmitButton label="Entrar" loadingLabel="Entrando..." />
      </form>

      <p className="mt-6 pt-5 border-t border-[var(--border)] text-sm text-foreground/40">
        Ainda não tem conta?{' '}
        <Link href="/signup" className="text-brand hover:underline">
          Criar operação
        </Link>
      </p>
    </div>
  );
}
