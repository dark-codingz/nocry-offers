# ✅ Resumo das Correções Aplicadas

## 🎯 Objetivo Alcançado
Corrigir todos os problemas reportados **SEM alterar o schema SQL nem a Auth**.

---

## 🔧 Correções Implementadas

### 1. ✅ RLS Errors (Criativos e Entregáveis)
**Antes**: "new row violates row-level security policy"

**Depois**:
- Todas as operações via **Server Actions** (`app/ofertas/[id]/actions.ts`)
- Helper `getOfferOrgId()` para obter `org_id` validado pela RLS
- Todos os payloads incluem `org_id` e `offer_id`
- Logs com payload completo: `console.log('[TAG_PAYLOAD]', payload)`

---

### 2. ✅ Entregáveis: file_or_link Obrigatório
**Antes**: Campo opcional causava erros

**Depois**:
- Validação client-side: toast se vazio
- Validação server-side: throw Error se vazio
- Mensagem clara: "Envie o arquivo ou cole um link"

---

### 3. ✅ Reset de Formulários
**Antes**: "Cannot read properties of null (reading 'reset')"

**Depois**:
```typescript
// Padrão aplicado em todas as tabs
const formEl = e.currentTarget as HTMLFormElement | null
formEl?.reset()
```

**Arquivos corrigidos**:
- `paginas-tab.tsx`
- `criativos-tab.tsx` (2 lugares)
- `entregaveis-tab.tsx`
- `anexos-comentarios-tab.tsx`
- `upsell-tab.tsx` (já estava OK)

---

### 4. ✅ Pixel: UPSERT Error
**Antes**: "there is no unique or exclusion constraint..."

**Depois**:
```typescript
// SELECT → UPDATE | INSERT
const { data: existing } = await supabase
  .schema('offers').from('offer_pixel')
  .select('id').eq('offer_id', offerId).maybeSingle()

if (existing?.id) {
  // UPDATE
} else {
  // INSERT
}
```

**Token**:
- ✅ Visível (`type="text"`)
- ✅ Botão "Copiar" com `navigator.clipboard.writeText()`

---

### 5. ✅ URLs Inteligentes
**Antes**: `site.com/...` não funcionava

**Depois**:
```typescript
// Automático em todas as Server Actions
export function normalizeUrl(input?: string|null) {
  const url = (input ?? '').trim()
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `https://${url}` // ← completa automaticamente
}
```

**Aplicado em**:
- `ad_library_url`, `original_funnel_url`, `spy_tool_url`
- `ad_link`, `preview_url`, `meta_ads_link`, `asset_url`
- `page_link`, `file_or_link`, etc.

---

### 6. ✅ Logs Completos
**Antes**: Objetos vazios `{}`

**Depois**:
```typescript
// Payload antes do INSERT
console.log('[CREATE_ORIG_PAYLOAD]', payload)

// Erro completo do Supabase
if (error) {
  console.error('[CRIATIVOS_ORIG_SAVE_ERROR]', error)
  throw new Error(error.message)
}
```

**Tags organizadas**:
- `[CREATE_ORIG_PAYLOAD]` → `[CRIATIVOS_ORIG_SAVE_ERROR]`
- `[CREATE_MOD_PAYLOAD]` → `[CRIATIVOS_MOD_SAVE_ERROR]`
- `[FUNIL_PAYLOAD]` → `[FUNIL_SAVE_ERROR]`
- `[BONUS_PAYLOAD]` → `[BONUS_SAVE_ERROR]`
- `[UPSELL_PAYLOAD]` → `[UPSELL_SAVE_ERROR]`
- `[PIXEL_PAYLOAD]` → `[PIXEL_SELECT_ERROR]` / `[PIXEL_UPDATE_ERROR]` / `[PIXEL_INSERT_ERROR]`
- `[ANEXO_PAYLOAD]` → `[ANEXOS_SAVE_ERROR]`
- `[COMMENT_PAYLOAD]` → `[COMMENTS_SAVE_ERROR]`

---

## 📂 Arquivos Modificados

### Server Actions (App Router)
```
app/ofertas/[id]/
└── actions.ts ← Todas as operações de INSERT/UPDATE/DELETE
```

### Helpers
```
lib/
├── offer.ts     ← getOfferOrgId(offerId)
├── url.ts       ← normalizeUrl(input)
└── supabase/
    └── server.ts ← getServerClient() (já OK)
