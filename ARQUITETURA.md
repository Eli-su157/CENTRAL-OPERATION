# ARQUITETURA — Central de Operações

> Documento gerado em 2026-06-11. Stack: Next.js 15 (App Router) · Supabase (Postgres + Auth + Storage) · TypeScript · Tailwind CSS.

---

## 1. Árvore de pastas (src/ até 3 níveis)

```
src/
├── app/
│   ├── actions.ts                        # Server actions globais (login, signUp, logout, acceptInvite)
│   ├── globals.css
│   ├── layout.tsx                        # Root layout (html/body)
│   ├── page.tsx                          # Landing page / auth (login + cadastro)
│   ├── api/
│   │   ├── cron/
│   │   │   ├── health-check/route.ts     # Cron 5 min: ping de recursos + heartbeat + alertas
│   │   │   └── pull-ads/route.ts         # Cron 15 min: pull Meta Ads + Google Ads → ad_spend
│   │   └── webhooks/
│   │       ├── [provider]/route.ts       # Webhook receiver genérico (Hotmart, Paradise, Vega, Shopify)
│   │       └── utmify/route.ts           # Webhook receiver UTMify (atribuição)
│   ├── app/
│   │   ├── layout.tsx                    # Shell autenticado (AppShell + sidebar + dados do usuário)
│   │   ├── page.tsx                      # /app — Visão Geral consolidada
│   │   ├── equipe/
│   │   │   ├── actions.ts
│   │   │   └── page.tsx
│   │   ├── financeiro/
│   │   │   ├── actions.ts
│   │   │   └── page.tsx
│   │   ├── integracoes/
│   │   │   └── page.tsx                  # Catálogo de integrações (dono/head)
│   │   ├── relatorios/
│   │   │   ├── actions.ts
│   │   │   └── page.tsx
│   │   ├── tarefas/
│   │   │   ├── actions.ts
│   │   │   └── page.tsx
│   │   └── d/
│   │       ├── actions.ts                # rename/delete dashboard
│   │       └── [dashboardId]/
│   │           ├── page.tsx              # Dashboard principal
│   │           ├── dev/
│   │           │   ├── actions.ts
│   │           │   └── page.tsx          # Dev + Monitoramento + Integrações por dashboard
│   │           ├── edicao/
│   │           │   ├── actions.ts
│   │           │   └── page.tsx          # Tarefas de criação + Biblioteca de materiais
│   │           └── trafego/
│   │               ├── actions.ts
│   │               └── page.tsx          # Painel de tráfego (Meta/Google + UTMify)
│   ├── auth/
│   │   └── callback/route.ts             # Troca de code → session (Supabase OAuth)
│   └── convite/
│       └── [token]/page.tsx              # Aceitar convite por token
├── components/
│   ├── auth/
│   │   ├── InviteAcceptForm.tsx  [C]
│   │   ├── LoginForm.tsx         [C]
│   │   ├── SignupForm.tsx        [C]
│   │   └── SubmitButton.tsx      [C]
│   ├── blocks/                           # Blocos do dashboard principal [S]
│   │   ├── AlertsBar.tsx
│   │   ├── DevBlock.tsx
│   │   ├── EditorBlock.tsx
│   │   ├── FinancialBlock.tsx
│   │   ├── SalesBlock.tsx
│   │   ├── SummaryStrip.tsx
│   │   ├── TeamBlock.tsx
│   │   └── TrafficBlock.tsx
│   ├── dashboard/
│   │   ├── CreateDashboardButton.tsx [C]
│   │   ├── DashboardCard.tsx         [S]
│   │   ├── DashboardGrid.tsx         [S]
│   │   └── DashboardHeader.tsx       [C]
│   ├── dev/
│   │   ├── ConnectionForm.tsx        [C]
│   │   ├── IntegrationCenterClient.tsx [C]
│   │   ├── MonitoringClient.tsx      [C]
│   │   ├── ResourceForm.tsx          [C]
│   │   └── ResourceRow.tsx           [C]
│   ├── finance/
│   │   ├── BalanceBlocks.tsx         [S]
│   │   ├── DreBlock.tsx              [S]
│   │   ├── EntryForm.tsx             [C]
│   │   ├── ExtratoBlock.tsx          [C]
│   │   └── FinancePageClient.tsx     [C]
│   ├── layout/
│   │   ├── AppShell.tsx              [C]
│   │   └── Sidebar.tsx               [C]
│   ├── materials/
│   │   ├── MaterialCard.tsx          [C]
│   │   ├── MaterialForm.tsx          [C]
│   │   └── MaterialsLibraryClient.tsx [C]
│   ├── reports/
│   │   ├── GenerateReportForm.tsx    [C]
│   │   ├── ReportDraftEditor.tsx     [C]
│   │   └── ReportViewer.tsx          [S]
│   ├── tasks/
│   │   ├── CreateTaskForm.tsx        [C]
│   │   ├── KanbanBoard.tsx           [S]
│   │   ├── MyTasksList.tsx           [S]
│   │   ├── TaskCard.tsx              [S]
│   │   ├── TaskDetail.tsx            [C]
│   │   └── TasksPageClient.tsx       [C]
│   ├── team/
│   │   ├── InvitePanel.tsx           [C]
│   │   └── MemberCard.tsx            [C]
│   └── traffic/
│       ├── DecisaoTable.tsx          [C]
│       ├── FunilBlock.tsx            [S]
│       ├── MetasBlock.tsx            [C]
│       ├── PanelConfig.tsx           [C]
│       ├── ReconciliacaoBlock.tsx    [S]
│       ├── SaudeContasBlock.tsx      [S]
│       └── TemporalChart.tsx         [C]  ← Recharts
└── lib/
    ├── alerts/engine.ts              # Motor de alertas + avaliação de regras
    ├── auth/
    │   ├── getPermissions.ts         # getAuthContext com React.cache()
    │   └── permissions.ts            # resolvePermissions (RBAC)
    ├── blocks/registry.ts
    ├── crypto/credentials.ts         # AES-256-GCM encrypt/decrypt
    ├── demo/index.ts
    ├── finance/calc.ts               # calcDre, calcAccountSummary, calcRoas
    ├── integrations/
    │   ├── adapters/                 # hotmart, paradise, shopify, utmify, vega
    │   ├── spend/                    # google, meta, meta-ad-level
    │   ├── dedup.ts
    │   ├── registry.ts
    │   └── types.ts
    ├── materials/performance.ts
    ├── mock/                         # metrics, structure, traffic (fallback demo)
    ├── reports/                      # generate, periods, types
    ├── sales/                        # attribution, metrics
    ├── supabase/
    │   ├── admin.ts                  # createAdminClient (service_role, bypassa RLS)
    │   ├── client.ts                 # createBrowserClient
    │   └── server.ts                 # createServerClient (cookies)
    ├── traffic/                      # panelDefaults, realData, spend
    ├── types/                        # database.ts, tasks.ts
    └── utils/format.ts
```

