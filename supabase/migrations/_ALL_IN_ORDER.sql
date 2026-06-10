-- ============================================================
-- ORIGEM: 0001_initial.sql
-- ============================================================

-- ============================================================
-- CENTRAL DE OPERAÇÕES — Fase 0: Schema Base
-- ============================================================

-- Enums
CREATE TYPE user_role AS ENUM ('dono', 'head', 'lider', 'executor');
CREATE TYPE user_sector AS ENUM ('trafego', 'edicao', 'dev', 'financeiro');
CREATE TYPE invite_status AS ENUM ('pendente', 'aceito', 'expirado');

-- ============================================================
-- TABELAS
-- ============================================================

CREATE TABLE operations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  owner_user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_dashboards  INT NOT NULL DEFAULT 5,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_id  UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL,
  role          user_role NOT NULL,
  sector        user_sector NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stub — conteúdo real vem na Fase 2
CREATE TABLE dashboards (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id  UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE invites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id  UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  role          user_role NOT NULL,
  sector        user_sector NULL,
  token         TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status        invite_status NOT NULL DEFAULT 'pendente',
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX idx_profiles_operation_id ON profiles(operation_id);
CREATE INDEX idx_dashboards_operation_id ON dashboards(operation_id);
CREATE INDEX idx_invites_operation_id ON invites(operation_id);
CREATE INDEX idx_invites_token ON invites(token);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Função auxiliar: retorna operation_id do usuário logado.
-- SECURITY DEFINER para que consulte profiles sem depender de RLS em profiles.
CREATE OR REPLACE FUNCTION get_my_operation_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT operation_id FROM profiles WHERE id = auth.uid();
$$;

-- ---- operations ----
CREATE POLICY "operations: membro lê a própria"
  ON operations FOR SELECT
  USING (id = get_my_operation_id());

CREATE POLICY "operations: dono pode atualizar"
  ON operations FOR UPDATE
  USING (id = get_my_operation_id());

-- ---- profiles ----
CREATE POLICY "profiles: todos da operação se veem"
  ON profiles FOR SELECT
  USING (operation_id = get_my_operation_id());

CREATE POLICY "profiles: usuário atualiza o próprio"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- ---- dashboards ----
CREATE POLICY "dashboards: select por operação"
  ON dashboards FOR SELECT
  USING (operation_id = get_my_operation_id());

CREATE POLICY "dashboards: insert por operação"
  ON dashboards FOR INSERT
  WITH CHECK (operation_id = get_my_operation_id());

CREATE POLICY "dashboards: update por operação"
  ON dashboards FOR UPDATE
  USING (operation_id = get_my_operation_id());

CREATE POLICY "dashboards: delete por operação"
  ON dashboards FOR DELETE
  USING (operation_id = get_my_operation_id());

-- ---- invites ----
CREATE POLICY "invites: select por operação"
  ON invites FOR SELECT
  USING (operation_id = get_my_operation_id());

CREATE POLICY "invites: insert por operação"
  ON invites FOR INSERT
  WITH CHECK (operation_id = get_my_operation_id());

CREATE POLICY "invites: update por operação"
  ON invites FOR UPDATE
  USING (operation_id = get_my_operation_id());


-- ============================================================
-- ORIGEM: 0002_rbac.sql
-- ============================================================

-- ============================================================
-- CENTRAL DE OPERAÇÕES — Fase 1: RBAC + Overrides
-- ============================================================

-- Função auxiliar: retorna role do usuário atual sem depender de RLS em profiles.
-- Usada nas policies para evitar recursão.
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- ============================================================
-- TABELA: permission_overrides
-- ============================================================

CREATE TYPE permission_override_type AS ENUM (
  'ver_financeiro',
  'atribuir_tarefa',
  'restrito_a_dashboard'
);

CREATE TABLE permission_overrides (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id  UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          permission_override_type NOT NULL,
  value         JSONB NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, type)
);

CREATE INDEX idx_perm_overrides_user_id ON permission_overrides(user_id);
CREATE INDEX idx_perm_overrides_operation_id ON permission_overrides(operation_id);

ALTER TABLE permission_overrides ENABLE ROW LEVEL SECURITY;

-- Usuário vê seus próprios overrides (necessário para resolvePermissions no client)
CREATE POLICY "overrides: usuário vê os próprios"
  ON permission_overrides FOR SELECT
  USING (user_id = auth.uid());

-- Dono vê todos da operação (para exibir na tela de equipe)
CREATE POLICY "overrides: dono vê da operação"
  ON permission_overrides FOR SELECT
  USING (
    operation_id = get_my_operation_id()
    AND get_my_role() = 'dono'
  );

-- Só dono gerencia overrides
CREATE POLICY "overrides: dono insere"
  ON permission_overrides FOR INSERT
  WITH CHECK (
    operation_id = get_my_operation_id()
    AND get_my_role() = 'dono'
  );

CREATE POLICY "overrides: dono atualiza"
  ON permission_overrides FOR UPDATE
  USING (
    operation_id = get_my_operation_id()
    AND get_my_role() = 'dono'
  );

CREATE POLICY "overrides: dono remove"
  ON permission_overrides FOR DELETE
  USING (
    operation_id = get_my_operation_id()
    AND get_my_role() = 'dono'
  );

-- ============================================================
-- AJUSTE DE POLICIES EXISTENTES PARA RBAC
-- ============================================================

-- profiles: dono pode atualizar qualquer membro da operação
CREATE POLICY "profiles: dono atualiza membro"
  ON profiles FOR UPDATE
  USING (
    operation_id = get_my_operation_id()
    AND get_my_role() = 'dono'
  );

