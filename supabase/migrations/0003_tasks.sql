-- ============================================================
-- CENTRAL DE OPERAÇÕES — Fase 3: Tarefas
-- ============================================================

-- Enums
CREATE TYPE task_priority AS ENUM ('baixa', 'media', 'alta');
CREATE TYPE task_status   AS ENUM ('a_fazer', 'fazendo', 'concluida');
CREATE TYPE attachment_type AS ENUM ('arquivo', 'link');

-- ============================================================
-- TABELAS
-- ============================================================

CREATE TABLE tasks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id        UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  dashboard_id        UUID NULL REFERENCES dashboards(id) ON DELETE SET NULL,
  title               TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description         TEXT NULL,
  assignee_user_id    UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  sector              user_sector NOT NULL,
  priority            task_priority NOT NULL DEFAULT 'media',
  due_date            DATE NULL,
  status              task_status NOT NULL DEFAULT 'a_fazer',
  created_by_user_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE task_attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  operation_id  UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  type          attachment_type NOT NULL,
  url           TEXT NOT NULL,
  label         TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE task_comments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  operation_id  UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body          TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX idx_tasks_operation_id       ON tasks(operation_id);
CREATE INDEX idx_tasks_assignee_user_id   ON tasks(assignee_user_id);
CREATE INDEX idx_tasks_dashboard_id       ON tasks(dashboard_id);
CREATE INDEX idx_tasks_status             ON tasks(status);
CREATE INDEX idx_tasks_due_date           ON tasks(due_date);
CREATE INDEX idx_task_comments_task_id    ON task_comments(task_id);
CREATE INDEX idx_task_attachments_task_id ON task_attachments(task_id);

-- Trigger: atualiza updated_at ao alterar tarefa
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE tasks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments      ENABLE ROW LEVEL SECURITY;

-- ---- tasks ----
-- Todos da operação podem ler (o scope é validado na UI/server action)
CREATE POLICY "tasks: membros leem"
  ON tasks FOR SELECT
  USING (operation_id = get_my_operation_id());

-- Qualquer membro pode criar (escopo validado no servidor, não aqui)
CREATE POLICY "tasks: membros inserem"
  ON tasks FOR INSERT
  WITH CHECK (
    operation_id = get_my_operation_id()
    AND created_by_user_id = auth.uid()
  );

-- Assignee, criador, dono e head podem atualizar
CREATE POLICY "tasks: criador/assignee/liderança atualiza"
  ON tasks FOR UPDATE
  USING (
    operation_id = get_my_operation_id()
    AND (
      created_by_user_id = auth.uid()
      OR assignee_user_id = auth.uid()
      OR get_my_role() IN ('dono', 'head')
    )
  );

-- Criador, dono e head podem excluir
CREATE POLICY "tasks: criador/liderança remove"
  ON tasks FOR DELETE
  USING (
    operation_id = get_my_operation_id()
    AND (
      created_by_user_id = auth.uid()
      OR get_my_role() IN ('dono', 'head')
    )
  );

-- ---- task_attachments ----
CREATE POLICY "attachments: leitura por operação"
  ON task_attachments FOR SELECT
  USING (operation_id = get_my_operation_id());

CREATE POLICY "attachments: inserir por membro"
  ON task_attachments FOR INSERT
  WITH CHECK (operation_id = get_my_operation_id());

CREATE POLICY "attachments: excluir por membro"
  ON task_attachments FOR DELETE
  USING (operation_id = get_my_operation_id());

-- ---- task_comments ----
CREATE POLICY "comments: leitura por operação"
  ON task_comments FOR SELECT
  USING (operation_id = get_my_operation_id());

CREATE POLICY "comments: inserir por membro"
  ON task_comments FOR INSERT
  WITH CHECK (
    operation_id = get_my_operation_id()
    AND user_id = auth.uid()
  );

CREATE POLICY "comments: excluir próprio ou liderança"
  ON task_comments FOR DELETE
  USING (
    operation_id = get_my_operation_id()
    AND (
      user_id = auth.uid()
      OR get_my_role() IN ('dono', 'head')
    )
  );

-- ============================================================
-- STORAGE: bucket PRIVADO para anexos de tarefas
-- Arquivos só são acessíveis via signed URLs geradas no servidor,
-- nunca via URL pública direta. O controle de acesso real fica na
-- camada de aplicação (server action verifica operation_id antes
-- de gerar a signed URL com o service role client).
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', false)   -- PRIVADO
ON CONFLICT DO NOTHING;

-- Upload: qualquer membro autenticado pode fazer upload
-- (a validação de task.operation_id está no server action addAttachmentAction)
CREATE POLICY "storage: upload por membro autenticado"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'task-attachments' AND auth.role() = 'authenticated');

-- SELECT: o acesso direto via client autenticado ainda exige autenticação
-- (defesa em profundidade; signed URLs geradas pelo service role contornam
-- esta política intencionalmente — é o único caminho de leitura para o app)
CREATE POLICY "storage: leitura por membro autenticado"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'task-attachments' AND auth.role() = 'authenticated');

-- DELETE: autenticado (limpeza de arquivos fica para future fase)
CREATE POLICY "storage: exclusão por membro autenticado"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'task-attachments' AND auth.role() = 'authenticated');