> [S] = Server Component (sem 'use client') · [C] = Client Component ('use client')

---

## 2. Rotas/Páginas e queries ao Supabase

> **Nota prévia:** toda página autenticada chama `getAuthContext()` (wrapped em `React.cache()`), que por si só executa **3 queries sequenciais** antes de qualquer dado da página:
> 1. `supabase.auth.getUser()` — valida a sessão
> 2. `profiles.select(*)` — perfil + operation_id
> 3. `admin.permission_overrides.select(type, value)` — overrides do usuário
>
> Essas 3 queries são marcadas como **[auth]** abaixo e contam para o total.

---

### `/` — Landing / Auth
- **Tipo:** Client Component puro (sem fetch server-side)
- **Queries:** 0 no servidor. LoginForm e SignupForm disparam Server Actions (`login`, `signUpOwner`) apenas no submit.

---

### `app/layout.tsx` — Shell autenticado (wraps todas as rotas /app/*)
- **[auth]** 3 seq → depois `Promise.all`:
  - `dashboards.select(id, name)` — filtrado por `operation_id` (+ opcional filtro por `restrito_a_dashboard`)
  - `operations.select(name)`
- **Total: 5 queries · 2 rounds (auth seq + 1× Promise.all)**
- Custo pago em **toda navegação** dentro de /app/\*.

