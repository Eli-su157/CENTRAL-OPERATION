-- ============================================================
-- CENTRAL DE OPERAÇÕES — Fase 8: Relatório da Operação
-- ============================================================

CREATE TYPE report_period_type AS ENUM ('semanal', 'mensal');
CREATE TYPE report_status_type AS ENUM ('rascunho', 'congelado');

CREATE TABLE operation_reports (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id   UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  -- '2026-06' para mensal, '2026-W23' para semanal
  period_type    report_period_type NOT NULL,
  period_ref     TEXT NOT NULL,
  status         report_status_type NOT NULL DEFAULT 'rascunho',
  -- Snapshot imutável dos números no momento da geração
  generated_data JSONB NOT NULL DEFAULT '{}',
  -- Análise escrita pelo Head
  head_comment   TEXT NULL,
  created_by     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  frozen_at      TIMESTAMPTZ NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Um relatório por operação por período
  UNIQUE (operation_id, period_type, period_ref)
);

CREATE INDEX idx_operation_reports_operation ON operation_reports(operation_id);
CREATE INDEX idx_operation_reports_period    ON operation_reports(operation_id, period_type, created_at DESC);

CREATE TRIGGER operation_reports_updated_at
  BEFORE UPDATE ON operation_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS — Head gera/edita, Dono visualiza. Congelado = imutável.
-- ============================================================

ALTER TABLE operation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports: head/dono lê"
  ON operation_reports FOR SELECT
  USING (
    operation_id = get_my_operation_id()
    AND get_my_role() IN ('dono', 'head')
  );

CREATE POLICY "reports: head/dono cria"
  ON operation_reports FOR INSERT
  WITH CHECK (
    operation_id = get_my_operation_id()
    AND get_my_role() IN ('head', 'dono')
    AND created_by = auth.uid()
  );

CREATE POLICY "reports: head/dono atualiza rascunho"
  ON operation_reports FOR UPDATE
  USING (
    operation_id = get_my_operation_id()
    AND get_my_role() IN ('head', 'dono')
    AND status = 'rascunho'
  );

CREATE POLICY "reports: dono exclui"
  ON operation_reports FOR DELETE
  USING (
    operation_id = get_my_operation_id()
    AND get_my_role() = 'dono'
  );
