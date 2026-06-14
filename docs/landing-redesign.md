# Landing/Login Redesign — Central de Operações

## Princípio
Terminal financeiro de elite. Sóbrio, "caro", Linear/Stripe. Nada chama atenção sozinho; o conjunto impõe respeito.

## Tokens (reusar os existentes, NÃO criar novos)
- Superfícies: --surface-0 #09090B (fundo) / --surface-1 #121214 (card) / --surface-2 #18181B (elevação)
- Borda: --border #27272A
- Marca: --accent (laranja). USAR a CSS var, NUNCA hardcode.
- Verde/vermelho NÃO aparecem no login.
- Fonte: Geist Sans (texto) + Geist Mono (números/labels), já via next/font.

## Fundo — grid base + glow opcional (default OFF)
.login-bg-grid{
  background-image: radial-gradient(circle, rgba(255,255,255,.035) 1px, transparent 1px);
  background-size: 32px 32px;
  -webkit-mask-image: radial-gradient(ellipse 80% 80% at 50% 40%, #000 0%, transparent 78%);
          mask-image: radial-gradient(ellipse 80% 80% at 50% 40%, #000 0%, transparent 78%);
}
@keyframes breathe{0%,100%{opacity:.05;transform:scale(1)}50%{opacity:.09;transform:scale(1.06)}}
.login-bg-glow{
  background: radial-gradient(600px circle at 50% 30%, color-mix(in oklab, var(--accent) 40%, transparent), transparent 70%);
  animation: breathe 14s ease-in-out infinite;
  will-change: opacity, transform;
}
Proibido: partícula, constelação, 3D, neon, canvas, JS no fundo.

## Animação de entrada — só CSS, fade + slide curto
@keyframes fade-up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.anim-in{animation:fade-up .4s cubic-bezier(.16,1,.3,1) both}
@media (prefers-reduced-motion: reduce){
  .anim-in{animation:none}
  .login-bg-glow{animation:none;opacity:.06}
}
Regra dura: o card NUNCA fica bloqueado por animação. Sem typing/sci-fi.

## Card de login — borda acende no foco
.login-card{border:1px solid var(--border);transition:border-color .15s, box-shadow .15s}
.login-card:focus-within{
  border-color: color-mix(in oklab, var(--accent) 50%, var(--border));
  box-shadow: 0 0 0 1px color-mix(in oklab, var(--accent) 25%, transparent),
              0 0 28px -10px color-mix(in oklab, var(--accent) 35%, transparent);
}
Botão "Entrar" = accent sólido, texto de alto contraste, hover leve.

## Performance (1º contato — abrir instantâneo)
- Tudo Server Component, EXCETO o card (form) = "use client".
- Zero lib de animação. Só CSS. Fundo 100% CSS.
- Geist via next/font (sem FOUT). Form interativo no primeiro paint. Sem splash/boot.

## Arquivos (1 microtask cada)
1. globals.css — ADICIONAR keyframes + classes (aditivo).
2. components/auth/login-background.tsx — grid (+glow opcional). Server.
3. components/auth/login-hero.tsx — título + features, .anim-in. Server.
4. components/auth/login-card.tsx — form + focus-glow. "use client".
5. <rota-login>/page.tsx — compõe bg + hero + card; 2 colunas desktop, empilha mobile (card primeiro).
6. Build + QA.

## Checklist final
- [ ] npm run build limpo
- [ ] card clicável no primeiro frame
- [ ] prefers-reduced-motion respeitado
- [ ] mobile empilha, card acessível sem scroll
- [ ] só 1 laranja em tela
- [ ] nenhuma lib nova no bundle / zero console error

## FATOS DO REPO (preencher agora, com base no reconhecimento)
- Hex real do --accent: `#f97316` (orange-500 — definido em `tailwind.config.ts` como `brand.DEFAULT`)
- Caminho real do globals.css: `src/app/globals.css`
- Caminho/rota real da página de login: `src/app/page.tsx` (rota `/`)
- Setup de fonte (arquivo + nomes das vars Geist): `src/app/layout.tsx` — `GeistSans` aplicado via `.className` no `<body>`, `GeistMono` aplicado via `.variable` (`--font-geist-mono`). Ambos importados de `geist/font/sans` e `geist/font/mono`.
- Arquivo/função do fluxo de auth Supabase a reaproveitar: `src/app/actions.ts` — função `login(prevState, formData)` (Server Action) que chama `supabase.auth.signInWithPassword` e redireciona para `/app`. Já consumida pelo `LoginForm` via `useActionState`.