---

### `/app` — Visão Geral
- **[auth]** + `Promise.all(5)`:
  - `dashboards.select(id, name, primary_sale_provider)`
  - `operations.select(max_dashboards)`
  - `finance_entries.select(...)` — mês atual (condicional: `pode_ver_financeiro`)
  - `fetchOperationSales` → `sales.select(...)` (condicional)
  - `fetchOperationSpend` → `ad_spend.select(...)` (condicional)
- **Total: 3 seq (auth) + 5 par = 8 queries · 2 rounds**

---

### `/app/d/[dashboardId]` — Dashboard Principal
- **[auth]** + **Round 2** `Promise.all(5)`:
  - `dashboards.select(*)`
  - `tasks.select(sector)` — atrasadas
  - `tasks.select(id, count)` — pendentes total
  - `profiles.select(id, count)`
  - `finance_entries.select(...)` (condicional)
- **Round 3** `Promise.all(2)` _(após Round 2)_:
  - `fetchDashboardSales` → `sales.select(...)`
  - `fetchDashboardSpend` → `ad_spend.select(...)`
- **Round 4** sequencial _(após Round 3)_:
  - `fetchActiveAlerts` → `alerts.select(...)`
- **Total: 3 seq + 5 par + 2 par + 1 seq = 11 queries · 4 rounds**

---

### `/app/d/[dashboardId]/trafego` — Painel de Tráfego
- **[auth]** + **Round 2** `Promise.all(3)`:
  - `dashboards.select(id, name, primary_sale_provider)`
  - `traffic_goals.select(*)` — período atual
  - `traffic_panel_config.select(*)`
- **Round 3** `Promise.all(4)` _(após Round 2)_:
  - `fetchDashboardSpend` → `ad_spend.select(...)`
  - `sales.select(amount, status, occurred_at, utm)` — mês com UTM
  - `getReconciliationData` → `sales.select(...)` (atribuição UTMify)
  - `fetchActiveAlerts` → `alerts.select(...)`
- **Total: 3 seq + 3 par + 4 par = 10 queries · 3 rounds**

---

### `/app/d/[dashboardId]/dev` — Dev + Monitoramento + Integrações
- **[auth]** + **Round 2** `Promise.all(5)`:
  - `dashboards.select(id, name, primary_sale_provider)`
  - `profiles.select(id, full_name, email, role, sector)`
  - `dashboards.select(id, name)` (para dropdown de tarefas)
  - `monitored_resources.select(...)`
  - `integration_connections.select(...)` (sem credentials_encrypted)
- **Round 3** sequencial _(após Round 2)_:
  - `tasks.select(*, task_comments, task_attachments)` — setor dev
- **Round 4** condicional _(após Round 3)_:
  - `admin.storage.createSignedUrls` — task-attachments (se há anexos)
- **Total: 3 seq + 5 par + 1 seq + 1 cond = 10 queries · até 4 rounds**

---

### `/app/d/[dashboardId]/edicao` — Criação + Materiais
- **[auth]** + **Round 2** `Promise.all(6)`:
  - `dashboards.select(id, name)`
  - `profiles.select(id, full_name, email, role, sector)`
  - `dashboards.select(id, name)` (dropdown tarefas)
  - `materials.select(...)` — do dashboard
  - `fetchAdPerformance` → `ad_performance.select(...)`
  - `sales.select(amount, utm)` — mês aprovadas
- **Round 3** sequencial _(após Round 2)_:
  - `tasks.select(*, task_comments, task_attachments)` — setor edicao
- **Round 4** condicional sequencial _(após Round 3)_:
  - `admin.storage.createSignedUrls` — task-attachments
