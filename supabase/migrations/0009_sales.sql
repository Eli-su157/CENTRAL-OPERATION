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
