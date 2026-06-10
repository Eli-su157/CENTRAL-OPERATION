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