- **Round 5** condicional sequencial _(poderia ser após Round 2, mas está fora do Promise.all)_:
  - `admin.storage.createSignedUrls` — materials uploads
- **Total: 3 seq + 6 par + 1 seq + 2 cond = 12 queries · até 5 rounds**

---

### `/app/equipe` — Gestão de Equipe
- **[auth]** + 1 seq `operations.select(name)` + **Round 3** `Promise.all(3)`:
  - `profiles.select(*)`
  - `admin.permission_overrides.select(user_id, type, value)`
  - `admin.invites.select(*)`
- **Total: 3 seq + 1 seq + 3 par = 7 queries · 3 rounds**

---

### `/app/financeiro` — Lançamentos
- **[auth]** + **Round 2** `Promise.all(4)`:
  - `finance_entries.select(*)` — últimos 12 meses
  - `finance_categories.select(name, direction)`
  - `dashboards.select(id, name)`
  - `profiles.select(id, full_name)`
- **Round 3** condicional sequencial _(se sem categorias)_:
  - `supabase.rpc('seed_default_categories', ...)`
  - `finance_categories.select(...)` — re-fetch
- **Total: 3 seq + 4 par + 2 cond = 9 queries · 2–4 rounds**

---

### `/app/tarefas` — Kanban Geral
- **[auth]** + **Round 2** `Promise.all(3)`:
  - `tasks.select(*, task_comments, task_attachments)` — com scope
  - `profiles.select(id, full_name, email, role, sector)`
  - `dashboards.select(id, name)`
- **Round 3** condicional:
  - `admin.storage.createSignedUrls` — task-attachments
- **Total: 3 seq + 3 par + 1 cond = 7 queries · 2–3 rounds**

---

### `/app/relatorios` — Relatórios
- **[auth]** + 1 seq:
  - `operation_reports.select(...)` — últimos 30
- **Total: 3 seq + 1 seq = 4 queries · 2 rounds** ← página mais leve

---

### `/app/integracoes` — Catálogo de Integrações
- **[auth]** + 2 seq (não paralelizados):
  - `integration_connections.select(provider, status, dashboard_id)`
  - `dashboards.select(id, name)`
- **Total: 3 seq + 2 seq = 5 queries · 3 rounds**
- ⚠️ As 2 queries finais poderiam ser `Promise.all` — ver seção 5.

---

### `/convite/[token]` — Aceitar Convite
- Sem `getAuthContext`. 1 query via admin:
  - `admin.invites.select(*, operations(name))` — JOIN com operação
- **Total: 1 query · 1 round**

---

### APIs (Route Handlers)

| Rota | Método | Queries estimadas |
|---|---|---|
| `/api/webhooks/[provider]` | POST | 1 + 4–6 por conexão (loop seq) |
| `/api/webhooks/utmify` | POST | 1 + 4–5 por conexão (loop seq) |
| `/api/cron/pull-ads` | GET | 1 + N×(ext API + upsert + 3 writes) — loop seq |
| `/api/cron/health-check` | GET | 3 selects + N×HTTP + M×updates — loops seq |
| `/auth/callback` | GET | 1 (auth code exchange) |

---

## 3. Server Components vs Client Components

### Server Components (sem `'use client'`) — fazem fetch

| Arquivo | Faz fetch? |
|---|---|
| `app/app/layout.tsx` | ✅ dashboards, operations |
| `app/app/page.tsx` | ✅ dashboards, finance_entries, sales, ad_spend |
| `app/app/d/[dashboardId]/page.tsx` | ✅ dashboards, tasks, profiles, finance, sales, ad_spend, alerts |
| `app/app/d/[dashboardId]/trafego/page.tsx` | ✅ dashboards, goals, config, ad_spend, sales, alerts |
| `app/app/d/[dashboardId]/dev/page.tsx` | ✅ dashboards, profiles, resources, connections, tasks |
| `app/app/d/[dashboardId]/edicao/page.tsx` | ✅ dashboards, profiles, materials, ad_perf, sales, tasks |
| `app/app/equipe/page.tsx` | ✅ profiles, permission_overrides, invites, operations |
| `app/app/financeiro/page.tsx` | ✅ finance_entries, finance_categories, dashboards, profiles |
| `app/app/tarefas/page.tsx` | ✅ tasks, profiles, dashboards |
| `app/app/relatorios/page.tsx` | ✅ operation_reports |
| `app/app/integracoes/page.tsx` | ✅ integration_connections, dashboards |
| `app/convite/[token]/page.tsx` | ✅ invites (join operations) |

