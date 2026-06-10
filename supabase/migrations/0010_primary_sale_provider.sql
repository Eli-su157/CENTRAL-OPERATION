-- ============================================================
-- CENTRAL DE OPERAÇÕES — Fase 9b: Provider primário de receita
-- ============================================================
-- Cada dashboard pode declarar qual provider é a fonte primária
-- de dinheiro. Vendas de outros providers são gravadas em sales
-- mas NÃO somam receita no DRE (marcadas como atribuição secundária).
-- NULL = sem integração ativa; contar todos os providers com aviso.

ALTER TABLE dashboards
  ADD COLUMN primary_sale_provider TEXT NULL
  CONSTRAINT dashboards_primary_sale_provider_check
    CHECK (primary_sale_provider IN ('hotmart', 'paradise', 'vega', 'shopify'));
