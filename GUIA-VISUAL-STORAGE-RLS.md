# 🎨 GUIA VISUAL: Configurar Storage RLS

## 🎯 Objetivo

Configurar políticas RLS no Supabase Storage para permitir upload de arquivos.

---

## 📍 PASSO 1: Acessar Supabase Dashboard

```
https://supabase.com/dashboard
↓
Selecionar projeto: "NoCry Finance"
↓
Menu lateral: "Storage"
```

---

## 📍 PASSO 2: Criar Bucket (se não existir)

### 2.1. Verificar se bucket existe

```
Storage → Buckets
↓
Procurar: "offers-files"
```

**Se EXISTIR**: Pule para PASSO 3

**Se NÃO EXISTIR**: Continue abaixo

---

### 2.2. Criar novo bucket

```
Clicar: [New bucket]
↓
Preencher formulário:
  ┌─────────────────────────────────┐
  │ Name: offers-files              │
  │                                 │
  │ ☑️ Public bucket                │  ← DESMARCAR
  │ ✅ Private bucket               │  ← MARCAR
  │                                 │
  │ File size limit: (default)      │
  │ Allowed MIME types: (default)   │
  └─────────────────────────────────┘
↓
Clicar: [Create bucket]
```

**Resultado**: Bucket `offers-files` criado (privado)

---

## 📍 PASSO 3: Configurar Políticas RLS

### 3.1. Acessar políticas

```
Storage → offers-files
↓
Aba: "Policies"
↓
Clicar: [New policy]
```

---

### 3.2. Criar Política 1: INSERT (Upload)

```
┌──────────────────────────────────────────┐
│ Policy name:                             │
│ Usuários autenticados podem fazer upload│
│                                          │
│ Allowed operation: INSERT                │ ← Selecionar
│                                          │
│ Target roles: authenticated              │ ← Selecionar
│                                          │
│ Policy definition (WITH CHECK):          │
│ ┌──────────────────────────────────────┐ │
│ │ bucket_id = 'offers-files'           │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ [Save policy]                            │
└──────────────────────────────────────────┘
```

**OU via SQL**:
```sql
CREATE POLICY "Usuários autenticados podem fazer upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'offers-files'
);
```

---

### 3.3. Criar Política 2: SELECT (Download)

```
┌──────────────────────────────────────────┐
│ Policy name:                             │
│ Usuários autenticados podem baixar      │
│                                          │
│ Allowed operation: SELECT                │ ← Selecionar
│                                          │
│ Target roles: authenticated              │ ← Selecionar
│                                          │
│ Policy definition (USING):               │
│ ┌──────────────────────────────────────┐ │
│ │ bucket_id = 'offers-files'           │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ [Save policy]                            │
└──────────────────────────────────────────┘
```

**OU via SQL**:
```sql
CREATE POLICY "Usuários autenticados podem baixar"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'offers-files'
);
```

---

### 3.4. Criar Política 3: UPDATE (Atualizar)

```
┌──────────────────────────────────────────┐
│ Policy name:                             │
│ Usuários autenticados podem atualizar   │
│                                          │
│ Allowed operation: UPDATE                │ ← Selecionar
│                                          │
│ Target roles: authenticated              │ ← Selecionar
│                                          │
│ Policy definition (USING):               │
│ ┌──────────────────────────────────────┐ │
│ │ bucket_id = 'offers-files'           │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ Policy definition (WITH CHECK):          │
│ ┌──────────────────────────────────────┐ │
│ │ bucket_id = 'offers-files'           │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ [Save policy]                            │
└──────────────────────────────────────────┘
```

**OU via SQL**:
```sql
CREATE POLICY "Usuários autenticados podem atualizar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'offers-files')
WITH CHECK (bucket_id = 'offers-files');
```

---

### 3.5. Criar Política 4: DELETE (Deletar)

```
┌──────────────────────────────────────────┐
│ Policy name:                             │
│ Usuários autenticados podem deletar     │
│                                          │
│ Allowed operation: DELETE                │ ← Selecionar
│                                          │
│ Target roles: authenticated              │ ← Selecionar
│                                          │
│ Policy definition (USING):               │
│ ┌──────────────────────────────────────┐ │
│ │ bucket_id = 'offers-files'           │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ [Save policy]                            │
└──────────────────────────────────────────┘
```