### Server Components — sem fetch (pure render)

`components/blocks/` (AlertsBar, DevBlock, EditorBlock, FinancialBlock, SalesBlock, SummaryStrip, TeamBlock, TrafficBlock), `components/dashboard/DashboardCard`, `DashboardGrid`, `components/reports/ReportViewer`, `components/tasks/KanbanBoard`, `MyTasksList`, `TaskCard`, `components/traffic/FunilBlock`, `ReconciliacaoBlock`, `SaudeContasBlock`, `components/finance/BalanceBlocks`, `DreBlock`.

### Client Components (com `'use client'`)

| Componente | Responsabilidade |
|---|---|
| `app/page.tsx` | Tabs login/cadastro, estado de aba |
| `components/layout/AppShell` | Estado do sidebar mobile |
| `components/layout/Sidebar` | `usePathname` para active state |
| `components/auth/LoginForm` | `useActionState` + submit |
| `components/auth/SignupForm` | `useActionState` + submit |
| `components/auth/InviteAcceptForm` | `useActionState` + submit |
| `components/auth/SubmitButton` | `useFormStatus` |
| `components/dashboard/DashboardHeader` | Rename/delete inline com `useActionState` |
| `components/dashboard/CreateDashboardButton` | Modal de criação |
| `components/finance/FinancePageClient` | Filtros de período/dashboard + DRE client-side |
| `components/finance/EntryForm` | Modal de novo lançamento |
| `components/finance/ExtratoBlock` | Paginação + filtros client-side |
| `components/tasks/TasksPageClient` | Estado Kanban + formulários |
| `components/tasks/CreateTaskForm` | Formulário de tarefa |
| `components/tasks/TaskDetail` | Modal de detalhe |
| `components/team/InvitePanel` | Geração de convite + copy link |
| `components/team/MemberCard` | Ações de edição/remoção de membro |
| `components/dev/IntegrationCenterClient` | Gerenciamento de conexões |
| `components/dev/ConnectionForm` | Modal de nova/editar conexão |
| `components/dev/MonitoringClient` | Gerenciamento de recursos monitorados |
| `components/dev/ResourceForm` / `ResourceRow` | Edição de recurso monitorado |
| `components/materials/MaterialsLibraryClient` | Upload + filtros de materiais |
| `components/materials/MaterialCard` / `MaterialForm` | Card e formulário de material |
| `components/reports/GenerateReportForm` | Geração de relatório via IA |
| `components/reports/ReportDraftEditor` | Edição de rascunho (rich text) |
| `components/traffic/MetasBlock` | Barra de progresso animada |
| `components/traffic/DecisaoTable` | Tabela de campanhas interativa |
| `components/traffic/TemporalChart` | Gráfico Recharts (série temporal) |
| `components/traffic/PanelConfig` | Modal de configuração de blocos |

---

## 4. Tabelas do banco e quais páginas as leem

_(22 tabelas criadas em migrations 0001–0014)_

