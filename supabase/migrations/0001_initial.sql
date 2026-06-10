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
