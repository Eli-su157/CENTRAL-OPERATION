# ZÊNITE — Rebrand visual final (login + signup)

## Nome: exibição vs técnico
- Exibição (na tela, logo, copy): ZÊNITE (com Ê circunflexo).
- Slug técnico (classes CSS, nomes de variável, arquivos, env): "zenite" SEM acento. NUNCA usar Ê em identificador de código.

## Substituições de texto (de → para)
- "ÆTHER" / "AETHER.OS" / "CONTROL THE FLOOD." → ZÊNITE
- Eyebrow/wordmark → ZÊNITE
- Botão login "INITIALIZE ÆTHER" → "AUTENTICAR" (ou "ACESSAR") ; loadingLabel → "[ AUTENTICANDO... ]"
- Botão signup "DEPLOY ÆTHER" → "CRIAR OPERAÇÃO" ; loadingLabel → "[ PROVISIONANDO... ]"
- Copy de apoio volta pro PORTUGUÊS no tom terminal:
  - Subtítulo login: "[ PROTOCOLO ATIVO ] CONVERGÊNCIA ABSOLUTA DE DADOS."
  - Acima do form: "[ AUTENTICAÇÃO DE SEGURANÇA ]"
  - Signup título: "CRIAR OPERAÇÃO." / subtítulo "[ NOVA INSTÂNCIA ] VOCÊ SERÁ O DONO. CONVIDE SUA EQUIPE DEPOIS."

## Logo ZÊNITE — referência visual confirmada (screenshot 2026-06-14)

### Tipografia
- Fonte: display geométrica bold/extra-bold, caixa alta. Candidatas: Orbitron, Rajdhani, ou fonte do sistema já em uso no projeto. Traço fino mas legível, sem serifa.
- letter-spacing: ~0.15–0.2em (largo, mas não exagerado — as letras ficam próximas o suficiente pra ler como bloco único).
- Cor base: branco puro (#ffffff).
- Tamanho: gigante — preenche ~70–80% da largura na referência. Em CSS: `clamp(4rem, 12vw, 9rem)` aproximado.

### Glow (text-shadow em camadas, SEM laranja)
```css
text-shadow:
  0 0 8px rgba(255,255,255,0.9),   /* núcleo intenso */
  0 0 20px rgba(255,255,255,0.6),  /* halo médio */
  0 0 60px rgba(255,255,255,0.25); /* bloom amplo */
```

### Linha horizontal (elemento chave da referência)
- Uma régua branca fina (1–2px) atravessa as letras na altura do meio (x-height ~50%), com bloom/glow próprio.
- Implementar como `<div>` absoluto ou `::after` do container do wordmark.
- `box-shadow: 0 0 8px 2px rgba(255,255,255,0.6)` na linha para o efeito de emissão.
- A linha vai de borda a borda da largura do wordmark.

### Animação de entrada (one-shot, SEM loop)
- `letter-spacing` entra de ~0em → valor final em ~600ms, easing `ease-out`.
- `opacity` 0 → 1 em paralelo (~400ms).
- A linha horizontal faz fade-in com ~200ms de delay após o wordmark.
- `prefers-reduced-motion`: aparece diretamente no estado final, sem transição.

### Subtítulo abaixo do wordmark
- "[ PROTOCOLO ATIVO. ]" em linha 1 e "[ CONVERGÊNCIA ABSOLUTA DE DADOS ]" em linha 2.
- Fonte mono, tamanho pequeno (~10–11px), cor branco/60, tracking largo.
- Posicionado com espaço generoso abaixo da linha horizontal (não colado no wordmark).

### Diamante decorativo
- Ícone ♦ branco pequeno (~12px) no canto inferior direito da tela (fixo/absoluto), decorativo.

## Fundo — grid de perspectiva (Canvas 2D, reaproveitar login-background.tsx)
- Trocar a "chuva vertical" por uma GRADE DE PERSPECTIVA no terço inferior da tela (linhas que convergem pra um horizonte, estilo "chão" synthwave), cinza MUITO escuro (~#111 / rgba branco .03-.06), com leve movimento pra frente (sensação de avanço lento).
- Pode manter algumas linhas verticais sutis no topo (os "nodos de dados") se ficar coerente.
- Reação opcional ao teclado: um pulso sutil que clareia as linhas brevemente quando o usuário digita. SE for simples; se complicar, pular.
- Canvas 2D nativo apenas. Manter TODAS as travas que já existem: rAF cancelado no cleanup, pausa em document.hidden, prefers-reduced-motion estático, DPR capado em 2, resize handler.

## Layout monolítico
- Centralizar verticalmente: logo ZÊNITE gigante em cima, form de login logo abaixo, centralizado (largura ~400px). Menos "duas colunas", mais coluna central única no desktop tb (pode manter telemetria/decoração nas laterais).
- Inputs no estilo "terminal": fundo transparente, só border-bottom que acende em brand no foco, texto digitado pode ser em brand (#f97316). SEMPRE VISÍVEIS, os dois.
- Mobile: tudo empilhado, form acessível sem scroll.

## Telemetria (manter o componente existente)
- Trocar textos pro tom ZÊNITE em português: "[ TAREFAS ATIVAS: N ]", "[ FLUXO DE RECEITA: ESTÁVEL ]", etc. Continua decorativo/fake, mesmas travas (interval limpo, pausa em hidden, reduced-motion estático, escondido no mobile).

## NÃO fazer (decisões já batidas)
- NÃO campo de senha que some até digitar e-mail (varredura). Os dois campos visíveis sempre.
- NÃO animação de saída que atrase o login (letras voando, descompressão) — a entrada no dashboard tem que ser imediata.
- NÃO WebGL/Three. NÃO neon berrante. NÃO embaralhar senha.

## Arquivos a tocar (1 microtask cada, /clear entre)
1. docs/zenite-redesign.md (este).
2. login-background.tsx → grid de perspectiva (reusar travas).
3. login-hero.tsx → logo ZÊNITE + copy PT.
4. login-card.tsx → re-skin terminal + textos PT (login() intacta).
5. signup-card.tsx → idem (signUpOwner() intacta).
6. SubmitButton.tsx → textos PT (lógica intacta).
7. telemetry-corners.tsx → textos PT.
8. page.tsx + signup/page.tsx → layout monolítico central.
9. Build + QA.

## Checklist final
- [ ] build limpo, zero dependência nova
- [ ] login() e signUpOwner() intactas, name= preservados
- [ ] os dois inputs sempre visíveis, autofill/senha funcionando, senha não embaralha
- [ ] nenhum "Ê" em identificador de código (só em texto exibido)
- [ ] canvas: rAF cleanup, pausa em hidden, reduced-motion estático, DPR cap 2
- [ ] telemetria: cleanup, pausa hidden, reduced-motion, escondida no mobile
- [ ] sem animação de saída que atrase o login
- [ ] mobile usável
- [ ] nenhuma menção a ÆTHER/AETHER sobrando em login ou signup
