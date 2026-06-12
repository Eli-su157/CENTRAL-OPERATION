-- ============================================================
-- 0017 — Inteligência Artificial: resumo + histórico de chat
-- ============================================================

-- Campo de resumo executivo gerado pela IA no relatório
ALTER TABLE operation_reports
  ADD COLUMN IF NOT EXISTS ai_summary TEXT NULL,
  ADD COLUMN IF NOT EXISTS ai_summary_generated_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN operation_reports.ai_summary IS 'Resumo executivo gerado pela IA para este relatório';

-- Histórico de chats com a IA (por operação — não por usuário para permitir contexto compartilhado)
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_id   UUID        NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  user_id        UUID        NOT NULL REFERENCES profiles(id)   ON DELETE CASCADE,
  role           TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content        TEXT        NOT NULL,
  context_snapshot JSONB     NULL,  -- snapshot compacto do contexto usado (para auditoria)
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ai_chat_messages_op_created ON ai_chat_messages (operation_id, created_at DESC);
CREATE INDEX ai_chat_messages_user       ON ai_chat_messages (user_id, created_at DESC);

ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Cada usuário só lê as próprias mensagens da sua operação
CREATE POLICY "ai_chat_member_read" ON ai_chat_messages
  FOR SELECT USING (
    operation_id = (SELECT operation_id FROM profiles WHERE id = auth.uid() LIMIT 1)
    AND user_id = auth.uid()
  );
CREATE POLICY "ai_chat_member_insert" ON ai_chat_messages
  FOR INSERT WITH CHECK (
    operation_id = (SELECT operation_id FROM profiles WHERE id = auth.uid() LIMIT 1)
    AND user_id = auth.uid()
  );