**OU via SQL**:
```sql
CREATE POLICY "Usuários autenticados podem deletar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'offers-files'
);
```

---

## 📍 PASSO 4: Verificar Configuração

### 4.1. Via Dashboard

```
Storage → offers-files → Policies
↓
Deve mostrar 4 políticas:
  ✅ INSERT - Usuários autenticados podem fazer upload
  ✅ SELECT - Usuários autenticados podem baixar
  ✅ UPDATE - Usuários autenticados podem atualizar
  ✅ DELETE - Usuários autenticados podem deletar
```

---

### 4.2. Via App (Diagnóstico)

```
http://localhost:3000/diagnostics/upload
↓
Deve mostrar:
  ┌─────────────────────────────────────────┐
  │ 1. Autenticação                         │
  │    ✅ authenticated: true               │
  │    userId: abc-123-...                  │
  │                                         │
  │ 2. Storage Buckets                      │
  │    ✅ Bucket "offers-files" existe      │
  │    public: false (privado)              │
  │                                         │
  │ 3. Storage RLS Policies                 │
  │    ✅ Políticas RLS configuradas        │
  │       corretamente                      │
  │                                         │
  │ ✅ Tudo configurado!                    │
  └─────────────────────────────────────────┘
```

---

## 📍 PASSO 5: Testar Upload

### 5.1. Acessar oferta

```
http://localhost:3000/ofertas
↓
Clicar em qualquer oferta
↓
Clicar na aba: "Anexos & Comentários"
```

---

### 5.2. Fazer upload

```
Aba "Anexos"
↓
Clicar: [Upload]
↓
Selecionar arquivo (qualquer tipo)
↓
ESPERADO:
  ┌─────────────────────────────────────┐
  │ ✅ Toast: "Arquivo enviado com     │
  │    sucesso"                         │
  └─────────────────────────────────────┘
  
Console do navegador (F12):
  [UPLOAD_FILE_START] { offerId, category, fileName, key }
  [UPLOAD_FILE_SUCCESS] { offerId, category, key }
```

---

### 5.3. Preencher formulário e salvar

```
Label: "Meu arquivo de teste"
↓
Clicar: [Salvar Anexo]
↓
ESPERADO:
  ┌─────────────────────────────────────┐
  │ ✅ Toast: "Anexo salvo com sucesso"│
  └─────────────────────────────────────┘
  
Lista de anexos atualizada:
  • Meu arquivo de teste [Baixar]
```

---

## ✅ CHECKLIST VISUAL

### Configuração
```
[ ] Bucket "offers-files" criado
    └─ [ ] Marcado como PRIVADO

[ ] Política INSERT criada
    └─ [ ] Target: authenticated
    └─ [ ] WITH CHECK: bucket_id = 'offers-files'

[ ] Política SELECT criada
    └─ [ ] Target: authenticated
    └─ [ ] USING: bucket_id = 'offers-files'

[ ] Política UPDATE criada
    └─ [ ] Target: authenticated
    └─ [ ] USING + WITH CHECK: bucket_id = 'offers-files'

[ ] Política DELETE criada
    └─ [ ] Target: authenticated
    └─ [ ] USING: bucket_id = 'offers-files'
```

### Verificação
```
[ ] /diagnostics/upload mostra tudo OK
[ ] Upload de arquivo funciona
[ ] Toast de sucesso aparece
[ ] Arquivo aparece na lista
[ ] Download do arquivo funciona
```

---

## 🎨 DIAGRAMA DE FLUXO

