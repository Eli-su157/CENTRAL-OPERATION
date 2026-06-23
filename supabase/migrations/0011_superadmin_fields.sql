-- Adiciona colunas de controle para o Painel Mãe (super admin)

ALTER TABLE operations
  ADD COLUMN IF NOT EXISTS plan   TEXT NOT NULL DEFAULT 'basico',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ativa';

-- Índice para listar rapidamente operações ativas/suspensas
CREATE INDEX IF NOT EXISTS idx_operations_status ON operations (status);
