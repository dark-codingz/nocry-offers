# 🧪 Guia de Teste - RLS Corrigido

## ⚡ Teste Rápido (3 minutos)

### Pré-requisito
```bash
npm run dev
# Abrir terminal separado para ver logs do servidor
```

---

## 1️⃣ Criativos Originais

### Passo a Passo
```
1. Login → /ofertas
2. Abrir qualquer oferta
3. Tab "Criativos"
4. Clicar "+ Criativo original"
5. Preencher:
   - Ref Name: "Teste RLS 1"
   - Format: "Video"
   - Ad Link: facebook.com/ads
   (opcional: fazer upload)
6. Clicar "Salvar"
```

### ✅ Resultado Esperado

**Console do Servidor** (Terminal Next.js):
```javascript
[SA_CREATE_ORIG] {
  userId: "abc123-...",
  offerId: "def456-...",
  payload: {
    org_id: "org-uuid-aqui",
    offer_id: "def456-...",
    ref_name: "Teste RLS 1",
    format: "Video",
    ad_link: "https://facebook.com/ads", // ← normalizado
    preview_url: null, // ou "storage-key" se fez upload
    captured_at: "2025-10-29",
    copy: null,
    notes: null
  }
}
```

**Console do Navegador** (DevTools):
```javascript
// Deve mostrar o mesmo log (ou similar)
```

**UI**:
- ✅ Toast verde: "Criativo original salvo com sucesso"
- ✅ Lista atualizada com novo criativo
- ✅ Formulário limpo (reset seguro)

**❌ NÃO deve aparecer**:
- `[SA_CREATE_ORIG_ERROR] { code: "42501", message: "...RLS policy..." }`
- Toast vermelho com erro RLS

---

## 2️⃣ Entregáveis

### Passo a Passo
```
1. Tab "Entregáveis"
2. Clicar "Adicionar"
3. Preencher APENAS:
   - Título: "Teste"
   - Descrição: "Teste desc"
   - Tipo: "PDF"
4. NÃO fazer upload
5. Clicar "Salvar"
```

### ✅ Resultado Esperado (1ª tentativa)
- ✅ Toast laranja: "Envie um arquivo ou cole um link"
- ✅ Formulário NÃO envia

```
6. Fazer upload de qualquer arquivo
7. Clicar "Salvar" novamente
```

### ✅ Resultado Esperado (2ª tentativa)

**Console do Servidor**:
```javascript
[SA_CREATE_BONUS] {
  userId: "abc123-...",
  offerId: "def456-...",
  payload: {
    org_id: "org-uuid-aqui",
    offer_id: "def456-...",
    title: "Teste",
    short_desc: "Teste desc",
    content_type: "PDF",
    file_or_link: "offer-id/bonuses/uuid-filename.pdf", // ← KEY do Storage
    perceived_value: null,
    notes: null
  }
}
```

**UI**:
- ✅ Toast verde: "Entregável salvo com sucesso"
- ✅ Lista atualizada
- ✅ Link "Baixar" funciona

**❌ NÃO deve aparecer**:
- `[SA_CREATE_BONUS_ERROR] { code: "42501", ... }`

---

## 3️⃣ Anexos

### Passo a Passo
```
1. Tab "Anexos & Comentários"
2. Seção "Anexos"
3. Clicar "Upload arquivo"
4. Escolher qualquer arquivo
5. Label: "Teste Anexo"
6. Salvar
```

### ✅ Resultado Esperado

**Console do Servidor**:
```javascript
[SA_CREATE_ATTACHMENT] {
  userId: "abc123-...",
  offerId: "def456-...",
  payload: {
    org_id: "org-uuid-aqui",
    offer_id: "def456-...",
    file_url: "offer-id/attachments/uuid-filename.pdf", // ← KEY
    label: "Teste Anexo"
  }
}
```

**UI**:
- ✅ Toast verde: "Anexo salvo com sucesso"
- ✅ Lista atualizada
- ✅ Link "Baixar" funciona

**❌ NÃO deve aparecer**:
- `[SA_CREATE_ATTACHMENT_ERROR] { code: "42501", ... }`

---

## 🔍 Verificação de Logs

### O que procurar no Console do Servidor

