-- ============================================================
-- CENTRAL DE OPERAÇÕES — Fase 9e: Nível de Anúncio
-- ============================================================
-- Métricas por anúncio (Meta Ads). Alimentado pelo cron pull-ads.
-- Único por (operation_id, ad_id, spend_date) — upsert idempotente.
-- Casado com materials.ad_reference para calcular desempenho por criativo.

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

CREATE INDEX idx_ad_perf_operation  ON ad_performance(operation_id);
CREATE INDEX idx_ad_perf_dashboard  ON ad_performance(dashboard_id);
CREATE INDEX idx_ad_perf_ad_id      ON ad_performance(ad_id);
CREATE INDEX idx_ad_perf_date       ON ad_performance(spend_date DESC);
CREATE INDEX idx_ad_perf_ad_name    ON ad_performance(ad_name);

-- RLS: leitura por edicao/tráfego/liderança (criativo precisa de dado de desempenho)
ALTER TABLE ad_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ad_performance: leitura por edição/tráfego/liderança"
  ON ad_performance FOR SELECT
  USING (
    operation_id = get_my_operation_id()
    AND (can_see_edicao() OR can_see_traffic())
  );

-- Escrita: somente service role (cron usa admin client)
