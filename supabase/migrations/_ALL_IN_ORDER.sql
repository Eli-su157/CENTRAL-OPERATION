-- ============================================================
-- CENTRAL DE OPERAÇÕES — Schema Completo (Fases 0–10)
-- Execute este arquivo em um banco ZERADO no Supabase SQL Editor.
-- Última atualização: 2026-06-10
-- ============================================================


-- ============================================================
-- ORIGEM: 0001_initial.sql — Fase 0: Schema Base
-- ============================================================

CREATE TYPE user_role    AS ENUM ('dono', 'head', 'lider', 'executor');
CREATE TYPE user_sector  AS ENUM ('trafego', 'edicao', 'dev', 'financeiro');
CREATE TYPE invite_status AS ENUM ('pendente', 'aceito', 'expirado');

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

-- primary_sale_provider adicionado na Fase 9b (0010_primary_sale_provider.sql)
CREATE TABLE dashboards (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id          UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  primary_sale_provider TEXT NULL
    CONSTRAINT dashboards_primary_sale_provider_check
      CHECK (primary_sale_provider IN ('hotmart', 'paradise', 'vega', 'shopify')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

CREATE INDEX idx_profiles_operation_id   ON profiles(operation_id);
CREATE INDEX idx_dashboards_operation_id ON dashboards(operation_id);
CREATE INDEX idx_invites_operation_id    ON invites(operation_id);
CREATE INDEX idx_invites_token           ON invites(token);

ALTER TABLE operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites    ENABLE ROW LEVEL SECURITY;

-- Retorna operation_id do usuário logado. SECURITY DEFINER para não depender de RLS em profiles.
CREATE OR REPLACE FUNCTION get_my_operation_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT operation_id FROM profiles WHERE id = auth.uid();
$$;

-- ---- operations ----
CREATE POLICY "operations: membro lê a própria"
  ON operations FOR SELECT USING (id = get_my_operation_id());
CREATE POLICY "operations: dono pode atualizar"
  ON operations FOR UPDATE USING (id = get_my_operation_id());

-- ---- profiles ----
CREATE POLICY "profiles: todos da operação se veem"
  ON profiles FOR SELECT USING (operation_id = get_my_operation_id());
CREATE POLICY "profiles: usuário atualiza o próprio"
  ON profiles FOR UPDATE USING (id = auth.uid());

-- ---- dashboards ----
CREATE POLICY "dashboards: select por operação"
  ON dashboards FOR SELECT USING (operation_id = get_my_operation_id());
CREATE POLICY "dashboards: insert por operação"
  ON dashboards FOR INSERT WITH CHECK (operation_id = get_my_operation_id());
CREATE POLICY "dashboards: update por operação"
  ON dashboards FOR UPDATE USING (operation_id = get_my_operation_id());
CREATE POLICY "dashboards: delete por operação"
  ON dashboards FOR DELETE USING (operation_id = get_my_operation_id());

-- ---- invites ----
CREATE POLICY "invites: select por operação"
  ON invites FOR SELECT USING (operation_id = get_my_operation_id());
CREATE POLICY "invites: insert por operação"
  ON invites FOR INSERT WITH CHECK (operation_id = get_my_operation_id());
CREATE POLICY "invites: update por operação"
  ON invites FOR UPDATE USING (operation_id = get_my_operation_id());


-- ============================================================
-- ORIGEM: 0002_rbac.sql — Fase 1: RBAC + Overrides
-- ============================================================

-- Retorna role do usuário atual sem depender de RLS em profiles.
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

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

CREATE INDEX idx_perm_overrides_user_id      ON permission_overrides(user_id);
CREATE INDEX idx_perm_overrides_operation_id ON permission_overrides(operation_id);

ALTER TABLE permission_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "overrides: usuário vê os próprios"
  ON permission_overrides FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "overrides: dono vê da operação"
  ON permission_overrides FOR SELECT
  USING (operation_id = get_my_operation_id() AND get_my_role() = 'dono');
CREATE POLICY "overrides: dono insere"
  ON permission_overrides FOR INSERT
  WITH CHECK (operation_id = get_my_operation_id() AND get_my_role() = 'dono');
CREATE POLICY "overrides: dono atualiza"
  ON permission_overrides FOR UPDATE
  USING (operation_id = get_my_operation_id() AND get_my_role() = 'dono');
CREATE POLICY "overrides: dono remove"
  ON permission_overrides FOR DELETE
  USING (operation_id = get_my_operation_id() AND get_my_role() = 'dono');

-- profiles: dono pode atualizar qualquer membro da operação
CREATE POLICY "profiles: dono atualiza membro"
  ON profiles FOR UPDATE
  USING (operation_id = get_my_operation_id() AND get_my_role() = 'dono');

-- profiles: dono pode remover membro (nunca a si mesmo)
CREATE POLICY "profiles: dono remove membro"
  ON profiles FOR DELETE
  USING (
    operation_id = get_my_operation_id()
    AND id != auth.uid()
    AND get_my_role() = 'dono'
  );

-- Dashboards e invites: restringir INSERT/DELETE/UPDATE ao dono (Fase 0 deixou aberto)
DROP POLICY IF EXISTS "dashboards: insert por operação" ON dashboards;
DROP POLICY IF EXISTS "dashboards: delete por operação" ON dashboards;

CREATE POLICY "dashboards: insert só dono"
  ON dashboards FOR INSERT
  WITH CHECK (operation_id = get_my_operation_id() AND get_my_role() = 'dono');
CREATE POLICY "dashboards: delete só dono"
  ON dashboards FOR DELETE
  USING (operation_id = get_my_operation_id() AND get_my_role() = 'dono');

DROP POLICY IF EXISTS "invites: insert por operação" ON invites;
DROP POLICY IF EXISTS "invites: update por operação" ON invites;

CREATE POLICY "invites: insert só dono"
  ON invites FOR INSERT
  WITH CHECK (operation_id = get_my_operation_id() AND get_my_role() = 'dono');
CREATE POLICY "invites: update só dono"
  ON invites FOR UPDATE
  USING (operation_id = get_my_operation_id() AND get_my_role() = 'dono');


-- ============================================================
-- ORIGEM: 0003_tasks.sql — Fase 3: Tarefas
-- ============================================================

CREATE TYPE task_priority   AS ENUM ('baixa', 'media', 'alta');
CREATE TYPE task_status     AS ENUM ('a_fazer', 'fazendo', 'concluida');
CREATE TYPE attachment_type AS ENUM ('arquivo', 'link');

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

CREATE INDEX idx_tasks_operation_id       ON tasks(operation_id);
CREATE INDEX idx_tasks_assignee_user_id   ON tasks(assignee_user_id);
CREATE INDEX idx_tasks_dashboard_id       ON tasks(dashboard_id);
CREATE INDEX idx_tasks_status             ON tasks(status);
CREATE INDEX idx_tasks_due_date           ON tasks(due_date);
CREATE INDEX idx_task_comments_task_id    ON task_comments(task_id);
CREATE INDEX idx_task_attachments_task_id ON task_attachments(task_id);

-- Trigger genérico reutilizado por todas as tabelas com updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE tasks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks: membros leem"
  ON tasks FOR SELECT USING (operation_id = get_my_operation_id());
CREATE POLICY "tasks: membros inserem"
  ON tasks FOR INSERT
  WITH CHECK (operation_id = get_my_operation_id() AND created_by_user_id = auth.uid());
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
CREATE POLICY "tasks: criador/liderança remove"
  ON tasks FOR DELETE
  USING (
    operation_id = get_my_operation_id()
    AND (created_by_user_id = auth.uid() OR get_my_role() IN ('dono', 'head'))
  );

CREATE POLICY "attachments: leitura por operação"
  ON task_attachments FOR SELECT USING (operation_id = get_my_operation_id());
CREATE POLICY "attachments: inserir por membro"
  ON task_attachments FOR INSERT WITH CHECK (operation_id = get_my_operation_id());
CREATE POLICY "attachments: excluir por membro"
  ON task_attachments FOR DELETE USING (operation_id = get_my_operation_id());

CREATE POLICY "comments: leitura por operação"
  ON task_comments FOR SELECT USING (operation_id = get_my_operation_id());
CREATE POLICY "comments: inserir por membro"
  ON task_comments FOR INSERT
  WITH CHECK (operation_id = get_my_operation_id() AND user_id = auth.uid());
CREATE POLICY "comments: excluir próprio ou liderança"
  ON task_comments FOR DELETE
  USING (
    operation_id = get_my_operation_id()
    AND (user_id = auth.uid() OR get_my_role() IN ('dono', 'head'))
  );

-- Bucket PRIVADO: acesso só via signed URLs geradas no servidor
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', false)
ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "storage: upload por membro autenticado"  ON storage.objects;
DROP POLICY IF EXISTS "storage: leitura por membro autenticado" ON storage.objects;
DROP POLICY IF EXISTS "storage: exclusão por membro autenticado" ON storage.objects;

CREATE POLICY "storage: upload por membro autenticado"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'task-attachments' AND auth.role() = 'authenticated');
CREATE POLICY "storage: leitura por membro autenticado"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'task-attachments' AND auth.role() = 'authenticated');
CREATE POLICY "storage: exclusão por membro autenticado"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'task-attachments' AND auth.role() = 'authenticated');