```

### Client Components (Tabs)
```
components/offer-details/tabs/
├── resumo-tab.tsx              ← URLs normalizadas
├── criativos-tab.tsx           ← Reset seguro
├── paginas-tab.tsx             ← Reset seguro
├── entregaveis-tab.tsx         ← Validação obrigatória + Reset
├── upsell-tab.tsx              ← Reset seguro
├── pixel-tab.tsx               ← Token visível (já OK)
└── anexos-comentarios-tab.tsx  ← Reset seguro
```

---

## 🧪 Como Testar

### 1. Criativos
```
1. Abrir /ofertas/[id] → tab Criativos
2. Upload arquivo → preencher form → Salvar
3. ✅ Deve salvar sem erro RLS
4. ✅ Console: [CREATE_ORIG_PAYLOAD] { org_id, offer_id, ... }
```

### 2. Entregáveis
```
1. Tab Entregáveis → Adicionar
2. NÃO fazer upload → clicar Salvar
3. ✅ Toast: "Envie um arquivo ou cole um link"
4. Upload → Salvar
5. ✅ Deve salvar sem erro RLS
```

### 3. Páginas
```
1. Tab Páginas → Adicionar
2. Preencher Título/URL/Notas → Salvar
3. ✅ Deve salvar sem erro de reset
4. ✅ URL normalizada: site.com → https://site.com
```

### 4. Pixel
```
1. Tab Pixel → Adicionar
2. Preencher → Salvar
3. ✅ Deve salvar (SELECT → UPDATE | INSERT)
4. ✅ Token visível e copiável
```

### 5. URLs
```
1. Qualquer tab com URL
2. Colar: facebook.com/ads/library/...
3. Salvar
4. ✅ Deve virar: https://facebook.com/ads/library/...
```

---

## 🔍 Debug com Logs

### Console do Navegador (DevTools)
```javascript
// Antes de enviar para Server Action
[CREATE_ORIG_PAYLOAD] {
  org_id: "uuid-aqui",
  offer_id: "uuid-oferta",
  ref_name: "Criativo 1",
  ad_link: "https://facebook.com/...",
  format: "Video",
  preview_url: "storage-key-aqui",
  captured_at: "2025-10-29",
  notes: null
}
```

### Terminal do Next.js (Servidor)
```bash
# Se der erro RLS
[CRIATIVOS_ORIG_SAVE_ERROR] {
  code: "42501",
  message: "new row violates row-level security policy",
  details: "Failing row contains ...",
  hint: "Check RLS policies"
}
```

**O que fazer se ainda der RLS**:
1. Verificar `core.user_orgs` retorna `org_id` para o usuário
2. Confirmar usuário está em `core.squad_members`
3. Verificar políticas RLS no Supabase Dashboard

---

## ✅ Checklist Final

- [x] RLS corrigido (org_id + offer_id em todos os INSERTs)
- [x] file_or_link obrigatório em Entregáveis
- [x] Reset seguro em todos os formulários
- [x] Pixel com SELECT → UPDATE | INSERT
- [x] Token visível e copiável
- [x] URLs normalizadas automaticamente
- [x] Logs claros com payloads e erros completos
- [x] **0 alterações no schema SQL**
- [x] **0 alterações na Auth**
- [x] **0 erros de lint reais** (só config do ESLint)

---

## 📊 Resultado

| Problema | Status | Solução |
|----------|--------|---------|
| RLS errors | ✅ Corrigido | Server Actions + org_id + offer_id |
| file_or_link obrigatório | ✅ Corrigido | Validação client + server |
| Reset de formulários | ✅ Corrigido | Reset seguro com null check |
| Pixel UPSERT | ✅ Corrigido | SELECT → UPDATE \| INSERT |
| Token do Pixel | ✅ Corrigido | type="text" + botão Copiar |
| URLs inteligentes | ✅ Corrigido | normalizeUrl() automático |
| Logs vazios | ✅ Corrigido | Logs completos com tags |

---

## 🎉 Conclusão

Todos os problemas reportados foram corrigidos seguindo as melhores práticas:
- ✅ App Router (Server Actions para mutações)
- ✅ RLS respeitada (org_id sempre presente)
- ✅ Validações client + server
- ✅ UX melhorada (toasts, resets seguros)
- ✅ Debug facilitado (logs completos)
- ✅ **SEM alterações no schema SQL**
- ✅ **SEM alterações na Auth**

**Pronto para testar em dev!** 🚀




