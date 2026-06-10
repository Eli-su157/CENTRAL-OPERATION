'use client';

import { useActionState } from 'react';
import { signUpOwner } from '@/app/actions';
import { SubmitButton } from './SubmitButton';

const inputCls =
  'w-full bg-transparent border-b border-white/10 text-white placeholder-white/20 px-0 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors';

const labelCls = 'text-xs font-medium text-white/30 uppercase tracking-widest';

export function SignupForm() {
  const [state, action] = useActionState(signUpOwner, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.error && (
        <div className="bg-red-950 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm">
          {state.error}
        </div>
      )}

      <div className="border-l-2 border-orange-500 pl-3 py-1 text-xs text-white/40">
        Você será o <span className="text-white/70 font-medium">Dono</span> da operação e poderá convidar sua equipe depois.
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="signup-fullName" className={labelCls}>
          Seu nome
        </label>
        <input
          id="signup-fullName"
          name="fullName"
          type="text"
          required
          autoComplete="name"
          placeholder="João Silva"
          className={inputCls}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="signup-operationName" className={labelCls}>
          Nome da operação
        </label>
        <input
          id="signup-operationName"
          name="operationName"
          type="text"
          required
          placeholder="Ex: Lançamento Alfa"
          className={inputCls}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="signup-email" className={labelCls}>
          E-mail
        </label>
        <input
          id="signup-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="seu@email.com"
          className={inputCls}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="signup-password" className={labelCls}>
          Senha
        </label>
        <input
          id="signup-password"
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
  );
}