-- profiles: dono pode remover membro (nunca a si mesmo)
CREATE POLICY "profiles: dono remove membro"
  ON profiles FOR DELETE
  USING (
    operation_id = get_my_operation_id()
    AND id != auth.uid()
    AND get_my_role() = 'dono'
  );

-- dashboards: restringir INSERT e DELETE ao dono (Fase 0 deixou aberto)
DROP POLICY IF EXISTS "dashboards: insert por operação" ON dashboards;
DROP POLICY IF EXISTS "dashboards: delete por operação" ON dashboards;

CREATE POLICY "dashboards: insert só dono"
  ON dashboards FOR INSERT
  WITH CHECK (
    operation_id = get_my_operation_id()
    AND get_my_role() = 'dono'
  );

CREATE POLICY "dashboards: delete só dono"
  ON dashboards FOR DELETE
  USING (
    operation_id = get_my_operation_id()
    AND get_my_role() = 'dono'
  );

-- invites: restringir INSERT ao dono
DROP POLICY IF EXISTS "invites: insert por operação" ON invites;

CREATE POLICY "invites: insert só dono"
  ON invites FOR INSERT
  WITH CHECK (
    operation_id = get_my_operation_id()
    AND get_my_role() = 'dono'
  );

-- invites: update por dono (para cancelar convites)
DROP POLICY IF EXISTS "invites: update por operação" ON invites;

CREATE POLICY "invites: update só dono"
  ON invites FOR UPDATE
  USING (
    operation_id = get_my_operation_id()
    AND get_my_role() = 'dono'
  );


-- ============================================================
-- ORIGEM: 0003_tasks.sql
-- ============================================================

-- ============================================================
-- CENTRAL DE OPERAÇÕES — Fase 3: Tarefas
-- ============================================================

-- Enums
CREATE TYPE task_priority AS ENUM ('baixa', 'media', 'alta');
CREATE TYPE task_status   AS ENUM ('a_fazer', 'fazendo', 'concluida');
CREATE TYPE attachment_type AS ENUM ('arquivo', 'link');

-- ============================================================
-- TABELAS
-- ============================================================

CREATE TABLE tasks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id        UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  dashboard_id        UUID NULL REFERENCES dashboards(id) ON DELETE SET NULL,
  title               TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description         TEXT NULL,
  assignee_user_id    UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  sector              user_sector NOT NULL,
  priority            task_priority NOT NULL DEFAULT 'media',
  due_date            DATE NULL,
  status              task_status NOT NULL DEFAULT 'a_fazer',
  created_by_user_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE task_attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  operation_id  UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  type          attachment_type NOT NULL,
  url           TEXT NOT NULL,
  label         TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE task_comments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  operation_id  UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body          TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX idx_tasks_operation_id       ON tasks(operation_id);
CREATE INDEX idx_tasks_assignee_user_id   ON tasks(assignee_user_id);
CREATE INDEX idx_tasks_dashboard_id       ON tasks(dashboard_id);
CREATE INDEX idx_tasks_status             ON tasks(status);
CREATE INDEX idx_tasks_due_date           ON tasks(due_date);
CREATE INDEX idx_task_comments_task_id    ON task_comments(task_id);
CREATE INDEX idx_task_attachments_task_id ON task_attachments(task_id);

-- Trigger: atualiza updated_at ao alterar tarefa
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE tasks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments      ENABLE ROW LEVEL SECURITY;

-- ---- tasks ----
-- Todos da operação podem ler (o scope é validado na UI/server action)
CREATE POLICY "tasks: membros leem"
  ON tasks FOR SELECT
  USING (operation_id = get_my_operation_id());

-- Qualquer membro pode criar (escopo validado no servidor, não aqui)
CREATE POLICY "tasks: membros inserem"
  ON tasks FOR INSERT
  WITH CHECK (
    operation_id = get_my_operation_id()
    AND created_by_user_id = auth.uid()
  );

-- Assignee, criador, dono e head podem atualizar
CREATE POLICY "tasks: criador/assignee/liderança atualiza"
  ON tasks FOR UPDATE
  USING (
    operation_id = get_my_operation_id()
    AND (
      created_by_user_id = auth.uid()
      OR assignee_user_id = auth.uid()
      OR get_my_role() IN ('dono', 'head')
    )
  );

-- Criador, dono e head podem excluir
CREATE POLICY "tasks: criador/liderança remove"
  ON tasks FOR DELETE
  USING (
    operation_id = get_my_operation_id()
    AND (
      created_by_user_id = auth.uid()
      OR get_my_role() IN ('dono', 'head')
    )
  );

-- ---- task_attachments ----
CREATE POLICY "attachments: leitura por operação"
  ON task_attachments FOR SELECT
  USING (operation_id = get_my_operation_id());

CREATE POLICY "attachments: inserir por membro"
  ON task_attachments FOR INSERT
  WITH CHECK (operation_id = get_my_operation_id());

CREATE POLICY "attachments: excluir por membro"
  ON task_attachments FOR DELETE
  USING (operation_id = get_my_operation_id());

-- ---- task_comments ----
CREATE POLICY "comments: leitura por operação"
  ON task_comments FOR SELECT
  USING (operation_id = get_my_operation_id());

CREATE POLICY "comments: inserir por membro"
  ON task_comments FOR INSERT
  WITH CHECK (
    operation_id = get_my_operation_id()
    AND user_id = auth.uid()
  );

CREATE POLICY "comments: excluir próprio ou liderança"
  ON task_comments FOR DELETE
  USING (
    operation_id = get_my_operation_id()
    AND (
      user_id = auth.uid()
      OR get_my_role() IN ('dono', 'head')
    )
  );

