-- ============================================================
-- CENTRAL DE OPERAÇÕES — Fase 6: Materiais de Edição
-- ============================================================

CREATE TYPE material_type AS ENUM (
  'criativo_imagem',
  'criativo_video',
  'vsl',
  'pagina',
  'copy'
);

CREATE TYPE material_storage_kind AS ENUM ('upload', 'link');

CREATE TYPE material_status AS ENUM (
  'em_producao',
  'pronto',
  'no_ar',
  'aposentado'
);

CREATE TABLE materials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id  UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  dashboard_id  UUID NULL REFERENCES dashboards(id) ON DELETE SET NULL,
  type          material_type NOT NULL,
  title         TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  storage_kind  material_storage_kind NOT NULL,
  -- Para storage_kind='upload': path no bucket privado 'materials'
  -- Nunca exposto ao client — signed URL gerada no servidor
  storage_path  TEXT NULL,
  -- Para storage_kind='link': URL externa (Drive, Figma, Frame.io, etc.)
  external_url  TEXT NULL,
  status        material_status NOT NULL DEFAULT 'em_producao',
  -- Campo para casar com o criativo na plataforma de anúncio (Fase 6)
  -- Ex: nome do anúncio no Meta Ads, ID do creative
  ad_reference  TEXT NULL,
  created_by    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_materials_operation ON materials(operation_id);
CREATE INDEX idx_materials_dashboard ON materials(dashboard_id);
CREATE INDEX idx_materials_status    ON materials(status);
CREATE INDEX idx_materials_type      ON materials(type);

CREATE TRIGGER materials_updated_at
  BEFORE UPDATE ON materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS — acesso por setor edição + liderança
-- ============================================================

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION can_see_edicao()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role IN ('dono', 'head') OR sector = 'edicao'
     FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

CREATE POLICY "materials: leitura por edição/liderança"
  ON materials FOR SELECT
  USING (operation_id = get_my_operation_id() AND can_see_edicao());

CREATE POLICY "materials: inserir por edição/liderança"
  ON materials FOR INSERT
  WITH CHECK (
    operation_id = get_my_operation_id()
    AND can_see_edicao()
    AND created_by = auth.uid()
  );

CREATE POLICY "materials: atualizar por edição/liderança"
  ON materials FOR UPDATE
  USING (operation_id = get_my_operation_id() AND can_see_edicao());

CREATE POLICY "materials: excluir por dono/head ou criador"
  ON materials FOR DELETE
  USING (
    operation_id = get_my_operation_id()
    AND (created_by = auth.uid() OR get_my_role() IN ('dono', 'head'))
  );

-- ============================================================
-- STORAGE: bucket PRIVADO para materiais de edição
-- Mesmo padrão do bucket task-attachments (Fase 3):
-- path armazenado no DB, signed URLs geradas no servidor.
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('materials', 'materials', false)
ON CONFLICT DO NOTHING;

CREATE POLICY "materials-storage: upload por autenticado"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'materials' AND auth.role() = 'authenticated');

CREATE POLICY "materials-storage: leitura por autenticado"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'materials' AND auth.role() = 'authenticated');

CREATE POLICY "materials-storage: exclusão por autenticado"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'materials' AND auth.role() = 'authenticated');
