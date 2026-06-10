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
