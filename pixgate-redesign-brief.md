# Brief de Redesign — Bynd (nova marca, ex-PixGate) v2

> Documento de referência para reconstrução visual + expansão funcional do dashboard, sob a nova marca **Bynd**.
> Baseado em mapeamento da estrutura atual (pixgate.io/dashboard) + referência visual fornecida (app.pixgateip.com).

## 0. Marca

**Nome definido:** Bynd
- Abstrato, sem significado prévio — estratégia de marca tipo Nubank/Stone/Klarna: o nome vira sinônimo da categoria com o tempo, em vez de tentar descrevê-la.
- Disponibilidade (domínio) já confirmada pelo time. A referência ao PixGate mapeada neste documento serviu apenas de inspiração estrutural/visual — Bynd é uma marca e produto distintos, sem relação societária ou técnica com o PixGate.
- Registro formal (INPI) e reserva de redes sociais ficam para uma etapa posterior, fora do escopo deste documento.

---

## 1. Contexto

A estrutura atual do PixGate é funcionalmente sólida, mas visualmente genérica — padrão "SaaS financeiro" convencional (sidebar fixa + cards brancos + tabelas), indistinguível de qualquer outro gateway PIX do mercado (Asaas, Iugu, etc.).

Existe uma versão de referência (print enviado, domínio `app.pixgateip.com`) que aponta uma direção: tema escuro, elementos animados, dados vivos (gráficos, globo girando, indicadores em tempo real). Essa referência também revela **módulos funcionais novos** que não existem na versão atual — não é só repaginação visual, é evolução de produto.

**Decisão de escopo confirmada:** visual disruptivo + incorporação dos módulos novos.

---

## 2. Estrutura atual mapeada (linha de base)

```
Dashboard (home)
├── Carteira                          → saldo, depósito, retirada, histórico
├── Financeiro ▾
│   ├── Transações                    (rota interna: /cobrancas)
│   ├── Buscar Transações              (lookup por ID/doc/txid)
│   ├── Listagem QR Codes              (cobranças PIX geradas)
│   ├── Saques Pendentes               (pendentes + histórico)
│   └── Contestações Pix               (MED/disputas Bacen)
├── Relatórios                        (KPIs + gráfico + tabela diária)
├── Notas fiscais                     (NFS-e sobre taxas cobradas pelo PixGate)
├── Afiliados                         (indicação, 1 nível, 0,2% comissão)
├── Chamados                          (suporte/ticket)
└── Configurações ▾
    ├── Geral                         (perfil, senha, PIN 6 dígitos, sessões)
    ├── Webhooks                      (CRUD endpoints + eventos)
    ├── Desenvolvedores               (API keys + doc de endpoints)
    └── Taxas                         (histórico de tarifas vigentes)
```

**API exposta:** `https://pixgate.io/api/v1` — `GET /balance`, `POST /pix/charge`, `GET /pix/charge/{id}`, `POST /pix/withdraw`. Auth via `X-Api-Key`. Webhooks assinados HMAC-SHA256, header `X-PayGateway-Signature` (nome genérico sugere core white-label).

**Inconsistências a corrigir na v2:**
- Transações / Buscar Transações / QR Codes têm filtros redundantes — candidatas a unificação em uma tela com tabs.
- Saques Pendentes duplica "Histórico de Retiradas" já presente na Carteira.
- Rota `/cobrancas` não corresponde ao label "Transações" — alinhar nomenclatura.
- "Chamados" tem duas CTAs idênticas (header + empty state).
- Relatórios anuncia exportação no subtítulo sem botão visível — implementar ou remover a promessa.
- Taxa de saque mostra "máximo R$0,00" — corrigir exibição (deveria indicar "sem limite" ou ocultar).

---

## 3. Módulos novos a incorporar

### 3.1 Vendas
Visão de receita/conversão, separada do livro-caixa (Transações). Funil: cobrança gerada → paga → convertida, segmentado por canal (link direto, API, QR estático).
**Campos:** origem da venda, valor, status, taxa de conversão por canal.