-- ============================================================
-- ORIGEM: 0004_finance.sql — Fase 4: Financeiro
-- ============================================================

CREATE TYPE entry_direction   AS ENUM ('entrada', 'saida');
CREATE TYPE entry_status      AS ENUM ('pago', 'a_pagar', 'a_receber');
CREATE TYPE entry_source      AS ENUM ('manual', 'integracao');
CREATE TYPE recurrence_period AS ENUM ('diario', 'semanal', 'mensal', 'trimestral', 'anual');

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

CREATE TABLE finance_entries (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id       UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  dashboard_id       UUID NULL REFERENCES dashboards(id) ON DELETE SET NULL,
  direction          entry_direction NOT NULL,
  category           TEXT NOT NULL,
  description        TEXT NULL,
  amount             NUMERIC(14,2) NOT NULL CHECK (amount > 0),
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

CREATE INDEX idx_finance_categories_operation ON finance_categories(operation_id);
CREATE INDEX idx_finance_entries_operation    ON finance_entries(operation_id);
CREATE INDEX idx_finance_entries_date         ON finance_entries(entry_date);
CREATE INDEX idx_finance_entries_dashboard    ON finance_entries(dashboard_id);
CREATE INDEX idx_finance_entries_status       ON finance_entries(status);
CREATE INDEX idx_finance_entries_direction    ON finance_entries(direction);

CREATE TRIGGER finance_entries_updated_at
  BEFORE UPDATE ON finance_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE finance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_entries    ENABLE ROW LEVEL SECURITY;

-- Acesso financeiro: dono ou head (executores/líderes precisam de override)
CREATE OR REPLACE FUNCTION can_see_financial()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT role IN ('dono', 'head') FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

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

-- Seed chamado pelo app no signup do dono
CREATE OR REPLACE FUNCTION seed_default_categories(p_operation_id UUID)
RETURNS VOID LANGUAGE SQL SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO finance_categories (operation_id, name, direction, color, is_default)
  VALUES
    (p_operation_id, 'venda',           'entrada', '#22c55e', true),
    (p_operation_id, 'aporte',          'entrada', '#3b82f6', true),
    (p_operation_id, 'outro_entrada',   'entrada', '#a855f7', true),
    (p_operation_id, 'taxa_plataforma', 'saida',   '#f59e0b', true),
    (p_operation_id, 'reembolso',       'saida',   '#ef4444', true),
    (p_operation_id, 'trafego',         'saida',   '#f97316', true),
    (p_operation_id, 'comissao',        'saida',   '#8b5cf6', true),
    (p_operation_id, 'custo_fixo',      'saida',   '#6b7280', true),
    (p_operation_id, 'salario',         'saida',   '#06b6d4', true),
    (p_operation_id, 'imposto',         'saida',   '#dc2626', true),
    (p_operation_id, 'outro_saida',     'saida',   '#9ca3af', true)
  ON CONFLICT DO NOTHING;
$$;


-- ============================================================
-- ORIGEM: 0005_traffic.sql — Fase 5: Painel de Tráfego
-- ============================================================

CREATE TYPE recurrence_period_traffic AS ENUM ('mensal', 'trimestral', 'anual');

-- Metas mensais de tráfego por dashboard (período: YYYY-MM)
CREATE TABLE traffic_goals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id     UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  dashboard_id     UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  period           TEXT NOT NULL,
  meta_gasto       NUMERIC(14,2) NULL,
  meta_faturamento NUMERIC(14,2) NULL,
  roas_alvo        NUMERIC(6,2) NULL DEFAULT 3.00,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (operation_id, dashboard_id, period)
);

