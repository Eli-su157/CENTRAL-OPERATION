-- ============================================================
-- CENTRAL DE OPERAÇÕES — Fase 18: Eventos de Calendário
-- ============================================================

CREATE TYPE calendar_event_type AS ENUM (
  'reuniao',
  'prazo',
  'lembrete',
  'outro'
);

CREATE TABLE calendar_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id    UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description     TEXT NULL,
  event_date      DATE NOT NULL,
  event_time      TIME NULL,
  event_type      calendar_event_type NOT NULL DEFAULT 'outro',
  color           TEXT NOT NULL DEFAULT 'orange',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_calendar_events_operation_date
  ON calendar_events(operation_id, event_date);

-- RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Membros da operação veem todos os eventos
CREATE POLICY "calendar: membro vê"
  ON calendar_events FOR SELECT
  USING (
    operation_id = (SELECT operation_id FROM profiles WHERE id = auth.uid())
  );

-- Qualquer membro pode criar
CREATE POLICY "calendar: membro cria"
  ON calendar_events FOR INSERT
  WITH CHECK (
    operation_id = (SELECT operation_id FROM profiles WHERE id = auth.uid())
    AND created_by = auth.uid()
  );

-- Apenas criador ou dono pode deletar
CREATE POLICY "calendar: criador/dono deleta"
  ON calendar_events FOR DELETE
  USING (
    created_by = auth.uid()
    OR get_my_role() IN ('dono', 'head')
  );

-- Apenas criador ou dono pode editar
CREATE POLICY "calendar: criador/dono atualiza"
  ON calendar_events FOR UPDATE
  USING (
    created_by = auth.uid()
    OR get_my_role() IN ('dono', 'head')
  );
