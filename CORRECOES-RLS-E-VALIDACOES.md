# Correções RLS e Validações - Aplicadas

## 📋 Resumo das Correções

Todas as correções foram aplicadas com sucesso **sem alterar o schema SQL nem a Auth**.

---

## ✅ Problemas Corrigidos

### 1. **RLS Errors em Criativos e Entregáveis**
**Problema**: "new row violates row-level security policy"

**Solução Aplicada**:
- ✅ Todas as operações de INSERT/UPDATE agora usam **Server Actions**
- ✅ Cada Server Action obtém `org_id` via `getOfferOrgId(offerId)`
- ✅ Payloads sempre incluem `org_id` e `offer_id`
- ✅ Logs com `console.log('[TAG_PAYLOAD]', payload)` para debug

**Arquivos Modificados**:
- `app/ofertas/[id]/actions.ts`: Server Actions centralizadas
- `lib/offer.ts`: Helper `getOfferOrgId()` para obter org_id

---

### 2. **Entregáveis: file_or_link Obrigatório**
**Problema**: Campo não validado como obrigatório

**Solução Aplicada**:
- ✅ Validação client-side antes do submit
- ✅ Validação server-side na Server Action `createBonus()`
- ✅ Toast de erro: "Envie o arquivo ou cole um link"

**Arquivos Modificados**:
- `components/offer-details/tabs/entregaveis-tab.tsx` (linhas 59-63)
- `app/ofertas/[id]/actions.ts` (linhas 152-155)

```typescript
// Client (entregaveis-tab.tsx)
if (!fileKey || !fileKey.trim()) {
  showToast('Envie um arquivo ou cole um link', 'error')
  return
}

// Server (actions.ts)
if (!dto.file_or_link || !dto.file_or_link.trim()) {
  throw new Error('Envie o arquivo ou cole um link.')
}
```

---

### 3. **Páginas: Erro de Reset**
**Problema**: "Cannot read properties of null (reading 'reset')"

**Solução Aplicada**:
- ✅ Reset seguro com verificação de nulidade
- ✅ Aplicado em todas as tabs com formulários

**Padrão Aplicado**:
```typescript
// Reset seguro
const formEl = e.currentTarget as HTMLFormElement | null
formEl?.reset()
```

**Arquivos Modificados**:
- `components/offer-details/tabs/paginas-tab.tsx` (linhas 69-71)
- `components/offer-details/tabs/criativos-tab.tsx` (linhas 95-97, 131-133)
- `components/offer-details/tabs/entregaveis-tab.tsx` (linhas 86-88)
- `components/offer-details/tabs/anexos-comentarios-tab.tsx` (linhas 94-96)
- `components/offer-details/tabs/upsell-tab.tsx` (já estava correto)

---

### 4. **Pixel: Erro de UPSERT**
**Problema**: "there is no unique or exclusion constraint matching the ON CONFLICT specification"

**Solução Aplicada**:
- ✅ Substituído `upsert` por lógica `SELECT → UPDATE | INSERT`
- ✅ Token visível (`type="text"`) com botão "Copiar"
- ✅ `navigator.clipboard.writeText()` para copiar token

**Arquivos Modificados**:
- `app/ofertas/[id]/actions.ts` (linhas 246-301)
- `components/offer-details/tabs/pixel-tab.tsx` (já estava correto)

```typescript
// Server Action (savePixel)
const { data: existing } = await supabase
  .schema('offers').from('offer_pixel')
  .select('id').eq('offer_id', offerId).limit(1).maybeSingle()

if (existing?.id) {
  // UPDATE
  await supabase.schema('offers').from('offer_pixel')
    .update({ ...dto, org_id: orgId }).eq('id', existing.id)
} else {
  // INSERT
  await supabase.schema('offers').from('offer_pixel')
    .insert({ org_id: orgId, offer_id: offerId, ...dto })
}
```

---

### 5. **URLs Inteligentes**
**Problema**: URLs sem `https://` não eram completadas

**Solução Aplicada**:
- ✅ `normalizeUrl()` aplicado em todas as Server Actions
- ✅ Completa automaticamente com `https://` se não tiver protocolo
- ✅ Mantém protocolo existente se já estiver presente