-- Configuração dos blocos do painel por dashboard
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

CREATE INDEX idx_traffic_goals_operation        ON traffic_goals(operation_id);
CREATE INDEX idx_traffic_goals_dashboard        ON traffic_goals(dashboard_id);
CREATE INDEX idx_traffic_panel_config_dashboard ON traffic_panel_config(dashboard_id);

CREATE TRIGGER traffic_goals_updated_at
  BEFORE UPDATE ON traffic_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER traffic_panel_config_updated_at
  BEFORE UPDATE ON traffic_panel_config FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE traffic_goals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE traffic_panel_config ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION can_see_traffic()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT role IN ('dono', 'head') OR sector = 'trafego'
     FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

CREATE POLICY "traffic_goals: leitura por tráfego/liderança"
  ON traffic_goals FOR SELECT USING (operation_id = get_my_operation_id() AND can_see_traffic());
CREATE POLICY "traffic_goals: escrita por tráfego/liderança"
  ON traffic_goals FOR INSERT WITH CHECK (operation_id = get_my_operation_id() AND can_see_traffic());
CREATE POLICY "traffic_goals: atualização por tráfego/liderança"
  ON traffic_goals FOR UPDATE USING (operation_id = get_my_operation_id() AND can_see_traffic());

CREATE POLICY "traffic_config: leitura"
  ON traffic_panel_config FOR SELECT USING (operation_id = get_my_operation_id() AND can_see_traffic());