### 3.2 Adquirentes — **operacional real, não decorativo**
Confirmado: o PixGate já opera múltiplos adquirentes com roteamento de fato. A tela precisa refletir dados reais, não só estética:
- Lista de adquirentes ativos: nome, status em tempo real (ativo/degradado/offline), % de tráfego roteado, taxa de sucesso rolling 24h, latência média de confirmação.
- Política de roteamento visível (ex: prioridade por taxa de sucesso, failover automático).
- Histórico de incidentes (quando/quanto tempo cada adquirente ficou degradado).
- **Pendência para o time técnico:** confirmar se a visão é por conta (merchant vê só os adquirentes que processam seu tráfego) ou visão global — assumindo por conta dado o contexto de painel de merchant.

Os indicadores "vivos" (pulso, cor mudando) nessa tela têm justificativa funcional real — são status operacional, não só efeito visual.

### 3.3 Saque Crypto
Fluxo próprio de conversão saldo BRL → cripto + saque para wallet (distinto do saque PIX existente).
**Campos:** rede (TRC20/ERC20/BTC), endereço de wallet, cotação no momento da solicitação, taxa de conversão, status on-chain da transação.

### 3.4 Permissões
Multiusuário por conta: dono cria sub-usuários com papéis (financeiro, suporte, dev) e escopos granulares (ver saldo, fazer saque, gerenciar webhooks).
**Tabela:** usuário, papel, último acesso, ações (editar/revogar).

### 3.5 Plano de Faturamento / Metas — **destrava benefício real, conecta com Taxas**
Confirmado: bater a meta de volume mensal reduz taxa/aumenta limite — não é gamificação vazia.
- Necessário definir tabela real de tiers (volume mínimo → taxa aplicada) antes da implementação — **não inventar números, pegar do time de pricing**.
- A tela de Taxas (já existente) precisa evoluir de "histórico estático" para incluir o **tier vigente** e o **próximo tier**.
- Cross-link direto: Dashboard (progresso da meta) → Configurações/Taxas (detalhe do tier) — deixar explícito o que muda ao bater a meta (ex: "ao atingir R$10k/mês, taxa de Depósito PIX cai de 2,5% para 2,0%").

### 3.6 Origem das Transações (globo)
Geolocalização agregada dos pagadores por país, com ranking lateral em %.
**Pendência:** confirmar fonte do dado — em PIX puro-BR isso só faz sentido pleno se houver base internacional real (cripto ou outros meios de pagamento). Verificar antes de prometer o widget como "ao vivo" com dados reais.

---

## 4. Direção visual

**Tema base:** Dark + acento único vibrante (não o gradiente multi-tom do print de referência).
**Cor de assinatura:** Verde-lima elétrico sobre fundo escuro neutro (quase preto / cinza-chumbo).

Justificativa: o mercado de gateways PIX é dominado por azul, roxo e verde-institucional (Bacen). Verde-lima elétrico em fundo escuro é incomum nessa categoria — cumpre o requisito de ser "totalmente disruptivo" através da escolha de cor isoladamente, sem depender só de efeitos.

**Princípios de motion (conforme pedido — nada estático):**
- Gráficos com linhas/áreas animando ao carregar e em transições de filtro (não snap instantâneo).
- Indicadores de status (Adquirentes, saúde de transação) com pulso/glow contínuo enquanto "ativo" — motion aqui é funcional, comunica tempo real.
- Globo (Origem das Transações) com rotação contínua lenta, destacando país conforme dado/hover.
- Contadores numéricos (KPIs) com count-up animado em vez de aparecer estático.
- Microinterações em hover/click consistentes em todo o design system — não isoladas a uma tela.

**Cuidado a manter no redesign:**
- Motion contínuo não deve prejudicar legibilidade de números financeiros — esses precisam ser lidos rápido e com confiança (é dinheiro real). Animação de entrada sim; tremular/pulsar valores monetários constantemente, não.
- Definir um modo "reduced motion" para acessibilidade/preferência do usuário.

---

## 5. Próximos passos sugeridos
1. Validar com time de pricing a tabela real de tiers do Plano de Faturamento.
2. Confirmar com time técnico o escopo de visão da tela Adquirentes (por conta vs. global).
3. Confirmar fonte de dado do widget de Origem Geográfica.
4. Definir design system (tokens de cor, tipografia, componentes vivos) a partir da paleta dark + verde-lima.
5. Protótipo de alta-fidelidade do novo Dashboard como peça âncora, depois espalhar padrão pros demais módulos.

---

*Documento gerado a partir de mapeamento manual da plataforma em 16/06/2026. Não cobre módulos não navegados nesta sessão.*
