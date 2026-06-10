'use client';

import { useActionState } from 'react';
import { login } from '@/app/actions';
import { SubmitButton } from './SubmitButton';

const inputCls =
  'w-full bg-transparent border-b border-white/10 text-white placeholder-white/20 px-0 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors';

export function LoginForm() {
  const [state, action] = useActionState(login, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.error && (
        <div className="bg-red-950 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm">
          {state.error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-email" className="text-xs font-medium text-white/30 uppercase tracking-widest">
          E-mail
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="seu@email.com"
          className={inputCls}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-password" className="text-xs font-medium text-white/30 uppercase tracking-widest">
          Senha
        </label>
        <input
          id="login-password"
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
  );
}