-- ============================================================
-- STORAGE: bucket PRIVADO para anexos de tarefas
-- Arquivos só são acessíveis via signed URLs geradas no servidor,
-- nunca via URL pública direta. O controle de acesso real fica na
-- camada de aplicação (server action verifica operation_id antes
-- de gerar a signed URL com o service role client).
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', false)   -- PRIVADO
ON CONFLICT DO NOTHING;

-- Upload: qualquer membro autenticado pode fazer upload
-- (a validação de task.operation_id está no server action addAttachmentAction)
CREATE POLICY "storage: upload por membro autenticado"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'task-attachments' AND auth.role() = 'authenticated');

-- SELECT: o acesso direto via client autenticado ainda exige autenticação
-- (defesa em profundidade; signed URLs geradas pelo service role contornam
-- esta política intencionalmente — é o único caminho de leitura para o app)
CREATE POLICY "storage: leitura por membro autenticado"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'task-attachments' AND auth.role() = 'authenticated');

-- DELETE: autenticado (limpeza de arquivos fica para future fase)
CREATE POLICY "storage: exclusão por membro autenticado"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'task-attachments' AND auth.role() = 'authenticated');


-- ============================================================
-- ORIGEM: 0004_finance.sql
-- ============================================================

-- ============================================================
-- CENTRAL DE OPERAÇÕES — Fase 4: Financeiro
-- ============================================================

-- Enums
CREATE TYPE entry_direction AS ENUM ('entrada', 'saida');
CREATE TYPE entry_status    AS ENUM ('pago', 'a_pagar', 'a_receber');
CREATE TYPE entry_source    AS ENUM ('manual', 'integracao');
CREATE TYPE recurrence_period AS ENUM ('diario', 'semanal', 'mensal', 'trimestral', 'anual');

-- Categorias padrão da operação (configurável por operação na Fase 5+)
CREATE TABLE finance_categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id  UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  direction     entry_direction NOT NULL,
  color         TEXT NOT NULL DEFAULT '#6b7280',
  is_default    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (operation_id, name)
);

CREATE INDEX idx_finance_categories_operation ON finance_categories(operation_id);

-- Lançamentos financeiros
CREATE TABLE finance_entries (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id       UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  dashboard_id       UUID NULL REFERENCES dashboards(id) ON DELETE SET NULL,
  direction          entry_direction NOT NULL,
  category           TEXT NOT NULL,
  description        TEXT NULL,
  amount             NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  entry_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  status             entry_status NOT NULL DEFAULT 'pago',
  recurring          BOOLEAN NOT NULL DEFAULT false,
  recurrence_period  recurrence_period NULL,
  recurrence_end     DATE NULL,
  related_user_id    UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  source             entry_source NOT NULL DEFAULT 'manual',
  created_by         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_finance_entries_operation ON finance_entries(operation_id);
CREATE INDEX idx_finance_entries_date      ON finance_entries(entry_date);
CREATE INDEX idx_finance_entries_dashboard ON finance_entries(dashboard_id);
CREATE INDEX idx_finance_entries_status    ON finance_entries(status);
CREATE INDEX idx_finance_entries_direction ON finance_entries(direction);

CREATE TRIGGER finance_entries_updated_at
  BEFORE UPDATE ON finance_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS — acesso restrito a quem pode_ver_financeiro
-- (dono e head automaticamente; executor/lider com override)
-- A validação de pode_ver_financeiro é feita no servidor via
-- getAuthContext(), mas adicionamos get_my_role como camada extra.
-- ============================================================

ALTER TABLE finance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_entries    ENABLE ROW LEVEL SECURITY;

-- Helper: verifica acesso financeiro (dono ou head)
CREATE OR REPLACE FUNCTION can_see_financial()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role IN ('dono', 'head') FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

-- ---- finance_categories ----
CREATE POLICY "categories: leitura por financeiro"
  ON finance_categories FOR SELECT
  USING (operation_id = get_my_operation_id() AND can_see_financial());

CREATE POLICY "categories: inserir por dono"
  ON finance_categories FOR INSERT
  WITH CHECK (operation_id = get_my_operation_id() AND get_my_role() = 'dono');

CREATE POLICY "categories: atualizar por dono"
  ON finance_categories FOR UPDATE
  USING (operation_id = get_my_operation_id() AND get_my_role() = 'dono');

CREATE POLICY "categories: excluir por dono"
  ON finance_categories FOR DELETE
  USING (operation_id = get_my_operation_id() AND get_my_role() = 'dono');

-- ---- finance_entries ----
CREATE POLICY "entries: leitura por financeiro"
  ON finance_entries FOR SELECT
  USING (operation_id = get_my_operation_id() AND can_see_financial());

CREATE POLICY "entries: inserir por financeiro"
  ON finance_entries FOR INSERT
  WITH CHECK (operation_id = get_my_operation_id() AND can_see_financial());

CREATE POLICY "entries: atualizar por financeiro"
  ON finance_entries FOR UPDATE
  USING (operation_id = get_my_operation_id() AND can_see_financial());

CREATE POLICY "entries: excluir por dono"
  ON finance_entries FOR DELETE
  USING (operation_id = get_my_operation_id() AND get_my_role() IN ('dono', 'head'));

-- ============================================================
-- CATEGORIAS PADRÃO (inseridas após criação de cada operação,
-- via function chamada pelo app no signup do dono)
-- ============================================================

-- Função utilitária: seed de categorias padrão para nova operação
CREATE OR REPLACE FUNCTION seed_default_categories(p_operation_id UUID)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO finance_categories (operation_id, name, direction, color, is_default)
  VALUES
    (p_operation_id, 'venda',             'entrada', '#22c55e', true),
    (p_operation_id, 'aporte',            'entrada', '#3b82f6', true),
    (p_operation_id, 'outro_entrada',     'entrada', '#a855f7', true),
    (p_operation_id, 'taxa_plataforma',   'saida',   '#f59e0b', true),
    (p_operation_id, 'reembolso',         'saida',   '#ef4444', true),
    (p_operation_id, 'trafego',           'saida',   '#f97316', true),
    (p_operation_id, 'comissao',          'saida',   '#8b5cf6', true),
    (p_operation_id, 'custo_fixo',        'saida',   '#6b7280', true),
    (p_operation_id, 'salario',           'saida',   '#06b6d4', true),
    (p_operation_id, 'imposto',           'saida',   '#dc2626', true),
    (p_operation_id, 'outro_saida',       'saida',   '#9ca3af', true)
  ON CONFLICT DO NOTHING;
$$;


-- ============================================================
-- ORIGEM: 0005_traffic.sql
-- ============================================================

-- ============================================================
-- CENTRAL DE OPERAÇÕES — Fase 5: Painel de Tráfego
-- ============================================================

CREATE TYPE recurrence_period_traffic AS ENUM ('mensal', 'trimestral', 'anual');

-- Metas mensais de tráfego por dashboard
CREATE TABLE traffic_goals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id     UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  dashboard_id     UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  period           TEXT NOT NULL,  -- formato YYYY-MM (ex: 2026-06)
  meta_gasto       NUMERIC(14,2) NULL,
  meta_faturamento NUMERIC(14,2) NULL,
  roas_alvo        NUMERIC(6,2) NULL DEFAULT 3.00,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (operation_id, dashboard_id, period)
);

