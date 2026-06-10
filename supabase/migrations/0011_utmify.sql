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
