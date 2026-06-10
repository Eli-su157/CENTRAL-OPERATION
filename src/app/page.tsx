'use client';

import { useState } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';

type Tab = 'login' | 'signup';

export default function HomePage() {
  const [tab, setTab] = useState<Tab>('login');

  return (
    <div className="min-h-screen flex">

      {/* ──────────── PAINEL ESQUERDO — IDENTIDADE ──────────── */}
      <div className="hidden lg:flex lg:w-[55%] bg-[#0A0A0A] flex-col justify-between p-12 relative overflow-hidden">

        {/* Elemento geométrico de fundo */}
        <div className="absolute top-0 right-0 w-px h-full bg-white/[0.04]" />
        <div className="absolute bottom-0 left-12 right-12 h-px bg-white/[0.06]" />
        <div className="absolute top-1/3 -right-32 w-64 h-64 rounded-full border border-orange-500/10" />
        <div className="absolute top-1/3 -right-20 w-36 h-36 rounded-full border border-orange-500/10" />

        {/* Logo */}
        <div className="flex items-center gap-3 z-10">
          <div className="w-8 h-8 bg-orange-500 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="6" height="6" fill="white" />
              <rect x="9" y="1" width="6" height="6" fill="white" />
              <rect x="9" y="9" width="6" height="6" fill="white" />
              <rect x="1" y="9" width="6" height="6" fill="white" />
            </svg>
          </div>
          <span className="text-white/50 text-xs tracking-[0.2em] uppercase font-medium">
            Central de Operações
          </span>
        </div>

        {/* Headline central */}
        <div className="z-10">
          <p className="text-white/30 text-sm tracking-widest uppercase mb-6 font-medium">
            Plataforma de gestão
          </p>
          <h1 className="text-white font-bold leading-none mb-8" style={{ fontSize: 'clamp(48px, 5.5vw, 80px)' }}>
            Sua operação<br />
            <span className="text-orange-500">inteira.</span><br />
            Um lugar só.
          </h1>
          <p className="text-white/40 text-base max-w-xs leading-relaxed">
            Vendas, tráfego, financeiro e equipe — tudo conectado em tempo real.
          </p>
        </div>

        {/* Feature list */}
        <div className="z-10">
          <div className="flex flex-col gap-4">
            {[
              ['Vendas reais', 'Hotmart, Paradise, Vega, Shopify'],
              ['Tráfego conectado', 'Meta Ads + Google Ads'],
              ['Financeiro unificado', 'DRE via calc.ts — fonte única'],
              ['Motor de alertas', 'ROAS, reembolso, meta, pixel'],
            ].map(([title, sub]) => (
              <div key={title} className="flex items-start gap-4">
                <div className="w-1 h-1 rounded-full bg-orange-500 mt-2 shrink-0" />
                <div>
                  <p className="text-white text-sm font-medium">{title}</p>
                  <p className="text-white/30 text-xs mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 pt-8 border-t border-white/[0.06] flex items-center gap-2">
            <span className="text-white/20 text-xs tracking-widest uppercase">v1.0</span>
            <span className="text-white/10 text-xs">·</span>
            <span className="text-white/20 text-xs">Fases 0–10 completas</span>
          </div>
        </div>
      </div>

      {/* ──────────── PAINEL DIREITO — FORMULÁRIO ──────────── */}
      <div className="flex-1 bg-[#111111] flex flex-col justify-center px-8 sm:px-16 py-12 relative">

        {/* Logo mobile */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <div className="w-7 h-7 bg-orange-500 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="6" height="6" fill="white" />
              <rect x="9" y="1" width="6" height="6" fill="white" />
              <rect x="9" y="9" width="6" height="6" fill="white" />
              <rect x="1" y="9" width="6" height="6" fill="white" />
            </svg>
          </div>
          <span className="text-white/50 text-xs tracking-[0.2em] uppercase font-medium">Central de Operações</span>
        </div>

        <div className="w-full max-w-sm">

          {/* Abas visíveis — Entrar / Cadastrar */}
          <div className="flex mb-8 border-b border-white/[0.08]">
            <button
              onClick={() => setTab('login')}
              className={`pb-3 pr-6 text-sm font-semibold transition-colors relative ${
                tab === 'login' ? 'text-white' : 'text-white/30 hover:text-white/60'
              }`}
            >
              Entrar
              {tab === 'login' && (
                <span className="absolute bottom-0 left-0 right-6 h-[2px] bg-orange-500" />
              )}
            </button>
            <button
              onClick={() => setTab('signup')}
              className={`pb-3 pr-6 text-sm font-semibold transition-colors relative ${
                tab === 'signup' ? 'text-white' : 'text-white/30 hover:text-white/60'
              }`}
            >
              Criar Conta
              {tab === 'signup' && (
                <span className="absolute bottom-0 left-0 right-6 h-[2px] bg-orange-500" />
              )}
            </button>
          </div>

          {/* Subtítulo dinâmico */}
          <p className="text-white/30 text-sm mb-8 -mt-2">
            {tab === 'login'
              ? 'Entre com sua conta para continuar.'
              : 'Você será o Dono e poderá convidar a equipe depois.'}
          </p>

          {/* Formulário */}
          {tab === 'login' ? <LoginForm /> : <SignupForm />}

          {/* Convite */}
          <p className="mt-6 text-white/20 text-xs pt-6 border-t border-white/[0.06]">
            Recebeu um convite? Acesse o link enviado por e-mail.
          </p>
        </div>
      </div>

    </div>
  );
}