**Helper Utilizado** (`lib/url.ts`):
```typescript
export function normalizeUrl(input?: string|null) {
  const url = (input ?? '').trim()
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `https://${url}`
}
```

**Aplicado em**:
- `ad_library_url`, `original_funnel_url`, `spy_tool_url`
- `ad_link`, `preview_url`, `meta_ads_link`, `asset_url`
- `page_link`, `file_or_link`, etc.

---

### 6. **Logs Melhorados**
**Problema**: Logs não mostravam o erro real

**Solução Aplicada**:
- ✅ `console.log('[TAG_PAYLOAD]', payload)` antes de cada INSERT
- ✅ `console.error('[TAG_ERROR]', error)` com objeto completo do Supabase
- ✅ Tags organizadas por operação

**Padrão de Logs**:
```typescript
console.log('[CREATE_ORIG_PAYLOAD]', payload)
const { error } = await supabase.schema('offers').from('...').insert(payload)
if (error) {
  console.error('[CRIATIVOS_ORIG_SAVE_ERROR]', error)
  throw new Error(error.message)
}
```

**Tags por Operação**:
- `[CREATE_ORIG_PAYLOAD]` / `[CRIATIVOS_ORIG_SAVE_ERROR]`
- `[CREATE_MOD_PAYLOAD]` / `[CRIATIVOS_MOD_SAVE_ERROR]`
- `[FUNIL_PAYLOAD]` / `[FUNIL_SAVE_ERROR]`
- `[BONUS_PAYLOAD]` / `[BONUS_SAVE_ERROR]`
- `[UPSELL_PAYLOAD]` / `[UPSELL_SAVE_ERROR]`
- `[PIXEL_PAYLOAD]` / `[PIXEL_SELECT_ERROR]` / `[PIXEL_UPDATE_ERROR]` / `[PIXEL_INSERT_ERROR]`
- `[ANEXO_PAYLOAD]` / `[ANEXOS_SAVE_ERROR]`
- `[COMMENT_PAYLOAD]` / `[COMMENTS_SAVE_ERROR]`

---

## 📂 Estrutura de Arquivos Modificados

### Server-Side (App Router)
```
app/ofertas/[id]/
└── actions.ts ← Server Actions centralizadas
```

### Helpers
```
lib/
├── offer.ts     ← getOfferOrgId()
├── url.ts       ← normalizeUrl()
└── supabase/
    └── server.ts ← getServerClient() (já estava correto)
```

### Client Components (Tabs)
```
components/offer-details/tabs/
├── resumo-tab.tsx              ← URLs normalizadas
├── criativos-tab.tsx           ← Reset seguro + Server Actions
├── paginas-tab.tsx             ← Reset seguro
├── entregaveis-tab.tsx         ← Validação obrigatória + Reset seguro
├── upsell-tab.tsx              ← Reset seguro (já estava OK)
├── pixel-tab.tsx               ← Token visível + Copiar (já estava OK)
└── anexos-comentarios-tab.tsx  ← Reset seguro
```

---

## 🧪 Testes Esperados

### 1. Criativos (Originais e Modelados)
- ✅ Upload → key do Storage → Server Action insere com `org_id` e `offer_id`
- ✅ Sem erro de RLS
- ✅ URLs normalizadas (`ad_link`, `meta_ads_link`)
- ✅ Reset seguro após salvar

### 2. Entregáveis
- ✅ Bloqueia submit se `file_or_link` estiver vazio
- ✅ Toast: "Envie um arquivo ou cole um link"
- ✅ Server Action valida novamente
- ✅ Insere com `org_id` e `offer_id`

### 3. Páginas
- ✅ Formulário simplificado (Título/URL/Notas)
- ✅ Salva sem erro de reset
- ✅ URLs normalizadas

### 4. Pixel
- ✅ Salva com SELECT → UPDATE | INSERT
- ✅ Token visível e copiável
- ✅ Badge "Ativo/Inativo"

### 5. Upsell
- ✅ Salva com `org_id` e `offer_id`
- ✅ URLs normalizadas (`page_link`)
- ✅ Reset seguro

### 6. Anexos
- ✅ Upload → key → Server Action insere
- ✅ Reset seguro

### 7. Comentários
- ✅ Salva com `org_id` e `offer_id`
- ✅ Validação de autor e body

---

## 🔍 Como Debugar com os Novos Logs

### No Navegador (DevTools Console)
```
[CREATE_ORIG_PAYLOAD] { org_id: "...", offer_id: "...", ref_name: "..." }
```

### No Servidor (Terminal do Next.js)
```
[CRIATIVOS_ORIG_SAVE_ERROR] {
  code: "42501",
  message: "new row violates row-level security policy",
  details: "...",
  hint: "..."
}
```

### Se aparecer erro RLS mesmo após correções:
1. Verifique que o usuário pertence à organização (via `core.squad_members`)
2. Confirme que a view `core.user_orgs` está retornando `org_id`
3. Verifique políticas RLS no Supabase Dashboard

---

## ✅ Checklist de Verificação

- [x] RLS errors corrigidos (org_id + offer_id em todos os payloads)
- [x] file_or_link obrigatório em Entregáveis
- [x] Reset seguro em todos os formulários
- [x] Pixel com SELECT → UPDATE | INSERT
- [x] Token visível e copiável
- [x] URLs normalizadas automaticamente
- [x] Logs claros com tags específicas
- [x] Sem erros de lint
- [x] Sem alterações no schema SQL
- [x] Sem alterações na Auth

---

## 📌 Próximos Passos (Opcional)

1. **Testar em dev** com dados reais
2. **Verificar políticas RLS** no Supabase se ainda houver erro
3. **Adicionar testes automatizados** para Server Actions
4. **Documentar fluxo de upload** de arquivos no README

---

**Status**: ✅ **Todas as correções aplicadas com sucesso**
**Data**: 29 de outubro de 2025
**Sem alterações no schema SQL nem Auth**




