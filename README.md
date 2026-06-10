# Central de Operações — Fase 0: Fundação

SaaS multi-tenant de gestão de operações de infoproduto.

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- **Supabase** (Postgres + Auth + RLS)
- Deploy: Vercel

---

## Setup em 5 passos

### 1. Criar projeto no Supabase

Acesse [supabase.com](https://supabase.com), crie um projeto e anote:
- **URL do projeto** (`https://xxxx.supabase.co`)
- **anon key** (Settings → API)
- **service_role key** (Settings → API — nunca exponha no client)

### 2. Rodar as migrations

No painel do Supabase, vá em **SQL Editor** e execute o conteúdo de:

```
supabase/migrations/0001_initial.sql
```

Isso cria as tabelas `operations`, `profiles`, `dashboards`, `invites`, os enums, os índices e todas as políticas RLS.

> **Dica:** A extensão `pgcrypto` (necessária para `gen_random_bytes`) já vem habilitada em todos os projetos Supabase.

### 3. Configurar variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Preencha `.env.local` com as chaves do seu projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

### 4. Instalar dependências e rodar

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

### 5. (Opcional) Desabilitar confirmação de e-mail

Para desenvolvimento local, desabilite a confirmação de e-mail no Supabase:

> Authentication → Providers → Email → **Confirm email**: desmarcar

A aplicação já usa o admin client com `email_confirm: true` nas criações de usuário, então isso é opcional — mas facilita testes.

---

## Fluxos de autenticação

| Fluxo | Rota | Descrição |
|-------|------|-----------|
| Login | `/` | Qualquer usuário existente |
| Cadastro (dono) | `/` | Cria nova operação automaticamente |
| Aceitar convite | `/convite/[token]` | Equipe via link de convite |

### Como testar o fluxo de convite

Após criar uma conta de dono, insira um convite diretamente via SQL no Supabase:

```sql
INSERT INTO invites (operation_id, email, role, sector)
VALUES (
  'ID_DA_SUA_OPERACAO',
  'convidado@email.com',
  'executor',
  'trafego'
);

-- Recuperar o token gerado:
SELECT token FROM invites WHERE email = 'convidado@email.com';
```

Acesse `http://localhost:3000/convite/TOKEN_AQUI`.

---

## Deploy na Vercel

1. Conecte o repositório na Vercel
2. Configure as variáveis de ambiente (as mesmas do `.env.local`)
3. Deploy automático a cada push

> A `SUPABASE_SERVICE_ROLE_KEY` é usada **somente** em server actions (Node.js runtime) e nunca é exposta ao browser.

---

## Estrutura do projeto

```
src/
├── app/
│   ├── page.tsx              # Tela de login/cadastro
│   ├── actions.ts            # Server Actions (login, signup, convite, logout)
│   ├── app/
│   │   └── page.tsx          # Placeholder pós-login (Fase 0)
│   ├── convite/[token]/
│   │   └── page.tsx          # Aceite de convite
│   └── auth/callback/
│       └── route.ts          # Callback OAuth (para fases futuras)
├── components/auth/          # Formulários de autenticação
└── lib/
    ├── supabase/
    │   ├── client.ts         # Browser client
    │   ├── server.ts         # Server client (cookies)
    │   └── admin.ts          # Service role client (server only)
    └── types/database.ts     # Tipos TypeScript do schema

supabase/migrations/
└── 0001_initial.sql          # Schema completo com RLS
```

---

## Próximas fases

- **Fase 1** — RBAC (permissões por papel: dono, head, líder, executor)
- **Fase 2** — Dashboard principal e painéis de setor
- **Fase 3** — Tarefas, checkins e acompanhamento
- **Fase 4** — Relatórios e métricas
- **Fase 5** — Billing e multi-operação
