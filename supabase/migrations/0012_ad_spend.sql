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
