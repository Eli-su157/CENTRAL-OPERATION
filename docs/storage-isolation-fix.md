# Fix de isolamento — Supabase Storage

## Problema

Buckets `task-attachments` e `materials` têm policies que só checam
`auth.role() = 'authenticated'`. Qualquer usuário autenticado de qualquer
operação acessa arquivos de qualquer outra.

---

## REGRA DE FERRO

- Tudo via **migration nova** (numerada na sequência das existentes). NUNCA
  editar migration antiga.
- NÃO quebrar upload/download das operações existentes. Testar leitura E
  escrita após cada policy.
- Usar `get_my_operation_id()` (SECURITY DEFINER) para obter a operação do
  usuário dentro das policies.
- `storage.objects` expõe o path em `name` e o bucket em `bucket_id`. O
  primeiro segmento do path é obtido via `split_part(name, '/', 1)` — SQL
  padrão, sem dependência de extension. `storage.foldername` não foi
  confirmado neste projeto; não usar.
- Usar `DROP POLICY IF EXISTS` (não `DROP POLICY`) — padrão já adotado no
  `_ALL_IN_ORDER.sql` do projeto.

---

## FATOS DO REPO (verificados no schema real)

| Fato | Valor confirmado |
|------|-----------------|
| Próxima migration | `0019_storage_isolation.sql` |
| Tabela de tarefas | `public.tasks` |
| Coluna PK de tarefas | `tasks.id` (UUID) |
| Coluna operação em tarefas | `tasks.operation_id` (UUID) |
| task_id no path de task-attachments corresponde a tasks.id? | **SIM** — `TaskDetail.tsx:95` constrói o path como `` `${task.id}/${Date.now()}-${file.name}` ``, portanto o primeiro segmento é exatamente o UUID de `tasks.id` |
| Formato do path em **materials** | `` `${operationId}/${dashboardId ?? 'global'}/${Date.now()}-${file.name}` `` — primeiro segmento é o `operation_id` (confirmado em `MaterialForm.tsx:60`) |
| Formato do path em **task-attachments** | `` `${task.id}/${timestamp}-${filename}` `` — primeiro segmento é o `task_id` (UUID) |
| `storage.foldername(name)` disponível? | **NÃO USAR** — não aparece em nenhuma migration do projeto. Usar `split_part(name, '/', 1)` — SQL padrão PostgreSQL, portável, confirmado como abordagem oficial. |
| `utmify_queue` tem coluna `operation_id`? | **SIM** — `0011_utmify.sql:11`: `operation_id UUID NOT NULL REFERENCES operations(id)` |
| A task já existe no banco quando o anexo é subido? | **SIM** — o fluxo em `TaskDetail.tsx:88-104` faz o upload **depois** da task já existir (o componente `TaskDetail` só é renderizado para uma task existente). O `EXISTS` no INSERT funciona. |
| Leitura de `utmify_queue` na aba Dev | `dev/page.tsx:96-101` usa `supabase` (client normal). RLS habilitado sem policy = retorna vazio para autenticados. |

---

## Parte 1 — bucket `materials` (mais simples: path já tem operation_id)

**Situação atual:** 3 policies (INSERT/SELECT/DELETE) só checam
`bucket_id = 'materials' AND auth.role() = 'authenticated'`.

**Nova regra:** além do bucket, exigir que o **primeiro segmento do path**
(`split_part(name, '/', 1)`) seja o UUID da operação do usuário.

```sql
-- DROP defensivo (IF EXISTS, padrão do projeto)
DROP POLICY IF EXISTS "materials-storage: upload por autenticado"   ON storage.objects;
DROP POLICY IF EXISTS "materials-storage: leitura por autenticado"  ON storage.objects;
DROP POLICY IF EXISTS "materials-storage: exclusão por autenticado" ON storage.objects;

-- INSERT
CREATE POLICY "materials-storage: upload por membro da operação"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'materials'
    AND split_part(name, '/', 1) = get_my_operation_id()::text
  );

-- SELECT
CREATE POLICY "materials-storage: leitura por membro da operação"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'materials'
    AND split_part(name, '/', 1) = get_my_operation_id()::text
  );

-- DELETE
CREATE POLICY "materials-storage: exclusão por membro da operação"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'materials'
    AND split_part(name, '/', 1) = get_my_operation_id()::text
  );
```

**Sobre o cast:** `get_my_operation_id()` retorna `UUID`; `split_part` retorna `TEXT`. Comparação como `::text` é deliberada — evita erro de cast se o primeiro segmento do path for malformado (policy simplesmente nega ao invés de lançar exceção). Um UUID malformado nunca vai igualar um UUID válido em texto.

**Por que funciona:** `MaterialForm.tsx:60` sempre constrói o path como
`{operationId}/...`, então `split_part(name, '/', 1)` devolve exatamente
o `operation_id` do usuário que fez o upload.

**Sem UPDATE policy:** nenhum código do app edita objetos no lugar; o fluxo
de "atualizar material" deleta o antigo e sobe um novo.

