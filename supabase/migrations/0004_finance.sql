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