CREATE POLICY "traffic_config: escrita"
  ON traffic_panel_config FOR INSERT WITH CHECK (operation_id = get_my_operation_id() AND can_see_traffic());
CREATE POLICY "traffic_config: atualização"
  ON traffic_panel_config FOR UPDATE USING (operation_id = get_my_operation_id() AND can_see_traffic());


-- ============================================================
-- ORIGEM: 0006_materials.sql — Fase 6: Materiais de Edição
-- ============================================================

CREATE TYPE material_type         AS ENUM ('criativo_imagem', 'criativo_video', 'vsl', 'pagina', 'copy');
CREATE TYPE material_storage_kind AS ENUM ('upload', 'link');
CREATE TYPE material_status       AS ENUM ('em_producao', 'pronto', 'no_ar', 'aposentado');

CREATE TABLE materials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id  UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  dashboard_id  UUID NULL REFERENCES dashboards(id) ON DELETE SET NULL,
  type          material_type NOT NULL,
  title         TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  storage_kind  material_storage_kind NOT NULL,
  -- Para storage_kind='upload': path no bucket privado 'materials' — nunca exposto ao client
  storage_path  TEXT NULL,
  -- Para storage_kind='link': URL externa (Drive, Figma, Frame.io, etc.)
  external_url  TEXT NULL,
  status        material_status NOT NULL DEFAULT 'em_producao',
  -- Para casar com o criativo na plataforma de anúncio (ex: nome do anúncio no Meta Ads)
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
  BEFORE UPDATE ON materials FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION can_see_edicao()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT role IN ('dono', 'head') OR sector = 'edicao'
     FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

CREATE POLICY "materials: leitura por edição/liderança"
  ON materials FOR SELECT USING (operation_id = get_my_operation_id() AND can_see_edicao());
