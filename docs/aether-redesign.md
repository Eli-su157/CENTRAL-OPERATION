# ÆTHER / AETHER.OS — Redesign visual login + signup

## Conceito
Cibernético, imersivo, "Holographic Void". Fundo vivo, tipografia agressiva, neon sutil sobre preto profundo. MAS sem quebrar usabilidade nem performance.

## Identidade
- Nome: ÆTHER (AETHER.OS).
- Acento de marca segue --accent / brand (#f97316 laranja). Pode somar um segundo tom de glow ciano/branco SÓ como luz, não como cor de marca.
- Fonte: Geist Sans + Geist Mono (já no projeto). Mono nos textos de "terminal".

## Copy (substitui a atual)
- Título login: CONTROL THE FLOOD.
- Subtítulo (Geist Mono, pequeno): [ SYSTEM STATUS: OPERATIONAL ] OVERSEEING ALL REVENUE, TRAFFIC AND LOGISTICS IN SINGLE-STREAM CONVERGENCE.
- Botão login: INITIALIZE ÆTHER  (texto do SubmitButton, sem mexer na lógica).
- Signup: título "CREATE OPERATION." / botão "DEPLOY ÆTHER". Subtítulo curto no mesmo tom.

## Fundo — "Canvas of Streams" (Canvas 2D, NÃO Three.js/WebGL)
- Linhas verticais finas (0.5–1px) caindo devagar, tipo chuva digital minimalista, opacidade baixa.
- Reação sutil ao mouse: leve curvatura/brilho perto do ponteiro. Discreto, não exagerado.
- Implementar com <canvas> + requestAnimationFrame em um componente "use client" isolado (LoginBackground vira client SÓ por causa do canvas).
- Respeitar prefers-reduced-motion: se reduzido, renderiza as linhas ESTÁTICAS, sem animação.
- PROIBIDO Three.js/WebGL (peso). Só Canvas 2D nativo, zero dependência nova.

## Inputs — "fenda de luz" MAS sempre visíveis
- Estética: campo escuro, borda inferior fina que brilha (neon laranja sutil) no foco; pode ter glow.
- OBRIGATÓRIO: o campo é SEMPRE visível (não some até clicar). Label visível ou placeholder claro. Autofill e gerenciador de senha têm que funcionar — então input real, name= preservado, type correto.
- PROIBIDO: campo invisível que só aparece no clique. PROIBIDO embaralhar/decodificar o texto digitado (senha precisa ser conferível).

## Botão — "The Trigger"
- Estética de vidro/pílula com borda que acende; hover com glow/leve distorção de luz (sem glitch que atrapalhe o clique).
- Continua sendo o SubmitButton atual (só muda classe/texto), estado pending preservado.

## Telemetria decorativa (cantos)
- Pequenos blocos em Geist Mono nos cantos com números rodando (coordenadas, uso de memória simulado, taxa fake). DECORATIVO — gerar localmente, comentar no código que é fake. Pausar em prefers-reduced-motion.

## Efeito de decode (opcional, SÓ decorativo)
- Pode aplicar embaralhamento de caracteres no TÍTULO ("CONTROL THE FLOOD") na entrada da página. NUNCA em campos de input.

## Performance
- Sem dependência nova (sem Three, sem libs de animação). Canvas 2D nativo.
- Canvas leve: pausar quando aba não está visível (visibilitychange), limitar densidade de linhas.
- Auth interativa no primeiro frame. O canvas roda atrás, nunca bloqueia o form.

## Arquivos (1 microtask cada, /clear entre cada)
1. docs/aether-redesign.md (este).
2. login-background.tsx → reescrever como canvas "Canvas of Streams" (client).
3. login-hero.tsx → nova copy ÆTHER + título com decode opcional.
4. login-card.tsx → nova estética de inputs/fenda (lógica login() intacta).
5. signup-card.tsx → mesma estética (lógica signUpOwner() intacta).
6. SubmitButton.tsx → estética "Trigger" + aceitar novos textos via props (sem mudar useFormStatus).
7. telemetry-corners.tsx → novo componente decorativo (client).
8. page.tsx e signup/page.tsx → compor tudo + telemetria nos cantos.
9. Build + QA.

## Checklist final
- [ ] build limpo, zero dependência nova
- [ ] login() e signUpOwner() intactas, name= preservados, auth funcionando
- [ ] inputs SEMPRE visíveis, autofill/senha funcionando
- [ ] senha NÃO embaralha
- [ ] prefers-reduced-motion: canvas estático + telemetria parada
- [ ] canvas pausa em aba oculta
- [ ] form clicável no primeiro frame
- [ ] mobile usável (canvas leve, card acessível)

## FATOS DO REPO — CONFIRMADOS

### SubmitButton (src/components/auth/SubmitButton.tsx)
**Já aceita `label` e `loadingLabel` por prop.** Interface atual:

```ts
interface Props {
  label: string;
  loadingLabel?: string;  // default: 'Aguarde...'
}
```

O componente usa `useFormStatus` para ler `pending` — lógica 100% intacta ao mudar apenas classes e textos passados via prop. Para o redesign, basta:
- Passar `label="INITIALIZE ÆTHER"` no login e `label="DEPLOY ÆTHER"` no signup.
- Trocar o `className` interno para a estética "Trigger" (vidro/pílula/glow).
- O `loadingLabel` pode virar `"[ PROCESSING... ]"` para manter o tom terminal.

### Geist Sans + Geist Mono
Já presentes no projeto (confirmado em commits anteriores). Usar `font-mono` do Tailwind para textos de terminal.

### brand / --accent
`bg-brand`, `text-brand`, `border-brand` já funcionam via variável CSS. Glow laranja via `shadow-[0_0_12px_theme(colors.brand)]` ou similar no Tailwind.
