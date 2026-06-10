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