CREATE POLICY "materials: inserir por edição/liderança"
  ON materials FOR INSERT
  WITH CHECK (operation_id = get_my_operation_id() AND can_see_edicao() AND created_by = auth.uid());
CREATE POLICY "materials: atualizar por edição/liderança"
  ON materials FOR UPDATE USING (operation_id = get_my_operation_id() AND can_see_edicao());
CREATE POLICY "materials: excluir por dono/head ou criador"
  ON materials FOR DELETE
  USING (
    operation_id = get_my_operation_id()
    AND (created_by = auth.uid() OR get_my_role() IN ('dono', 'head'))
  );

-- Bucket PRIVADO: signed URLs geradas no servidor
INSERT INTO storage.buckets (id, name, public)
VALUES ('materials', 'materials', false)
ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "materials-storage: upload por autenticado"   ON storage.objects;
DROP POLICY IF EXISTS "materials-storage: leitura por autenticado"  ON storage.objects;
DROP POLICY IF EXISTS "materials-storage: exclusão por autenticado" ON storage.objects;

CREATE POLICY "materials-storage: upload por autenticado"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'materials' AND auth.role() = 'authenticated');
CREATE POLICY "materials-storage: leitura por autenticado"
  ON storage.objects FOR SELECT USING (bucket_id = 'materials' AND auth.role() = 'authenticated');
CREATE POLICY "materials-storage: exclusão por autenticado"
  ON storage.objects FOR DELETE USING (bucket_id = 'materials' AND auth.role() = 'authenticated');


-- ============================================================
-- ORIGEM: 0007_dev_monitoring.sql — Fase 7: Dev + Integrações
-- ============================================================

CREATE TYPE monitored_resource_kind   AS ENUM ('pagina', 'dominio');
CREATE TYPE monitored_resource_status AS ENUM ('no_ar', 'fora', 'lento', 'desconhecido');
CREATE TYPE integration_category      AS ENUM ('venda', 'atribuicao', 'trafego');
CREATE TYPE integration_provider      AS ENUM ('hotmart', 'paradise', 'vega', 'shopify', 'utmify', 'meta_ads', 'google_ads');
CREATE TYPE integration_status        AS ENUM ('conectada', 'desconectada', 'erro');