| Tabela | Migration | Páginas/rotas que leem |
|---|---|---|
| `operations` | 0001 | `app/layout`, `app/page`, `equipe`, `integracoes`, `health-check cron` |
| `profiles` | 0001 | `getAuthContext` (toda página autenticada), `equipe`, `dev`, `edicao`, `tarefas` |
| `dashboards` | 0001 | `app/layout`, `app/page`, `d/[id]`, `trafego`, `dev`, `edicao`, `financeiro`, `integracoes` |
| `invites` | 0001 | `equipe`, `convite/[token]` |
| `permission_overrides` | 0002 | `getAuthContext` (toda página autenticada), `equipe` |
| `tasks` | 0003 | `app/page` (count), `d/[id]` (count), `tarefas`, `dev`, `edicao` |
| `task_attachments` | 0003 | `tarefas`, `dev`, `edicao` (via nested select em tasks) |
| `task_comments` | 0003 | `tarefas`, `dev`, `edicao` (via nested select em tasks) |
| `finance_categories` | 0004 | `financeiro` |
| `finance_entries` | 0004 | `app/page`, `d/[id]`, `financeiro` |
| `traffic_goals` | 0005 | `trafego` |
| `traffic_panel_config` | 0005 | `trafego` |
| `materials` | 0006 | `edicao` |
| `monitored_resources` | 0007 | `dev`, `health-check cron` |
| `integration_connections` | 0007 | `dev`, `integracoes`, `webhooks/[provider]`, `webhooks/utmify`, `pull-ads cron`, `health-check cron` |
| `operation_reports` | 0008 | `relatorios` |
| `sales` | 0009 | `app/page`, `d/[id]`, `trafego`, `edicao`, `webhooks/[provider]`, `webhooks/utmify` |
| `webhook_logs` | 0009 | `webhooks/[provider] GET`, `webhooks/utmify GET` |
| `utmify_queue` | 0011 | `webhooks/[provider]` (drain), `webhooks/utmify` (insert/select) |
| `ad_spend` | 0012 | `pull-ads cron` (upsert), `d/[id]` (via `fetchDashboardSpend`), `trafego`, `app/page` |
| `ad_performance` | 0013 | `pull-ads cron` (upsert), `edicao` (via `fetchAdPerformance`) |
| `alerts` | 0014 | `d/[id]` (via `fetchActiveAlerts`), `trafego`, `health-check cron` (evaluate+upsert) |

---

## 5. Waterfalls — fetches sequenciais desnecessários

### 5a. `getAuthContext` — 3 round trips em cascata (toda página)

```
auth.getUser()                   ← round 1
   → profiles.select(*)          ← round 2 (aguarda user.id)
       → admin.permission_overrides.select()  ← round 3 (aguarda profile)
```

**Impacto:** ~3× latência do Supabase em toda navegação (~150–300 ms total).  
**Causa necessária:** cada step depende do resultado do anterior.  
**Mitigação:** `React.cache()` já deduplica chamadas repetidas dentro da mesma request. Possível melhoria: usar `unstable_cache` com TTL de 30–60 s keyed por `user_id` para evitar os rounds 2 e 3 nas navegações subsequentes.

---

### 5b. `/app/d/[dashboardId]` — 4 rounds seriais

```
Round 1: getAuthContext (3 seq)
Round 2: Promise.all(5) — dashboard, tasks×2, profiles count, finance_entries
Round 3: Promise.all(2) — fetchDashboardSales + fetchDashboardSpend
           ↑ Aguarda Round 2 terminar (finance_entries precisa de dashboard)
Round 4: fetchActiveAlerts (seq)
           ↑ Aguarda Round 3 (aguarda sales/spend)
```

**Problema:** `fetchDashboardSales` e `fetchDashboardSpend` poderiam ser incluídos no `Promise.all` do Round 2 junto com `finance_entries`, eliminando o Round 3. `fetchActiveAlerts` poderia entrar no mesmo `Promise.all`, eliminando o Round 4. Redução possível: **4 rounds → 2 rounds**.

---

### 5c. `/app/d/[dashboardId]/edicao` — 5 rounds

```
Round 1: getAuthContext (3 seq)
Round 2: Promise.all(6) — dashboard, profiles, dashboards, materials, adPerf, salesUtm
Round 3: tasks query (seq)      ← aguarda Round 2 completar
Round 4: createSignedUrls task-attachments (cond)  ← aguarda Round 3
Round 5: createSignedUrls materials (cond)          ← poderia ocorrer após Round 2
```