```
┌──────────────────────────────────────────────────┐
│ 1. User clica "Upload"                           │
└────────────────┬─────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────┐
│ 2. UploadButton.tsx → uploadOfferFile()          │
└────────────────┬─────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────┐
│ 3. lib/files.ts → supabase.storage.upload()     │
│    Usa: getBrowserClient() (client-side)         │
└────────────────┬─────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────┐
│ 4. Supabase Storage verifica RLS                 │
│    ┌──────────────────────────────────┐          │
│    │ ✅ Política INSERT existe?       │          │
│    │ ✅ User está autenticado?        │          │
│    │ ✅ bucket_id = 'offers-files'?   │          │
│    └──────────────┬───────────────────┘          │
│                   │                               │
│         ┌─────────┴─────────┐                    │
│         │                   │                     │
│    ✅ Permitido      ❌ Bloqueado                │
│         │                   │                     │
└─────────┼───────────────────┼─────────────────────┘
          │                   │
          ▼                   ▼
┌──────────────────┐  ┌────────────────────────────┐
│ Upload OK        │  │ Erro: "new row violates    │
│ Arquivo salvo    │  │ row-level security policy" │
│ no Storage       │  │                            │
└────────┬─────────┘  └────────────────────────────┘
         │
┌────────▼─────────────────────────────────────────┐
│ 5. onUploaded() callback → setFileKey(key)       │
└────────┬─────────────────────────────────────────┘
         │
┌────────▼─────────────────────────────────────────┐
│ 6. User clica "Salvar" no formulário             │
└────────┬─────────────────────────────────────────┘
         │
┌────────▼─────────────────────────────────────────┐
│ 7. Server Action salva no banco                  │
│    INSERT INTO offer_attachments                 │
│    (org_id, offer_id, file_url, ...)             │
│    VALUES (..., key, ...)                        │
└──────────────────────────────────────────────────┘
```

**Erro RLS acontece no PASSO 4** (Storage, não banco).

---

## 🚨 TROUBLESHOOTING VISUAL

### Erro: "Erro de permissão no Storage"

```
❌ Sintoma:
   Toast: "Erro de permissão no Storage. Configure as políticas RLS..."
   
🔍 Causa:
   Política INSERT não existe ou está incorreta
   
✅ Solução:
   1. Ir para: Storage → offers-files → Policies
   2. Verificar se existe política INSERT
   3. Verificar: Target = authenticated
   4. Verificar: WITH CHECK = bucket_id = 'offers-files'
```

---

### Erro: "Bucket not found"

```
❌ Sintoma:
   Toast: "Crie o bucket 'offers-files' no Supabase Storage..."
   
🔍 Causa:
   Bucket não existe
   
✅ Solução:
   1. Ir para: Storage → Buckets
   2. Criar bucket: "offers-files" (privado)
```

---

### Erro: Upload funciona mas não salva no banco

```
❌ Sintoma:
   Toast: "Arquivo enviado com sucesso"
   Mas ao clicar "Salvar": "Erro ao salvar anexo"
   
🔍 Causa:
   RLS do banco (offers.offer_attachments) bloqueando
   
✅ Solução:
   Problema diferente - ver CORRECOES-RLS.md
```

---

## 🎉 RESULTADO FINAL

### Estado Correto

```
┌─────────────────────────────────────────────┐
│ Supabase Storage                            │
│                                             │
│ Bucket: offers-files (privado)              │
│                                             │
│ Policies (4):                               │
│   ✅ INSERT  - authenticated                │
│   ✅ SELECT  - authenticated                │
│   ✅ UPDATE  - authenticated                │
│   ✅ DELETE  - authenticated                │
│                                             │
│ Files:                                      │
│   📁 {offer-id}/                            │
│       📁 attachments/                       │
│           📄 123-abc-arquivo.pdf            │
│       📁 creatives_original/                │
│           📄 456-def-video.mp4              │
│       📁 bonuses/                           │
│           📄 789-ghi-ebook.zip              │
└─────────────────────────────────────────────┘
```

---

## 📖 DOCUMENTOS RELACIONADOS

| Documento | Quando Usar |
|-----------|-------------|
| `GUIA-VISUAL-STORAGE-RLS.md` | Guia visual passo-a-passo (este arquivo) |
| `SOLUCAO-RAPIDA-UPLOAD.md` | Solução rápida copy/paste |
| `DIAGNOSTICO-UPLOAD-RLS.md` | Explicação técnica detalhada |
| `RESUMO-DIAGNOSTICO-UPLOAD.md` | Resumo executivo |
| `/diagnostics/upload` | Diagnóstico automático no app |

---

## ✅ PRONTO!

Após seguir este guia, o upload de arquivos deve funcionar perfeitamente! 🎉