CREATE TABLE monitored_resources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id    UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  dashboard_id    UUID NULL REFERENCES dashboards(id) ON DELETE SET NULL,
  kind            monitored_resource_kind NOT NULL,
  label           TEXT NOT NULL CHECK (char_length(label) BETWEEN 1 AND 200),
  url             TEXT NOT NULL,
  status          monitored_resource_status NOT NULL DEFAULT 'desconhecido',
  manual_note     TEXT NULL,
  last_checked_at TIMESTAMPTZ NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE integration_connections (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id          UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  dashboard_id          UUID NULL REFERENCES dashboards(id) ON DELETE SET NULL,
  category              integration_category NOT NULL,
  provider              integration_provider NOT NULL,
  status                integration_status NOT NULL DEFAULT 'desconectada',
  last_event_at         TIMESTAMPTZ NULL,
  config                JSONB NOT NULL DEFAULT '{}',
  -- Credenciais criptografadas com AES-256-GCM. Nunca retornadas ao client.
  credentials_encrypted TEXT NULL,
  created_by            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_monitored_resources_operation     ON monitored_resources(operation_id);
CREATE INDEX idx_monitored_resources_dashboard     ON monitored_resources(dashboard_id);
CREATE INDEX idx_integration_connections_operation ON integration_connections(operation_id);
CREATE INDEX idx_integration_connections_dashboard ON integration_connections(dashboard_id);
CREATE INDEX idx_integration_connections_provider  ON integration_connections(provider);

CREATE TRIGGER monitored_resources_updated_at
  BEFORE UPDATE ON monitored_resources FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER integration_connections_updated_at
  BEFORE UPDATE ON integration_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE monitored_resources    ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_connections ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION can_see_dev()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT role IN ('dono', 'head') OR sector = 'dev'
     FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

CREATE POLICY "monitored_resources: leitura dev/liderança"
  ON monitored_resources FOR SELECT USING (operation_id = get_my_operation_id() AND can_see_dev());
CREATE POLICY "monitored_resources: inserir dev/liderança"
  ON monitored_resources FOR INSERT WITH CHECK (operation_id = get_my_operation_id() AND can_see_dev());
CREATE POLICY "monitored_resources: atualizar dev/liderança"
  ON monitored_resources FOR UPDATE USING (operation_id = get_my_operation_id() AND can_see_dev());
CREATE POLICY "monitored_resources: excluir dono/head ou criador via dev"
  ON monitored_resources FOR DELETE USING (operation_id = get_my_operation_id() AND can_see_dev());

CREATE POLICY "integration_connections: leitura dev/liderança"
  ON integration_connections FOR SELECT USING (operation_id = get_my_operation_id() AND can_see_dev());
CREATE POLICY "integration_connections: inserir dev/liderança"
  ON integration_connections FOR INSERT
  WITH CHECK (operation_id = get_my_operation_id() AND can_see_dev() AND created_by = auth.uid());
CREATE POLICY "integration_connections: atualizar dev/liderança"
  ON integration_connections FOR UPDATE USING (operation_id = get_my_operation_id() AND can_see_dev());
CREATE POLICY "integration_connections: excluir dono/head"
  ON integration_connections FOR DELETE
  USING (operation_id = get_my_operation_id() AND get_my_role() IN ('dono', 'head'));


-- ============================================================
-- ORIGEM: 0008_reports.sql — Fase 8: Relatórios
-- ============================================================

CREATE TYPE report_period_type AS ENUM ('semanal', 'mensal');
CREATE TYPE report_status_type AS ENUM ('rascunho', 'congelado');

CREATE TABLE operation_reports (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id   UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  period_type    report_period_type NOT NULL,
  period_ref     TEXT NOT NULL,  -- '2026-06' para mensal, '2026-W23' para semanal
  status         report_status_type NOT NULL DEFAULT 'rascunho',
  generated_data JSONB NOT NULL DEFAULT '{}',  -- snapshot imutável dos números
  head_comment   TEXT NULL,
  created_by     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  frozen_at      TIMESTAMPTZ NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (operation_id, period_type, period_ref)
);

CREATE INDEX idx_operation_reports_operation ON operation_reports(operation_id);
CREATE INDEX idx_operation_reports_period    ON operation_reports(operation_id, period_type, created_at DESC);

CREATE TRIGGER operation_reports_updated_at
  BEFORE UPDATE ON operation_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE operation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports: head/dono lê"
  ON operation_reports FOR SELECT
  USING (operation_id = get_my_operation_id() AND get_my_role() IN ('dono', 'head'));
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
  USING (operation_id = get_my_operation_id() AND get_my_role() = 'dono');


-- ============================================================
-- ORIGEM: 0009_sales.sql — Fase 9a: Motor de Integrações (Vendas)
-- ============================================================

CREATE TYPE sale_status   AS ENUM ('pix_gerado', 'pix_pago', 'aprovado', 'reembolsado', 'chargeback');
CREATE TYPE sale_provider AS ENUM ('hotmart', 'paradise', 'vega', 'shopify');

CREATE TABLE sales (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id  UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  dashboard_id  UUID NULL REFERENCES dashboards(id) ON DELETE SET NULL,
  external_id   TEXT NOT NULL,
  provider      sale_provider NOT NULL,
  status        sale_status NOT NULL,
  amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  fees          NUMERIC(12,2) NOT NULL DEFAULT 0,
  buyer_email   TEXT NULL,
  utm           JSONB NOT NULL DEFAULT '{}',
  occurred_at   TIMESTAMPTZ NOT NULL,
  raw           JSONB NOT NULL DEFAULT '{}',  -- payload original para auditoria
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, external_id)  -- idempotência: mesmo evento não duplica
);

