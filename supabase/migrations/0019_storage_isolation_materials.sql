-- ============================================================
-- 0019 — Isolamento cross-tenant: bucket materials
-- ============================================================
-- Substitui as 3 policies do bucket 'materials' que só checavam
-- auth.role()='authenticated' por policies que exigem que o
-- primeiro segmento do path seja o operation_id do usuário logado.
--
-- Path atual (MaterialForm.tsx:60):
--   {operationId}/{dashboardId|'global'}/{timestamp}-{filename}
-- split_part(name, '/', 1) extrai o operationId.
--
-- Leitura (download) já usa admin client (service role) no servidor
-- via createSignedUrls — esse caminho não é afetado pelas policies.
-- ============================================================

-- DROP das policies antigas (IF EXISTS: idempotente)
DROP POLICY IF EXISTS "materials-storage: upload por autenticado"   ON storage.objects;
DROP POLICY IF EXISTS "materials-storage: leitura por autenticado"  ON storage.objects;
DROP POLICY IF EXISTS "materials-storage: exclusão por autenticado" ON storage.objects;

-- INSERT: só membros da operação dona do primeiro segmento do path
CREATE POLICY "materials-storage: upload por membro da operação"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'materials'
    AND split_part(name, '/', 1) = get_my_operation_id()::text
  );

-- SELECT: mesma regra (protege acesso direto via client autenticado;
-- signed URLs geradas pelo service role contornam esta policy intencionalmente)
CREATE POLICY "materials-storage: leitura por membro da operação"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'materials'
    AND split_part(name, '/', 1) = get_my_operation_id()::text
  );

-- DELETE: mesma regra
CREATE POLICY "materials-storage: exclusão por membro da operação"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'materials'
    AND split_part(name, '/', 1) = get_my_operation_id()::text
  );
