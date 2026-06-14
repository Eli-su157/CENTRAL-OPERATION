'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { signUpOwner } from '@/app/actions';
import { SubmitButton } from './SubmitButton';

const fieldCls =
  'w-full bg-transparent border-0 border-b border-white/[0.10] text-foreground text-sm px-0 py-2.5 ' +
  'placeholder-foreground/20 focus:outline-none focus:border-brand ' +
  'transition-[border-color,box-shadow] duration-200 ' +
  'focus:[box-shadow:0_2px_12px_-2px_rgba(249,115,22,0.35)] ' +
  'autofill:bg-transparent';

export default function SignupCard() {
  const [state, action] = useActionState(signUpOwner, null);

  return (
    <div
      className={
        'login-card anim-in relative w-full rounded-xl p-8 ' +
        'bg-white/[0.025] border border-white/[0.07] backdrop-blur-md ' +
        'shadow-[0_0_40px_-8px_rgba(0,0,0,0.8)]'
      }
      style={{ animationDelay: '80ms' }}
    >
      {/* corner accents — pure decoration */}
      <span aria-hidden="true" className="pointer-events-none absolute top-0 left-0 w-10 h-10 border-t border-l border-brand/40 rounded-tl-xl" />
      <span aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 w-10 h-10 border-b border-r border-brand/20 rounded-br-xl" />

      {/* Header */}
      <div className="mb-8 pb-6 border-b border-white/[0.06]">
        <p className="font-mono text-[9px] tracking-[0.3em] text-brand/50 uppercase mb-2">ZÊNITE // NOVA INSTÂNCIA</p>
        <h2 className="text-foreground font-bold text-lg tracking-tight leading-none">
          CRIAR OPERAÇÃO<span className="text-brand">.</span>
        </h2>
        <p className="font-mono text-[10px] text-foreground/30 tracking-wide mt-2 leading-relaxed">
          {'[ NOVA INSTÂNCIA ] VOCÊ SERÁ O DONO. CONVIDE SUA EQUIPE DEPOIS.'}
        </p>
      </div>

      <form action={action} className="flex flex-col gap-7">
        {state?.error && (
          <div className="font-mono text-[10px] tracking-wide border border-red-700/50 bg-red-950/30 text-red-400 px-3 py-2.5 rounded">
            {'[ ERROR ] '}{state.error}
          </div>
        )}

        {/* NOME DO OPERADOR */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="sc-fullName"
            className="font-mono text-[9px] tracking-[0.25em] text-foreground/35 uppercase"
          >
            NOME DO OPERADOR
          </label>
          <input
            id="sc-fullName"
            name="fullName"
            type="text"
            required
            autoComplete="name"
            placeholder="Full name"
            className={fieldCls}
          />
        </div>

        {/* NOME DA OPERAÇÃO */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="sc-operationName"
            className="font-mono text-[9px] tracking-[0.25em] text-foreground/35 uppercase"
          >
            NOME DA OPERAÇÃO
          </label>
          <input
            id="sc-operationName"
            name="operationName"
            type="text"
            required
            placeholder="e.g. Alpha Launch"
            className={fieldCls}
          />
        </div>

        {/* EMAIL */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="sc-email"
            className="font-mono text-[9px] tracking-[0.25em] text-foreground/35 uppercase"
          >
            E-MAIL
          </label>
          <input
            id="sc-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="operator@domain.com"
            className={fieldCls}
          />
        </div>

        {/* CHAVE DE ACESSO */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="sc-password"
            className="font-mono text-[9px] tracking-[0.25em] text-foreground/35 uppercase"
          >
            CHAVE DE ACESSO
          </label>
          <input
            id="sc-password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            placeholder="Minimum 8 characters"
            className={fieldCls}
          />
        </div>

        <div className="pt-1">
          <SubmitButton label="CRIAR OPERAÇÃO" loadingLabel="[ PROVISIONANDO... ]" />
        </div>
      </form>

      <p className="mt-7 font-mono text-[10px] text-foreground/25 text-center tracking-wide">
        {'JÁ TEM ACESSO?'}{' '}
        <Link
          href="/"
          className="text-brand/70 hover:text-brand transition-colors tracking-widest"
        >
          ← VOLTAR AO ACESSO
        </Link>
      </p>
    </div>
  );
}