CREATE INDEX idx_sales_operation   ON sales(operation_id);
CREATE INDEX idx_sales_dashboard   ON sales(dashboard_id);
CREATE INDEX idx_sales_status      ON sales(status);
CREATE INDEX idx_sales_occurred_at ON sales(occurred_at DESC);
CREATE INDEX idx_sales_buyer_email ON sales(buyer_email) WHERE buyer_email IS NOT NULL;

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales: leitura por operação autenticada"
  ON sales FOR SELECT USING (operation_id = get_my_operation_id());

-- Escrita somente via service role (webhook receiver usa admin client)

CREATE TABLE webhook_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider     TEXT NOT NULL,
  operation_id UUID NULL,
  status       TEXT NOT NULL,  -- 'ok' | 'error' | 'ignored'
  payload      JSONB NOT NULL DEFAULT '{}',
  normalized   JSONB NULL,     -- evento normalizado (SaleEvent)
  error_msg    TEXT NULL,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_provider    ON webhook_logs(provider);
CREATE INDEX idx_webhook_logs_received_at ON webhook_logs(received_at DESC);
CREATE INDEX idx_webhook_logs_operation   ON webhook_logs(operation_id) WHERE operation_id IS NOT NULL;

ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_logs: leitura dono/head"
  ON webhook_logs FOR SELECT
  USING (operation_id = get_my_operation_id() AND get_my_role() IN ('dono', 'head'));


-- ============================================================
-- ORIGEM: 0010_primary_sale_provider.sql — Fase 9b
-- (coluna já incluída na criação de dashboards acima)
-- ============================================================

-- ALTER TABLE dashboards ADD COLUMN primary_sale_provider ... (já aplicado no CREATE TABLE)


-- ============================================================
-- ORIGEM: 0011_utmify.sql — Fase 9c: Atribuição UTMify
-- ============================================================
-- Fila de eventos UTMify que chegaram antes da venda correspondente.
-- Receiver aplica UTMs ao registro e remove a entrada da fila.
-- Entradas com mais de 48h devem ser limpas periodicamente.