CREATE INDEX idx_traffic_goals_operation ON traffic_goals(operation_id);
CREATE INDEX idx_traffic_goals_dashboard ON traffic_goals(dashboard_id);

CREATE TRIGGER traffic_goals_updated_at
  BEFORE UPDATE ON traffic_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Configuração dos blocos do painel por dashboard
-- enabled_blocks: { "metas": true, "decisao": true, "funil": true, ... }
-- block_order: ["metas", "decisao", "funil", "reconciliacao", "saude", "temporal", "alertas"]
CREATE TABLE traffic_panel_config (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id   UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  dashboard_id   UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  enabled_blocks JSONB NOT NULL DEFAULT '{"metas":true,"decisao":true,"funil":true,"reconciliacao":true,"saude":true,"temporal":true,"alertas":true}'::jsonb,
  block_order    JSONB NOT NULL DEFAULT '["metas","decisao","funil","reconciliacao","saude","temporal","alertas"]'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (operation_id, dashboard_id)
);

CREATE INDEX idx_traffic_panel_config_dashboard ON traffic_panel_config(dashboard_id);

CREATE TRIGGER traffic_panel_config_updated_at
  BEFORE UPDATE ON traffic_panel_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS — acesso por setor trafego + liderança
-- ============================================================

ALTER TABLE traffic_goals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE traffic_panel_config ENABLE ROW LEVEL SECURITY;

-- Helper: verifica acesso ao painel de tráfego
CREATE OR REPLACE FUNCTION can_see_traffic()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role IN ('dono', 'head') OR sector = 'trafego'
     FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

-- traffic_goals
CREATE POLICY "traffic_goals: leitura por tráfego/liderança"
  ON traffic_goals FOR SELECT
  USING (operation_id = get_my_operation_id() AND can_see_traffic());

CREATE POLICY "traffic_goals: escrita por tráfego/liderança"
  ON traffic_goals FOR INSERT
  WITH CHECK (operation_id = get_my_operation_id() AND can_see_traffic());

CREATE POLICY "traffic_goals: atualização por tráfego/liderança"
  ON traffic_goals FOR UPDATE
  USING (operation_id = get_my_operation_id() AND can_see_traffic());

-- traffic_panel_config
CREATE POLICY "traffic_config: leitura"
  ON traffic_panel_config FOR SELECT
  USING (operation_id = get_my_operation_id() AND can_see_traffic());

CREATE POLICY "traffic_config: escrita"
  ON traffic_panel_config FOR INSERT
  WITH CHECK (operation_id = get_my_operation_id() AND can_see_traffic());

CREATE POLICY "traffic_config: atualização"
  ON traffic_panel_config FOR UPDATE
  USING (operation_id = get_my_operation_id() AND can_see_traffic());


-- ============================================================
-- ORIGEM: 0006_materials.sql
-- ============================================================

-- ============================================================
-- CENTRAL DE OPERAÇÕES — Fase 6: Materiais de Edição
-- ============================================================

CREATE TYPE material_type AS ENUM (
  'criativo_imagem',
  'criativo_video',
  'vsl',
  'pagina',
  'copy'
);

CREATE TYPE material_storage_kind AS ENUM ('upload', 'link');

CREATE TYPE material_status AS ENUM (
  'em_producao',
  'pronto',
  'no_ar',
  'aposentado'
);

