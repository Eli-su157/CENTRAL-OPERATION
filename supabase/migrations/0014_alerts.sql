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