CREATE TABLE utmify_queue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id  UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  external_id   TEXT NULL,
  buyer_email   TEXT NULL,
  amount        NUMERIC(12,2) NULL,
  occurred_at   TIMESTAMPTZ NOT NULL,
  utm           JSONB NOT NULL DEFAULT '{}',
  ad_data       JSONB NOT NULL DEFAULT '{}',  -- reservado para Fase 9e
  raw           JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_utmify_queue_external_id ON utmify_queue(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX idx_utmify_queue_email       ON utmify_queue(buyer_email)  WHERE buyer_email IS NOT NULL;
CREATE INDEX idx_utmify_queue_operation   ON utmify_queue(operation_id);
CREATE INDEX idx_utmify_queue_created_at  ON utmify_queue(created_at DESC);

-- Somente service role acessa esta fila
ALTER TABLE utmify_queue ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- ORIGEM: 0012_ad_spend.sql — Fase 9d: Gasto de Tráfego
-- ============================================================
-- Pull a cada 15 min via /api/cron/pull-ads.
-- Nível: conta + campanha. Upsert idempotente.

CREATE TABLE ad_spend (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id    UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  dashboard_id    UUID NULL REFERENCES dashboards(id) ON DELETE SET NULL,
  provider        TEXT NOT NULL CHECK (provider IN ('meta_ads', 'google_ads')),
  account_id      TEXT NOT NULL,
  account_name    TEXT NOT NULL DEFAULT '',
  account_status  TEXT NOT NULL DEFAULT 'ativa'
                    CHECK (account_status IN ('ativa', 'limitada', 'bloqueada')),
  campaign_id     TEXT NOT NULL,
  campaign_name   TEXT NOT NULL DEFAULT '',
  campaign_status TEXT NOT NULL DEFAULT 'ativa'
                    CHECK (campaign_status IN ('ativa', 'pausada')),
  spend           NUMERIC(14,2) NOT NULL DEFAULT 0,
  impressions     BIGINT NOT NULL DEFAULT 0,
  clicks          BIGINT NOT NULL DEFAULT 0,
  -- results = conversões reportadas pela plataforma (não é receita real — use sales)
  results         BIGINT NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'BRL',
  spend_date      DATE NOT NULL,
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (operation_id, provider, account_id, campaign_id, spend_date)
);

CREATE INDEX idx_ad_spend_operation ON ad_spend(operation_id);
CREATE INDEX idx_ad_spend_dashboard ON ad_spend(dashboard_id);
CREATE INDEX idx_ad_spend_provider  ON ad_spend(provider);
CREATE INDEX idx_ad_spend_date      ON ad_spend(spend_date DESC);
CREATE INDEX idx_ad_spend_fetched   ON ad_spend(fetched_at DESC);

ALTER TABLE ad_spend ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ad_spend: leitura por tráfego/liderança"
  ON ad_spend FOR SELECT
  USING (operation_id = get_my_operation_id() AND can_see_traffic());

-- Escrita somente via service role (cron usa admin client)


-- ============================================================
-- ORIGEM: 0013_ad_performance.sql — Fase 9e: Nível de Anúncio
-- ============================================================
-- Métricas por anúncio (Meta Ads). Casado com materials.ad_reference.

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

CREATE INDEX idx_ad_perf_operation ON ad_performance(operation_id);
CREATE INDEX idx_ad_perf_dashboard ON ad_performance(dashboard_id);
CREATE INDEX idx_ad_perf_ad_id     ON ad_performance(ad_id);
CREATE INDEX idx_ad_perf_date      ON ad_performance(spend_date DESC);
CREATE INDEX idx_ad_perf_ad_name   ON ad_performance(ad_name);

ALTER TABLE ad_performance ENABLE ROW LEVEL SECURITY;

-- Edição precisa de dados de desempenho do criativo
CREATE POLICY "ad_performance: leitura por edição/tráfego/liderança"
  ON ad_performance FOR SELECT
  USING (
    operation_id = get_my_operation_id()
    AND (can_see_edicao() OR can_see_traffic())
  );

-- Escrita somente via service role (cron usa admin client)


-- ============================================================
-- ORIGEM: 0014_alerts.sql — Fase 10: Motor de Alertas
-- ============================================================
-- Gerado pelo cron (regras automáticas) e pelo health check.
-- Idempotente: máximo um alerta ATIVO de cada tipo por dashboard/operação.

CREATE TYPE alert_severity   AS ENUM ('info', 'warning', 'danger');
CREATE TYPE alert_status     AS ENUM ('ativo', 'resolvido');
CREATE TYPE alert_visibility AS ENUM ('todos', 'dono_head');

CREATE TABLE alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id  UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  dashboard_id  UUID NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  severity      alert_severity NOT NULL,
  message       TEXT NOT NULL,
  context       JSONB NOT NULL DEFAULT '{}',
  visible_to    alert_visibility NOT NULL DEFAULT 'todos',
  status        alert_status NOT NULL DEFAULT 'ativo',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ NULL
);

-- Garante no máximo um alerta ativo de cada tipo por dashboard por operação
CREATE UNIQUE INDEX alerts_active_unique
  ON alerts (operation_id, COALESCE(dashboard_id, '00000000-0000-0000-0000-000000000000'::uuid), type)
  WHERE status = 'ativo';

CREATE INDEX idx_alerts_operation  ON alerts(operation_id);
CREATE INDEX idx_alerts_dashboard  ON alerts(dashboard_id) WHERE dashboard_id IS NOT NULL;
CREATE INDEX idx_alerts_status     ON alerts(status);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alerts: leitura por membro com permissão de visibilidade"
  ON alerts FOR SELECT
  USING (
    operation_id = get_my_operation_id()
    AND (
      visible_to = 'todos'
      OR (visible_to = 'dono_head' AND get_my_role() IN ('dono', 'head'))
    )
  );

-- Escrita somente via service role (cron usa admin client)


-- ============================================================
-- GRANTS — Permissões para roles do Supabase em todos os objetos
-- ============================================================

GRANT USAGE  ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL    ON SCHEMA public TO postgres;
GRANT CREATE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL ON ALL TABLES    IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES    TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