CREATE TABLE materials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id  UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  dashboard_id  UUID NULL REFERENCES dashboards(id) ON DELETE SET NULL,
  type          material_type NOT NULL,
  title         TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  storage_kind  material_storage_kind NOT NULL,
  -- Para storage_kind='upload': path no bucket privado 'materials'
  -- Nunca exposto ao client — signed URL gerada no servidor
  storage_path  TEXT NULL,
  -- Para storage_kind='link': URL externa (Drive, Figma, Frame.io, etc.)
  external_url  TEXT NULL,
  status        material_status NOT NULL DEFAULT 'em_producao',
  -- Campo para casar com o criativo na plataforma de anúncio (Fase 6)
  -- Ex: nome do anúncio no Meta Ads, ID do creative
  ad_reference  TEXT NULL,
  created_by    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_materials_operation ON materials(operation_id);
CREATE INDEX idx_materials_dashboard ON materials(dashboard_id);
CREATE INDEX idx_materials_status    ON materials(status);
CREATE INDEX idx_materials_type      ON materials(type);

CREATE TRIGGER materials_updated_at
  BEFORE UPDATE ON materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS — acesso por setor edição + liderança
-- ============================================================

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION can_see_edicao()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role IN ('dono', 'head') OR sector = 'edicao'
     FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

CREATE POLICY "materials: leitura por edição/liderança"
  ON materials FOR SELECT
  USING (operation_id = get_my_operation_id() AND can_see_edicao());

CREATE POLICY "materials: inserir por edição/liderança"
  ON materials FOR INSERT
  WITH CHECK (
    operation_id = get_my_operation_id()
    AND can_see_edicao()
    AND created_by = auth.uid()
  );

CREATE POLICY "materials: atualizar por edição/liderança"
  ON materials FOR UPDATE
  USING (operation_id = get_my_operation_id() AND can_see_edicao());

CREATE POLICY "materials: excluir por dono/head ou criador"
  ON materials FOR DELETE
  USING (
    operation_id = get_my_operation_id()
    AND (created_by = auth.uid() OR get_my_role() IN ('dono', 'head'))
  );

-- ============================================================
-- STORAGE: bucket PRIVADO para materiais de edição
-- Mesmo padrão do bucket task-attachments (Fase 3):
-- path armazenado no DB, signed URLs geradas no servidor.
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('materials', 'materials', false)
ON CONFLICT DO NOTHING;

CREATE POLICY "materials-storage: upload por autenticado"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'materials' AND auth.role() = 'authenticated');

CREATE POLICY "materials-storage: leitura por autenticado"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'materials' AND auth.role() = 'authenticated');

CREATE POLICY "materials-storage: exclusão por autenticado"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'materials' AND auth.role() = 'authenticated');


-- ============================================================
-- ORIGEM: 0007_dev_monitoring.sql
-- ============================================================

-- ============================================================
-- CENTRAL DE OPERAÇÕES — Fase 7: Dev + Centro de Integrações
-- ============================================================

CREATE TYPE monitored_resource_kind AS ENUM ('pagina', 'dominio');

CREATE TYPE monitored_resource_status AS ENUM (
  'no_ar',
  'fora',
  'lento',
  'desconhecido'
);

CREATE TABLE monitored_resources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id    UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  dashboard_id    UUID NULL REFERENCES dashboards(id) ON DELETE SET NULL,
  kind            monitored_resource_kind NOT NULL,
  label           TEXT NOT NULL CHECK (char_length(label) BETWEEN 1 AND 200),
  url             TEXT NOT NULL,
  status          monitored_resource_status NOT NULL DEFAULT 'desconhecido',
  -- O dev pode sobrescrever status manualmente + adicionar nota
  manual_note     TEXT NULL,
  last_checked_at TIMESTAMPTZ NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_monitored_resources_operation ON monitored_resources(operation_id);
CREATE INDEX idx_monitored_resources_dashboard ON monitored_resources(dashboard_id);

CREATE TRIGGER monitored_resources_updated_at
  BEFORE UPDATE ON monitored_resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- INTEGRATION CONNECTIONS
-- ============================================================

CREATE TYPE integration_category AS ENUM ('venda', 'atribuicao', 'trafego');

CREATE TYPE integration_provider AS ENUM (
  'hotmart',
  'paradise',
  'vega',
  'shopify',
  'utmify',
  'meta_ads',
  'google_ads'
);

CREATE TYPE integration_status AS ENUM (
  'conectada',
  'desconectada',
  'erro'
);

