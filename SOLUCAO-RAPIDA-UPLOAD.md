# ⚡ SOLUÇÃO RÁPIDA: Erro RLS no Upload

## 🎯 Problema

```
Erro ao enviar arquivo: new row violates row-level security policy
```

---

## ✅ SOLUÇÃO EM 2 PASSOS

### PASSO 1: Criar Bucket (se não existir)

**Via Dashboard:**
1. Ir para: https://supabase.com/dashboard/project/[SEU-PROJECT]/storage/buckets
2. Clicar em **"New bucket"**
3. Nome: `offers-files`
4. ✅ Marcar **"Private"** (Privado)
5. Criar

---

### PASSO 2: Configurar Políticas RLS do Storage

**Via Dashboard:**
1. Ir para: Storage → `offers-files` → **Policies**
2. Clicar em **"New policy"**
3. Adicionar as 4 políticas abaixo (copiar e colar no SQL Editor)

---

## 📋 POLÍTICAS RLS (Copiar e Colar)

### Política 1: INSERT (Upload)

```sql
CREATE POLICY "Usuários autenticados podem fazer upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'offers-files'
);
```

---

### Política 2: SELECT (Download)

```sql
CREATE POLICY "Usuários autenticados podem baixar"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'offers-files'
);
```

---

### Política 3: UPDATE (Atualizar)

```sql
CREATE POLICY "Usuários autenticados podem atualizar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'offers-files'
)
WITH CHECK (
  bucket_id = 'offers-files'
);
```

---

### Política 4: DELETE (Deletar)

```sql
CREATE POLICY "Usuários autenticados podem deletar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'offers-files'
);
```

---

## 🧪 TESTE

1. **Fazer login** no app
2. **Ir para página de diagnóstico**: `/diagnostics/upload`
3. **Verificar status**:
   - ✅ Bucket existe
   - ✅ Políticas RLS configuradas

4. **Testar upload real**:
   - Ir para uma oferta → Tab **"Anexos"**
   - Clicar em **"Upload"**
   - Selecionar arquivo
   - ✅ Deve mostrar: "Arquivo enviado com sucesso"

---

## 🔍 DIAGNÓSTICO

Se o erro persistir, verifique:

1. **Console do navegador** (F12):
   ```
   [UPLOAD_FILE_START] { offerId, category, fileName, key }
   [UPLOAD_FILE_ERROR] { error: { message, statusCode } }
   ```

2. **Página de diagnóstico**: `/diagnostics/upload`
   - Mostra status do bucket e RLS

---

## 📚 DOCS COMPLETAS

Ver: `DIAGNOSTICO-UPLOAD-RLS.md` (instruções detalhadas)

---

## ✅ CHECKLIST

- [ ] Bucket `offers-files` criado (privado)
- [ ] Política INSERT configurada
- [ ] Política SELECT configurada
- [ ] Política UPDATE configurada
- [ ] Política DELETE configurada
- [ ] Testado upload via app
- [ ] Upload funciona sem erro

---

## 🎉 PRONTO!

Após configurar as 4 políticas, o upload deve funcionar perfeitamente!