**Problema principal:** `tasks` fica fora do `Promise.all` sem necessidade (não depende de nenhum resultado do Round 2). O `createSignedUrls` de materials poderia rodar em paralelo com `tasks`. **Potencial: 5 rounds → 3 rounds.**

---

### 5d. `/app/integracoes` — 2 queries sequenciais desnecessárias

```javascript
// Código atual
const { data: connections } = await supabase.from('integration_connections')...
const { data: dashboards }  = await supabase.from('dashboards')...
```

Nenhuma query depende do resultado da outra. Basta substituir por `Promise.all([...])`.  
**Potencial: 2 seq → 1 round.**

---

### 5e. `getAuthContext` interno — `permission_overrides` poderia ser paralelo com `profiles`

```javascript
// Potencial de melhoria em getPermissions.ts
const [profile, overrides] = await Promise.all([
  supabase.from('profiles').select('*').eq('id', user.id).single(),
  admin.from('permission_overrides').select('type, value').eq('user_id', user.id),
]);
```

`user.id` já está disponível após `auth.getUser()`. As duas queries são independentes.  
**Potencial: 3 rounds → 2 rounds** em getAuthContext, poupando ~50–100 ms por request.

---

### 5f. `api/cron/health-check` — loop serial sem paralelismo

```javascript
for (const r of resources) {       // ← aguarda cada fetch HTTP antes do próximo
  const result = await checkUrl(r.url, r.kind);
  await admin.from('monitored_resources').update(...);
}
for (const op of operations) {     // ← avalia alertas um por um
  await evaluateOperationAlerts(admin, op.id);
}
```

Com N recursos e M operações: `N × (HTTP + DB write) + M × evaluateAlerts` chamadas sequenciais.  
**Impacto:** timeout de cron (5 min no Vercel Hobby) para tenants com muitos recursos.  
**Mitigação:** `Promise.all(resources.map(...))` com `Promise.allSettled` para tolerar falhas individuais.

---

### 5g. `api/cron/pull-ads` — loop serial por conexão

```javascript
for (const conn of connections) {   // ← cada conexão aguarda a anterior
  const records = await adapter.pull(...);
  await admin.from('ad_spend').upsert(...);
  await pullAndUpsertAdLevel(...);   // ← nested await dentro do loop
}
```

Com múltiplos dashboards configurados, o cron de 15 min pode acumular latência. Paralelizar com `Promise.all` / `Promise.allSettled` por conexão.

---

## 6. Tamanho dos bundles e componentes mais pesados

### Bundles de página (server, pós-build)

| Página | Bundle servidor | First Load JS (cliente) |
|---|---|---|
| `/app/d/[dashboardId]/trafego` | **444 KB** | **218 kB** ← maior |
| `/app/d/[dashboardId]/dev` | 56 KB | 182 kB |
| `/app/d/[dashboardId]/edicao` | 48 KB | 181 kB |
| `/app/tarefas` | 20 KB | 173 kB |
| `/app/financeiro` | 44 KB | 107 kB |
| `/app/equipe` | 40 KB | 106 kB |
| `/app/relatorios` | 56 KB | 110 kB |
| `/app` (Visão Geral) | 36 KB | 107 kB |
| `/app/integracoes` | 32 KB | 102 kB |
| `/` (landing) | 32 KB | 105 kB |
| Shared baseline | — | **102 kB** |

### Chunks compartilhados (server)

| Chunk | Tamanho | Conteúdo provável |
|---|---|---|
| `chunks/711.js` | 336 KB | `@supabase/ssr` + runtime SSR |
| `chunks/792.js` | 220 KB | React core + Next.js runtime |
| `chunks/706.js` | 212 KB | `recharts` ou `@supabase/supabase-js` |
| `chunks/167.js` | 204 KB | Dependências de formulário / UI |
| `chunks/331.js` | 128 KB | Auth utilities + polyfills |

