# 🔍 DIAGNÓSTICO: Erro RLS no Upload de Arquivos

## 🎯 Erro Reportado

```
Erro ao enviar arquivo: new row violates row-level security policy
```

## 🔎 Análise

O erro **"new row violates row-level security policy"** vindo do upload de arquivos indica que o problema está nas **políticas RLS do Supabase Storage**, não nas tabelas do banco de dados.

### Por que isso acontece?

1. **Upload para Storage acontece PRIMEIRO** (via cliente browser)
2. **Salvamento no banco acontece DEPOIS** (via Server Action)

O erro está ocorrendo na **etapa 1** (Storage), antes mesmo de chegar ao banco.

---

## ✅ Solução: Configurar RLS no Storage

### Passo 1: Criar o Bucket (se não existir)

```sql
-- No Supabase Dashboard → Storage
-- Criar bucket "offers-files"
-- ✅ Marcar como PRIVADO
```

### Passo 2: Configurar Políticas RLS do Bucket

No **Supabase Dashboard → Storage → offers-files → Policies**, adicionar:

#### 🔹 Política 1: Permitir INSERT (Upload)

```sql
-- Nome: "Usuários autenticados podem fazer upload"
-- Operação: INSERT
-- Target roles: authenticated

CREATE POLICY "Usuários autenticados podem fazer upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'offers-files'
  AND auth.role() = 'authenticated'
);
```

#### 🔹 Política 2: Permitir SELECT (Download)

```sql
-- Nome: "Usuários autenticados podem baixar"
-- Operação: SELECT
-- Target roles: authenticated

CREATE POLICY "Usuários autenticados podem baixar"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'offers-files'
  AND auth.role() = 'authenticated'
);
```

#### 🔹 Política 3: Permitir UPDATE (Opcional)

```sql
-- Nome: "Usuários autenticados podem atualizar"
-- Operação: UPDATE
-- Target roles: authenticated

CREATE POLICY "Usuários autenticados podem atualizar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'offers-files'
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'offers-files'
  AND auth.role() = 'authenticated'
);
```

#### 🔹 Política 4: Permitir DELETE (Opcional)

```sql
-- Nome: "Usuários autenticados podem deletar"
-- Operação: DELETE
-- Target roles: authenticated

CREATE POLICY "Usuários autenticados podem deletar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'offers-files'
  AND auth.role() = 'authenticated'
);
```

---

## 🛠️ Políticas RLS Alternativas (Mais Restritivas)

Se quiser restringir para que usuários só possam fazer upload em pastas da sua própria organização:

### Upload restrito por organização

```sql
CREATE POLICY "Upload restrito por org"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'offers-files'
  AND (storage.foldername(name))[1] IN (
    SELECT o.id::text
    FROM offers.offers o
    INNER JOIN core.squad_members sm ON sm.squad_id = ANY(
      SELECT squad_id FROM core.squads WHERE org_id = o.org_id
    )
    WHERE sm.user_id = auth.uid()
  )
);
```

**Mas recomendo começar com as políticas simples acima!**

---

## 🧪 Teste Rápido

Após configurar as políticas:

1. **Login** no app
2. **Ir para uma oferta** → Tab "Anexos"
3. **Clicar em "Upload"** e selecionar arquivo
4. **Verificar console** do navegador:
   - ✅ Sucesso: "Arquivo enviado com sucesso"
   - ❌ Erro: ver mensagem específica

---

## 🔍 Logs de Debug

Para facilitar o diagnóstico, os logs aparecem em:

**Console do Navegador** (F12):
```
[UPLOAD_ERROR] Error: new row violates...
```

**Console do Servidor** (terminal):
```
[CREATE_ATTACHMENT_PAYLOAD] { userId, offerId, payload }
[CREATE_ATTACHMENT_DB_ERROR] (se houver erro no banco)
```

---

## ✅ Checklist de Verificação

- [ ] Bucket `offers-files` existe
- [ ] Bucket está marcado como PRIVADO
- [ ] Política de INSERT (upload) configurada
- [ ] Política de SELECT (download) configurada
- [ ] Usuário está logado ao fazer upload
- [ ] Console do navegador mostra logs claros

---

## 📖 Documentação Oficial

- [Supabase Storage RLS](https://supabase.com/docs/guides/storage/security/access-control)
- [Storage Policies](https://supabase.com/docs/guides/storage/security/access-control#policy-examples)

---

## 🎉 Resumo

**Causa**: Faltam políticas RLS no bucket `offers-files` do Storage.

**Solução**: Adicionar políticas para `INSERT`, `SELECT`, `UPDATE`, `DELETE` permitindo `authenticated`.

**Resultado Esperado**: Upload funcionando sem erro de RLS.