CREATE TABLE integration_connections (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id          UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  dashboard_id          UUID NULL REFERENCES dashboards(id) ON DELETE SET NULL,
  category              integration_category NOT NULL,
  provider              integration_provider NOT NULL,
  status                integration_status NOT NULL DEFAULT 'desconectada',
  last_event_at         TIMESTAMPTZ NULL,
  -- Configuração pública (webhook URL, account ID, etc.)
  config                JSONB NOT NULL DEFAULT '{}',
  -- Credenciais sensíveis criptografadas com AES-256-GCM (ENCRYPTION_KEY de env).
  -- Nunca retornadas ao client após salvas. Só acessíveis em server actions.
  credentials_encrypted TEXT NULL,
  created_by            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_integration_connections_operation ON integration_connections(operation_id);
CREATE INDEX idx_integration_connections_dashboard ON integration_connections(dashboard_id);
CREATE INDEX idx_integration_connections_provider  ON integration_connections(provider);

CREATE TRIGGER integration_connections_updated_at
  BEFORE UPDATE ON integration_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS
-- ============================================================

CREATE OR REPLACE FUNCTION can_see_dev()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role IN ('dono', 'head') OR sector = 'dev'
     FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

-- monitored_resources
ALTER TABLE monitored_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monitored_resources: leitura dev/liderança"
  ON monitored_resources FOR SELECT
  USING (operation_id = get_my_operation_id() AND can_see_dev());

CREATE POLICY "monitored_resources: inserir dev/liderança"
  ON monitored_resources FOR INSERT
  WITH CHECK (operation_id = get_my_operation_id() AND can_see_dev());

CREATE POLICY "monitored_resources: atualizar dev/liderança"
  ON monitored_resources FOR UPDATE
  USING (operation_id = get_my_operation_id() AND can_see_dev());

CREATE POLICY "monitored_resources: excluir dono/head ou criador via dev"
  ON monitored_resources FOR DELETE
  USING (operation_id = get_my_operation_id() AND can_see_dev());

-- integration_connections
ALTER TABLE integration_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integration_connections: leitura dev/liderança"
  ON integration_connections FOR SELECT
  -- Retorna a linha SEM credentials_encrypted (nunca exposta ao client)
  USING (operation_id = get_my_operation_id() AND can_see_dev());

CREATE POLICY "integration_connections: inserir dev/liderança"
  ON integration_connections FOR INSERT
  WITH CHECK (
    operation_id = get_my_operation_id()
    AND can_see_dev()
    AND created_by = auth.uid()
  );

CREATE POLICY "integration_connections: atualizar dev/liderança"
  ON integration_connections FOR UPDATE
  USING (operation_id = get_my_operation_id() AND can_see_dev());

CREATE POLICY "integration_connections: excluir dono/head"
  ON integration_connections FOR DELETE
  USING (
    operation_id = get_my_operation_id()
    AND get_my_role() IN ('dono', 'head')
  );


-- ============================================================
-- ORIGEM: 0008_reports.sql
-- ============================================================

-- ============================================================
-- CENTRAL DE OPERAÇÕES — Fase 8: Relatório da Operação
-- ============================================================

CREATE TYPE report_period_type AS ENUM ('semanal', 'mensal');
CREATE TYPE report_status_type AS ENUM ('rascunho', 'congelado');

CREATE TABLE operation_reports (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id   UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  -- '2026-06' para mensal, '2026-W23' para semanal
  period_type    report_period_type NOT NULL,
  period_ref     TEXT NOT NULL,
  status         report_status_type NOT NULL DEFAULT 'rascunho',
  -- Snapshot imutável dos números no momento da geração
  generated_data JSONB NOT NULL DEFAULT '{}',
  -- Análise escrita pelo Head
  head_comment   TEXT NULL,
  created_by     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  frozen_at      TIMESTAMPTZ NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Um relatório por operação por período
  UNIQUE (operation_id, period_type, period_ref)
);

CREATE INDEX idx_operation_reports_operation ON operation_reports(operation_id);
CREATE INDEX idx_operation_reports_period    ON operation_reports(operation_id, period_type, created_at DESC);

CREATE TRIGGER operation_reports_updated_at
  BEFORE UPDATE ON operation_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS — Head gera/edita, Dono visualiza. Congelado = imutável.
-- ============================================================

ALTER TABLE operation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports: head/dono lê"
  ON operation_reports FOR SELECT
  USING (
    operation_id = get_my_operation_id()
    AND get_my_role() IN ('dono', 'head')
  );

CREATE POLICY "reports: head/dono cria"
  ON operation_reports FOR INSERT
  WITH CHECK (
    operation_id = get_my_operation_id()
    AND get_my_role() IN ('head', 'dono')
    AND created_by = auth.uid()
  );

CREATE POLICY "reports: head/dono atualiza rascunho"
  ON operation_reports FOR UPDATE
  USING (
    operation_id = get_my_operation_id()
    AND get_my_role() IN ('head', 'dono')
    AND status = 'rascunho'
  );

CREATE POLICY "reports: dono exclui"
  ON operation_reports FOR DELETE
  USING (
    operation_id = get_my_operation_id()
    AND get_my_role() = 'dono'
  );


-- ============================================================
-- ORIGEM: 0009_sales.sql
-- ============================================================

-- ============================================================
-- CENTRAL DE OPERAÇÕES — Fase 9a: Motor de Integrações (vendas)
-- ============================================================

CREATE TYPE sale_status AS ENUM (
  'pix_gerado',
  'pix_pago',
  'aprovado',
  'reembolsado',
  'chargeback'
);

CREATE TYPE sale_provider AS ENUM (
  'hotmart',
  'paradise',
  'vega',
  'shopify'
);

CREATE TABLE sales (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id  UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  -- Associação ao produto (dashboard) que gerou a venda
  dashboard_id  UUID NULL REFERENCES dashboards(id) ON DELETE SET NULL,
  -- ID único na plataforma de origem
  external_id   TEXT NOT NULL,
  provider      sale_provider NOT NULL,
  status        sale_status NOT NULL,
  -- Valor bruto e taxas da plataforma
  amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  fees          NUMERIC(12,2) NOT NULL DEFAULT 0,
  buyer_email   TEXT NULL,
  -- UTMs e origem (enriquecidos pela UTMify na Fase 9c)
  utm           JSONB NOT NULL DEFAULT '{}',
  occurred_at   TIMESTAMPTZ NOT NULL,
  -- Payload original para auditoria
  raw           JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Idempotência: mesmo evento recebido duas vezes não duplica
  UNIQUE (provider, external_id)
);

CREATE INDEX idx_sales_operation    ON sales(operation_id);
CREATE INDEX idx_sales_dashboard    ON sales(dashboard_id);
CREATE INDEX idx_sales_status       ON sales(status);
CREATE INDEX idx_sales_occurred_at  ON sales(occurred_at DESC);
CREATE INDEX idx_sales_buyer_email  ON sales(buyer_email) WHERE buyer_email IS NOT NULL;

-- RLS: operação isolada; apenas server-side (webhook receiver usa service role)
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales: leitura por operação autenticada"
  ON sales FOR SELECT
  USING (operation_id = get_my_operation_id());

-- Inserção/atualização só via service role (webhook receiver)
-- Usuários autenticados não precisam de política de escrita

-- ============================================================
-- LOG DE WEBHOOKS — para debug e auditoria
-- ============================================================

CREATE TABLE webhook_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider    TEXT NOT NULL,
  operation_id UUID NULL,
  status      TEXT NOT NULL, -- 'ok' | 'error' | 'ignored'
  payload     JSONB NOT NULL DEFAULT '{}',
  normalized  JSONB NULL,    -- evento normalizado (SaleEvent)
  error_msg   TEXT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_provider    ON webhook_logs(provider);
CREATE INDEX idx_webhook_logs_received_at ON webhook_logs(received_at DESC);
CREATE INDEX idx_webhook_logs_operation   ON webhook_logs(operation_id) WHERE operation_id IS NOT NULL;

-- Acesso restrito: só dono/head pode ver logs
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_logs: leitura dono/head"
  ON webhook_logs FOR SELECT
  USING (
    operation_id = get_my_operation_id()
    AND get_my_role() IN ('dono', 'head')
  );


-- ============================================================
-- ORIGEM: 0010_primary_sale_provider.sql
-- ============================================================

-- ============================================================
-- CENTRAL DE OPERAÇÕES — Fase 9b: Provider primário de receita
-- ============================================================
-- Cada dashboard pode declarar qual provider é a fonte primária
-- de dinheiro. Vendas de outros providers são gravadas em sales
-- mas NÃO somam receita no DRE (marcadas como atribuição secundária).
-- NULL = sem integração ativa; contar todos os providers com aviso.

ALTER TABLE dashboards
  ADD COLUMN primary_sale_provider TEXT NULL
  CONSTRAINT dashboards_primary_sale_provider_check
    CHECK (primary_sale_provider IN ('hotmart', 'paradise', 'vega', 'shopify'));


-- ============================================================
-- ORIGEM: 0011_utmify.sql
-- ============================================================

-- ============================================================
-- CENTRAL DE OPERAÇÕES — Fase 9c: Atribuição UTMify
-- ============================================================
-- Fila de eventos UTMify que chegaram antes da venda correspondente.
-- O receiver consulta essa fila logo após gravar uma venda e aplica
-- os UTMs ao registro, depois remove a entrada da fila.
-- Entradas com mais de 48 h devem ser limpas periodicamente (CRON na 10).

CREATE TABLE utmify_queue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id  UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  -- Dados de casamento: external_id (preferencial) ou email+valor+janela
  external_id   TEXT NULL,
  buyer_email   TEXT NULL,
  amount        NUMERIC(12,2) NULL,
  occurred_at   TIMESTAMPTZ NOT NULL,
  -- Enriquecimento a aplicar na venda quando casada
  utm           JSONB NOT NULL DEFAULT '{}',
  -- Dados de nível de anúncio (reservados para Fase 9e)
  ad_data       JSONB NOT NULL DEFAULT '{}',
  raw           JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para lookup rápido durante o casamento
CREATE INDEX idx_utmify_queue_external_id  ON utmify_queue(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX idx_utmify_queue_email        ON utmify_queue(buyer_email)  WHERE buyer_email IS NOT NULL;
CREATE INDEX idx_utmify_queue_operation    ON utmify_queue(operation_id);
CREATE INDEX idx_utmify_queue_created_at   ON utmify_queue(created_at DESC);

-- RLS: somente service role (webhook usa admin client).
-- Usuários autenticados não precisam ler esta fila.
ALTER TABLE utmify_queue ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- ORIGEM: 0012_ad_spend.sql
-- ============================================================

-- ============================================================
-- CENTRAL DE OPERAÇÕES — Fase 9d: Gasto de Tráfego (ad_spend)
-- ============================================================
-- Pull a cada 15 min via /api/cron/pull-ads.
-- Nível: conta + campanha (conjunto/anúncio = Fase 9e).
-- Upsert idempotente por (operation_id, provider, account_id, campaign_id, spend_date).

CREATE TABLE ad_spend (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id    UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  dashboard_id    UUID NULL REFERENCES dashboards(id) ON DELETE SET NULL,

  -- Provider: meta_ads | google_ads
  provider        TEXT NOT NULL CHECK (provider IN ('meta_ads', 'google_ads')),

  -- Conta de anúncio
  account_id      TEXT NOT NULL,
  account_name    TEXT NOT NULL DEFAULT '',
  account_status  TEXT NOT NULL DEFAULT 'ativa'
                    CHECK (account_status IN ('ativa', 'limitada', 'bloqueada')),

  -- Campanha
  campaign_id     TEXT NOT NULL,
  campaign_name   TEXT NOT NULL DEFAULT '',
  campaign_status TEXT NOT NULL DEFAULT 'ativa'
                    CHECK (campaign_status IN ('ativa', 'pausada')),

  -- Métricas do dia
  spend           NUMERIC(14,2) NOT NULL DEFAULT 0,
  impressions     BIGINT NOT NULL DEFAULT 0,
  clicks          BIGINT NOT NULL DEFAULT 0,
  -- results = conversões reportadas pela plataforma (não é a receita real — use sales)
  results         BIGINT NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'BRL',

  spend_date      DATE NOT NULL,     -- data do gasto (YYYY-MM-DD)
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Idempotência: um registro por provider+conta+campanha+dia
  UNIQUE (operation_id, provider, account_id, campaign_id, spend_date)
);

CREATE INDEX idx_ad_spend_operation   ON ad_spend(operation_id);
CREATE INDEX idx_ad_spend_dashboard   ON ad_spend(dashboard_id);
CREATE INDEX idx_ad_spend_provider    ON ad_spend(provider);
CREATE INDEX idx_ad_spend_date        ON ad_spend(spend_date DESC);
CREATE INDEX idx_ad_spend_fetched     ON ad_spend(fetched_at DESC);

-- RLS: acesso por operação + can_see_traffic()
ALTER TABLE ad_spend ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ad_spend: leitura por tráfego/liderança"
  ON ad_spend FOR SELECT
  USING (operation_id = get_my_operation_id() AND can_see_traffic());

-- Escrita: só via service role (cron usa admin client)
-- Usuários autenticados não escrevem diretamente em ad_spend


-- ============================================================
-- ORIGEM: 0013_ad_performance.sql
-- ============================================================

-- ============================================================
-- CENTRAL DE OPERAÇÕES — Fase 9e: Nível de Anúncio
-- ============================================================
-- Métricas por anúncio (Meta Ads). Alimentado pelo cron pull-ads.
-- Único por (operation_id, ad_id, spend_date) — upsert idempotente.
-- Casado com materials.ad_reference para calcular desempenho por criativo.

CREATE TABLE ad_performance (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id  UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  dashboard_id  UUID NULL REFERENCES dashboards(id) ON DELETE SET NULL,

  provider      TEXT NOT NULL DEFAULT 'meta_ads',
  account_id    TEXT NOT NULL,
  campaign_id   TEXT NOT NULL,
  adset_id      TEXT NOT NULL,
  adset_name    TEXT NOT NULL DEFAULT '',
  ad_id         TEXT NOT NULL,
  ad_name       TEXT NOT NULL DEFAULT '',

  spend         NUMERIC(14,2) NOT NULL DEFAULT 0,
  impressions   BIGINT NOT NULL DEFAULT 0,
  clicks        BIGINT NOT NULL DEFAULT 0,
  results       BIGINT NOT NULL DEFAULT 0,

  spend_date    DATE NOT NULL,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (operation_id, ad_id, spend_date)
);

CREATE INDEX idx_ad_perf_operation  ON ad_performance(operation_id);
CREATE INDEX idx_ad_perf_dashboard  ON ad_performance(dashboard_id);
CREATE INDEX idx_ad_perf_ad_id      ON ad_performance(ad_id);
CREATE INDEX idx_ad_perf_date       ON ad_performance(spend_date DESC);
CREATE INDEX idx_ad_perf_ad_name    ON ad_performance(ad_name);

-- RLS: leitura por edicao/tráfego/liderança (criativo precisa de dado de desempenho)
ALTER TABLE ad_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ad_performance: leitura por edição/tráfego/liderança"
  ON ad_performance FOR SELECT
  USING (
    operation_id = get_my_operation_id()
    AND (can_see_edicao() OR can_see_traffic())
  );

-- Escrita: somente service role (cron usa admin client)


-- ============================================================
-- ORIGEM: 0014_alerts.sql
-- ============================================================

-- ============================================================
-- CENTRAL DE OPERAÇÕES — Fase 10: Motor de Alertas
-- ============================================================
-- Alertas gerados pelo cron (regras automáticas) e pelo health check.
-- Idempotente via índice parcial único por (operation_id, dashboard_id, type)
-- onde status = 'ativo' — não duplica o mesmo alerta aberto.

CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'danger');
CREATE TYPE alert_status   AS ENUM ('ativo', 'resolvido');

-- Quem pode ver o alerta (filtro de visibilidade além da operação)
CREATE TYPE alert_visibility AS ENUM ('todos', 'dono_head');

CREATE TABLE alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id  UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  -- Null = alerta da operação inteira; preenchido = alerta de produto específico
  dashboard_id  UUID NULL REFERENCES dashboards(id) ON DELETE CASCADE,

  -- Tipo da regra que gerou o alerta (slug único por regra)
  type          TEXT NOT NULL,
  severity      alert_severity NOT NULL,
  message       TEXT NOT NULL,
  -- Contexto extra para o front (ex: % acima do limite, valor atual, etc.)
  context       JSONB NOT NULL DEFAULT '{}',

  visible_to    alert_visibility NOT NULL DEFAULT 'todos',
  status        alert_status NOT NULL DEFAULT 'ativo',

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ NULL
);

-- Idempotência: máximo um alerta ATIVO de cada tipo por dashboard por operação
CREATE UNIQUE INDEX alerts_active_unique
  ON alerts (operation_id, COALESCE(dashboard_id, '00000000-0000-0000-0000-000000000000'::uuid), type)
  WHERE status = 'ativo';

CREATE INDEX idx_alerts_operation   ON alerts(operation_id);
CREATE INDEX idx_alerts_dashboard   ON alerts(dashboard_id) WHERE dashboard_id IS NOT NULL;
CREATE INDEX idx_alerts_status      ON alerts(status);
CREATE INDEX idx_alerts_created_at  ON alerts(created_at DESC);

-- RLS
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Leitura: operation match + visibilidade
-- 'todos' = qualquer membro autenticado da operação
-- 'dono_head' = apenas dono ou head
CREATE POLICY "alerts: leitura por membro com permissão de visibilidade"
  ON alerts FOR SELECT
  USING (
    operation_id = get_my_operation_id()
    AND (
      visible_to = 'todos'
      OR (visible_to = 'dono_head' AND get_my_role() IN ('dono', 'head'))
    )
  );

-- Escrita: somente service role (cron usa admin client)
-- Usuários não escrevem alertas diretamente