### Componentes mais pesados no cliente

1. **`TemporalChart.tsx`** — importa `recharts` (Recharts ~100 kB minzip). Causa direta do First Load de 218 kB do painel de tráfego. Candidato a `dynamic(() => import(...), { ssr: false })`.

2. **`TasksPageClient.tsx` + `KanbanBoard.tsx`** — estado complexo de drag-drop + TaskDetail inline. Contribui para os 173 kB de `/app/tarefas`.

3. **`MaterialsLibraryClient.tsx`** — upload de arquivo + preview + cruzamento com ad_performance. Contém lógica client-side que poderia ser Server Actions.

4. **`FinancePageClient.tsx`** — toda a página financeiro é um Client Component wrapping DRE + extrato. Todo o `calcDre` é recomputado no cliente a cada troca de filtro (poderia ser Server Action ou URL params + Server Component).

---

## 7. O que é buscado no servidor a cada navegação e poderia ser cacheado

### Candidatos de alto impacto

| Dado | Frequência de mudança | Custo atual | Estratégia de cache sugerida |
|---|---|---|---|
| **`getAuthContext` (profiles + permission_overrides)** | Muda apenas quando admin edita membro | 3 round trips a cada page load | `unstable_cache` keyed por `user_id`, TTL 60 s, invalidar na Server Action de edição de membro |
| **`dashboards` da operação** (no layout) | Muda só em create/rename/delete | 1 query a cada navegação | `unstable_cache` keyed por `operation_id`, invalidar em `createDashboard` / `renameDashboard` |
| **`operations.name` e `max_dashboards`** | Quase nunca muda | 1 query em equipe + layout | `unstable_cache` longa (5 min), invalidar em update de operação |
| **`finance_categories`** | Seeded 1x, raramente editada | 1 query em cada render de `/app/financeiro` | `unstable_cache` keyed por `operation_id`, TTL 10 min |
| **`permission_overrides`** | Muda quando admin edita membro | 1 query em toda request autenticada (via getAuthContext) | Incluir no cache de `getAuthContext` |
| **`traffic_panel_config`** | Muda só quando usuário reconfigura os blocos | 1 query a cada visita ao painel de tráfego | `unstable_cache` keyed por `dashboard_id`, TTL 5 min, invalidar em `savePanelConfigAction` |
| **`traffic_goals`** | Muda mensalmente | 1 query a cada visita ao painel de tráfego | `unstable_cache` keyed por `(dashboard_id, período)`, TTL 1 hora |

### Candidatos de menor impacto

| Dado | Observação |
|---|---|
| **`operation_reports` (lista)** | Read-heavy, cresce lentamente. Cache por `operation_id` + revalidar em `generateReport` |
| **`profiles` (lista de membros)** | Usado em `dev`, `edicao`, `tarefas`. Cache por `operation_id`, TTL 2 min |
| **`monitored_resources`** | Atualizado só pelo cron de 5 min. Cache de 5 min por `operation_id` |

### O que NÃO deve ser cacheado

| Dado | Motivo |
|---|---|
| `sales` | Atualizado em tempo real via webhook |
| `ad_spend` / `ad_performance` | Atualizado a cada 15 min pelo cron |
| `alerts` | Avaliados a cada 5 min; leitura stale pode ocultar alerta crítico |
| `finance_entries` | Usuários esperam que lançamentos apareçam imediatamente após insert |
| `tasks` | Alterações frequentes e visibilidade imediata esperada |
| `auth.getUser()` | Nunca cacheado — necessário para validar cookie de sessão |

### Nota sobre `React.cache()`

`getAuthContext` já usa `cache()` do React, que **deduplica chamadas dentro de um único request** (evita que layout.tsx e page.tsx chamem duas vezes). Porém, `cache()` não persiste entre requests — cada nova navegação re-executa os 3 round trips. Para persistência real entre requests é necessário `unstable_cache` (Next.js 14+) ou middleware com cookie de curta duração.

---

*Fim do relatório de arquitetura.*