**Logs de Sucesso** (bom sinal):
```bash
[SA_CREATE_ORIG] { userId: "...", offerId: "...", payload: {...} }
[SA_CREATE_BONUS] { userId: "...", offerId: "...", payload: {...} }
[SA_CREATE_ATTACHMENT] { userId: "...", offerId: "...", payload: {...} }
```

**Logs de Erro** (investigar):
```bash
[SA_CREATE_ORIG_ERROR] {
  code: "42501",
  message: "new row violates row-level security policy",
  ...
}
```

---

## 🐛 Se Ainda Der Erro RLS

### 1. Verificar Payload
No log `[SA_CREATE_ORIG]`, confirmar que:
- ✅ `userId` está presente e não é `null`
- ✅ `payload.org_id` está presente e não é `null`
- ✅ `payload.offer_id` está presente e não é `null`

### 2. Verificar Usuário na Org
No **Supabase SQL Editor**:

```sql
-- Verificar org do usuário
SELECT * FROM core.user_orgs WHERE user_id = 'seu-user-id';
```

**Esperado**: Deve retornar ao menos 1 linha com `org_id`.

**Se retornar vazio**:
```sql
-- Verificar se usuário está em algum squad
SELECT sm.*, s.org_id, s.name as squad_name, o.name as org_name
FROM core.squad_members sm
JOIN core.squads s ON s.id = sm.squad_id
JOIN core.orgs o ON o.id = s.org_id
WHERE sm.user_id = 'seu-user-id';
```

**Se ainda retornar vazio** → Usuário não está vinculado a nenhuma org/squad:
```sql
-- Adicionar usuário a um squad (dev/test)
INSERT INTO core.squad_members (squad_id, user_id)
SELECT s.id, 'seu-user-id'
FROM core.squads s
WHERE s.org_id = 'org-id-nocry'
LIMIT 1;
```

### 3. Verificar Políticas RLS
No **Supabase Dashboard** → Table Editor → `offer_creatives_original` (ou outra):

**Policies**:
- ✅ Deve ter policy de INSERT permitindo usuários da mesma org
- ✅ Policy deve checar `org_id` da linha contra org do usuário

**Exemplo de Policy**:
```sql
-- Policy: "Users can insert creatives for their org"
CREATE POLICY "insert_own_org" ON offers.offer_creatives_original
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM core.user_orgs WHERE user_id = auth.uid()
    )
  );
```

---

## 📊 Checklist de Validação

### Criativos Originais
- [ ] Log `[SA_CREATE_ORIG]` aparece no servidor
- [ ] Payload contém `org_id` e `offer_id`
- [ ] Toast verde de sucesso
- [ ] Lista atualizada
- [ ] SEM erro RLS

### Entregáveis
- [ ] Validação impede envio sem arquivo
- [ ] Log `[SA_CREATE_BONUS]` aparece
- [ ] Payload contém `org_id`, `offer_id` e `file_or_link`
- [ ] Toast verde de sucesso
- [ ] Lista atualizada
- [ ] SEM erro RLS

### Anexos
- [ ] Log `[SA_CREATE_ATTACHMENT]` aparece
- [ ] Payload contém `org_id`, `offer_id` e `file_url`
- [ ] Toast verde de sucesso
- [ ] Link "Baixar" funciona
- [ ] SEM erro RLS

---

## ✅ Resultado Final Esperado

| Item | Status |
|------|--------|
| Criativos salvam | ✅ Sem erro RLS |
| Entregáveis salvam | ✅ Sem erro RLS |
| Anexos salvam | ✅ Sem erro RLS |
| Logs completos | ✅ userId + payload |
| URLs normalizadas | ✅ `site.com` → `https://site.com` |
| Validações funcionam | ✅ Client + Server |
| Schema SQL | ✅ Não alterado |
| Auth | ✅ Não alterada |

---

## 🎉 Sucesso!

Se todos os testes passarem:
- ✅ **RLS corrigido definitivamente**
- ✅ **Logs completos para debug futuro**
- ✅ **Pronto para produção**

**Tempo total de teste**: ~3 minutos

**Próximos passos**:
1. Testar com dados reais em dev
2. Code review (se aplicável)
3. Deploy para staging/prod