---

## Parte 2 — bucket `task-attachments` (validar via JOIN, sem migrar path)

**Situação atual:** 3 policies (INSERT/SELECT/DELETE) só checam
`bucket_id = 'task-attachments' AND auth.role() = 'authenticated'`.

**Estrutura do path:** `{task_id}/{timestamp}-{filename}`
— `split_part(name, '/', 1)` retorna o UUID da task.

**Nova regra:** a policy confirma que existe uma row em `public.tasks` com
`id` igual ao primeiro segmento e `operation_id` igual à operação do usuário.

```sql
-- DROP defensivo (IF EXISTS, padrão do projeto)
DROP POLICY IF EXISTS "storage: upload por membro autenticado"    ON storage.objects;
DROP POLICY IF EXISTS "storage: leitura por membro autenticado"   ON storage.objects;
DROP POLICY IF EXISTS "storage: exclusão por membro autenticado"  ON storage.objects;

-- INSERT
CREATE POLICY "task-attachments: upload por membro da operação"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'task-attachments'
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id::text = split_part(name, '/', 1)
        AND t.operation_id = get_my_operation_id()
    )
  );

-- SELECT
CREATE POLICY "task-attachments: leitura por membro da operação"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'task-attachments'
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id::text = split_part(name, '/', 1)
        AND t.operation_id = get_my_operation_id()
    )
  );

-- DELETE
CREATE POLICY "task-attachments: exclusão por membro da operação"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'task-attachments'
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id::text = split_part(name, '/', 1)
        AND t.operation_id = get_my_operation_id()
    )
  );
```

**Nota sobre INSERT:** a task **já existe** no banco antes do upload
(`TaskDetail` só é montado para tasks existentes), portanto o `EXISTS`
resolve corretamente no momento do INSERT.

**Nota sobre leitura (download):** a aba edição (`edicao/page.tsx:160`) e
a aba dev (`dev/page.tsx:150`) usam `admin.storage.from('task-attachments').createSignedUrls(...)`,
ou seja, o **service role contorna a policy de SELECT** — esse caminho não
quebra. A policy de SELECT protege acesso direto via client autenticado.

---

## Parte 3 — `utmify_queue` (bug funcional, não segurança)

**Causa:** RLS habilitado sem nenhuma policy → cliente normal sempre recebe
vazio. A aba Dev lê com `supabase` (client anônimo/autenticado, não admin).

**`utmify_queue` TEM `operation_id`** (confirmado). Duas opções:

### Opção A — Policy SELECT restrita a dev/liderança (recomendada)
`can_see_dev()` já existe (SECURITY DEFINER, `0007_dev_monitoring.sql`) e
cobre exatamente quem acessa a aba Dev (`role IN ('dono','head') OR sector = 'dev'`).
Criar policy de SELECT em `utmify_queue` usando essa função:

```sql
CREATE POLICY "utmify_queue: leitura por dev/liderança"
  ON utmify_queue FOR SELECT
  USING (operation_id = get_my_operation_id() AND can_see_dev());
```

Vantagem: sem mudança de código TypeScript; acesso restrito a quem já tem
acesso à aba Dev; reutiliza função existente.

### Opção B — Trocar para admin client no servidor
Em `dev/page.tsx:96-101`, substituir `supabase` por `admin` (service role).
Vantagem: sem migration nova.
Desvantagem: mistura leituras de service role com client normal no mesmo
Server Component — consistência pior.

**Decisão:** Opção A é a certa. `can_see_dev()` já existe e cobre o
escopo correto. Nenhum código TypeScript precisa mudar.

**Tratar por último, isolado das partes de segurança.**

---

## Arquivos / passos (1 microtask cada)

1. **`docs/storage-isolation-fix.md`** — este documento. ✅
2. **Migration `0019_storage_isolation.sql`** — policies do `materials` (Parte 1) + policies do `task-attachments` (Parte 2) em uma única migration.
3. **Fix do `utmify_queue`** na aba Dev — Parte 3 (migration separada ou mudança de código, dependendo da decisão A vs B).
4. **Teste manual guiado** + verificação.

> As Partes 1 e 2 podem ir na **mesma migration** (`0019`) pois são
> independentes entre si e ambas são necessárias para fechar o isolamento.
> A Parte 3 é um bug funcional sem impacto de segurança cross-tenant e
> vai em migration `0020` (ou patch de código).

---

## Checklist final

- [ ] Migration nova (`0019`), nenhuma antiga editada
- [ ] `materials`: dono SÓ acessa arquivos da própria operação; upload e download seguem funcionando
- [ ] `task-attachments`: idem, validado via JOIN com `public.tasks`
- [ ] Nenhum fluxo de upload/download das operações existentes quebrou
- [ ] `utmify_queue`: aba Dev volta a mostrar dados (sem expor de outros tenants)
- [ ] `get_my_operation_id()` usado corretamente nas policies
- [ ] `split_part` confirmado como extração de segmento (não usar `storage.foldername`)
