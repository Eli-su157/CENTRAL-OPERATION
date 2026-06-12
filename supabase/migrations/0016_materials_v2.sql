-- ============================================================
-- 0016 — Materials v2: versão, vínculo tarefa, campanha
-- ============================================================
-- Adiciona campos opcionais ao materials sem breaking changes.
-- created_by já existe — é o campo que acende o dado de equipe.

ALTER TABLE materials
  ADD COLUMN IF NOT EXISTS version       TEXT    DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS task_id       UUID    REFERENCES tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campaign_ref  TEXT    NULL;

COMMENT ON COLUMN materials.version      IS 'Versão do criativo: v1, v2, v3...';
COMMENT ON COLUMN materials.task_id      IS 'Tarefa de criação que gerou este material';
COMMENT ON COLUMN materials.campaign_ref IS 'Nome/id da campanha onde está rodando';
COMMENT ON COLUMN materials.created_by   IS 'Editor responsável — liga ao painel de Equipe (Fase C)';

CREATE INDEX IF NOT EXISTS idx_materials_creator ON materials(created_by);
CREATE INDEX IF NOT EXISTS idx_materials_task    ON materials(task_id) WHERE task_id IS NOT NULL;
