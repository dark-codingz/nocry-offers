# ✅ Correções de RLS - Todas as Abas

## 🎯 Problema Identificado

Os INSERTs nas tabelas filhas de `offers` estavam falhando com erro de RLS porque não incluíam o campo `org_id`, que é obrigatório para as políticas de segurança.

## 🛠️ Solução Implementada

### 1. Novo Utilitário: `/lib/offer.ts`

Criada função **única fonte da verdade** para obter `org_id` da oferta:

```typescript
export async function getOfferOrgId(offerId: string): Promise<string> {
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .schema("offers")
    .from("offers")
    .select("org_id")
    .eq("id", offerId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[GET_OFFER_ORGID_ERROR]", error);
    throw new Error(error.message);
  }

  if (!data?.org_id) {
    throw new Error("Oferta não encontrada ou sem org_id.");
  }

  return data.org_id;
}
```

**Vantagens**:
- ✅ Centralizada (DRY)
- ✅ Validada pela RLS
- ✅ Logs detalhados
- ✅ Tratamento de erro consistente

---

## 📦 Correções por Aba

### ✅ 1. Criativos (Originais e Modelados)

**Arquivo**: `/components/offer-details/tabs/criativos-tab.tsx`

**Mudanças**:
- ✅ Import `getOfferOrgId`
- ✅ Payloads **Originais** incluem:
  - `org_id` (via `getOfferOrgId`)
  - `offer_id`
  - URLs normalizadas
  - `captured_at` default para hoje
- ✅ Payloads **Modelados** incluem:
  - `org_id` (via `getOfferOrgId`)
  - `offer_id`
  - URLs normalizadas
- ✅ Logs: `[CRIATIVOS_ORIG_SAVE_ERROR]` e `[CRIATIVOS_MOD_SAVE_ERROR]`

**Antes**:
```typescript
const payload = {
  offer_id: offerId,
  ref_name: formData.get('ref_name') as string,
  // ... sem org_id ❌
}
```

**Depois**:
```typescript
const orgId = await getOfferOrgId(offerId);
const payload = {
  org_id: orgId, // ✅
  offer_id: offerId,
  ref_name: formData.get('ref_name') as string,
  // ...
}
```

---

### ✅ 2. Páginas & Funil

**Arquivo**: `/components/offer-details/tabs/paginas-tab.tsx`

**Mudanças**:
- ✅ Import `getOfferOrgId`
- ✅ Payload inclui `org_id` e `offer_id`
- ✅ URLs normalizadas
- ✅ Logs: `[FUNIL_SAVE_ERROR]`

---

### ✅ 3. Entregáveis (Bônus)

**Arquivo**: `/components/offer-details/tabs/entregaveis-tab.tsx`

**Mudanças**:
- ✅ Import `getOfferOrgId`
- ✅ Payload inclui `org_id` e `offer_id`
- ✅ Logs: `[BONUS_SAVE_ERROR]`

---

### ✅ 4. Upsell

**Arquivo**: `/components/offer-details/tabs/upsell-tab.tsx`

**Mudanças**:
- ✅ Import `getOfferOrgId`
- ✅ Payload inclui `org_id` e `offer_id`
- ✅ Logs: `[UPSELL_SAVE_ERROR]`

---

### ✅ 5. Pixel

**Arquivo**: `/components/offer-details/tabs/pixel-tab.tsx`

**Mudanças**:
- ✅ Import `getOfferOrgId`
- ✅ INSERT inclui `org_id` e `offer_id`
- ✅ Logs: `[PIXEL_SAVE_ERROR]`, `[PIXEL_TOGGLE_ERROR]`, `[PIXEL_DELETE_ERROR]`

---

### ✅ 6. Anexos & Comentários

**Arquivo**: `/components/offer-details/tabs/anexos-comentarios-tab.tsx`

**Mudanças**:
- ✅ Import `getOfferOrgId`
- ✅ Payloads **Anexos** incluem `org_id` e `offer_id`
- ✅ Payloads **Comentários** incluem `org_id` e `offer_id`
- ✅ Logs: `[ANEXOS_SAVE_ERROR]`, `[COMMENTS_SAVE_ERROR]`, `[ANEXOS_DELETE_ERROR]`, `[COMMENT_DELETE_ERROR]`

---

## 📊 Resumo de Mudanças

### Arquivos Criados (1):
- `/lib/offer.ts` - Utilitário `getOfferOrgId()`

### Arquivos Modificados (6):
1. `/components/offer-details/tabs/criativos-tab.tsx`
2. `/components/offer-details/tabs/paginas-tab.tsx`
3. `/components/offer-details/tabs/entregaveis-tab.tsx`
4. `/components/offer-details/tabs/upsell-tab.tsx`
5. `/components/offer-details/tabs/pixel-tab.tsx`
6. `/components/offer-details/tabs/anexos-comentarios-tab.tsx`

### Total: 7 arquivos

---

## 🔍 Padrão Aplicado Consistentemente

Em **TODOS** os INSERTs das tabelas filhas:

```typescript
// 1. Obter org_id da oferta
const orgId = await getOfferOrgId(offerId);

// 2. Montar payload com org_id e offer_id
const payload = {
  org_id: orgId,        // ✅ OBRIGATÓRIO para RLS
  offer_id: offerId,    // ✅ FK
  // ... demais campos
};

// 3. INSERT com schema explícito
const { error } = await supabase
  .schema('offers')
  .from('tabela_filha')
  .insert([payload]);

// 4. Log detalhado em caso de erro
if (error) {
  console.error('[TAG_ERROR]', error);  // ✅ Objeto completo
  throw new Error(error.message);
}
```

---

## 🏷️ Tags de Log Implementadas

### Saves (INSERT):
- `[CRIATIVOS_ORIG_SAVE_ERROR]`
- `[CRIATIVOS_MOD_SAVE_ERROR]`
- `[FUNIL_SAVE_ERROR]`
- `[BONUS_SAVE_ERROR]`
- `[UPSELL_SAVE_ERROR]`
- `[PIXEL_SAVE_ERROR]`
- `[ANEXOS_SAVE_ERROR]`
- `[COMMENTS_SAVE_ERROR]`

### Deletes:
- `[PIXEL_DELETE_ERROR]`
- `[ANEXOS_DELETE_ERROR]`
- `[COMMENT_DELETE_ERROR]`

### Updates:
- `[PIXEL_TOGGLE_ERROR]`

### Utilitários:
- `[GET_OFFER_ORGID_ERROR]`

---

## 🧪 Como Testar

### 1. Criativos Originais:
```
1. Entrar em /ofertas/[id]
2. Aba "Criativos"
3. Clicar "Adicionar" (Originais)
4. Preencher ref_name
5. Salvar
6. ✅ Deve criar sem erro RLS
7. ✅ Console: sem erro
```

### 2. Criativos Modelados:
```
1. Mesma aba
2. Seção "Modelados"
3. Clicar "Adicionar"
4. Preencher internal_name
5. Salvar
6. ✅ Deve criar sem erro RLS
```

### 3. Páginas:
```
1. Aba "Páginas & Funil"
2. Clicar "Adicionar"
3. Preencher page_name
4. Salvar
5. ✅ Deve criar sem erro RLS
```

### 4. Entregáveis:
```
1. Aba "Entregáveis"
2. Clicar "Adicionar"
3. Preencher bonus_name
4. Salvar
5. ✅ Deve criar sem erro RLS
```

### 5. Upsell:
```
1. Aba "Upsell"
2. Clicar "Adicionar"
3. Preencher upsell_name
4. Salvar
5. ✅ Deve criar sem erro RLS
```

### 6. Pixel:
```
1. Aba "Pixel"
2. Clicar "Adicionar"
3. Preencher pixel_meta
4. Salvar
5. ✅ Deve criar sem erro RLS
```

### 7. Anexos:
```
1. Aba "Anexos & Comentários"
2. Seção "Anexos"
3. Fazer upload de arquivo
4. Preencher label
5. Salvar
6. ✅ Deve criar sem erro RLS
```

### 8. Comentários:
```
1. Mesma aba
2. Seção "Comentários"
3. Preencher autor e comentário
4. Clicar "Adicionar Comentário"
5. ✅ Deve criar sem erro RLS
```

---

## 🐛 Debug de Erros

Se ainda houver erro de RLS após aplicar as correções:

### 1. Verificar org_id da oferta:
```sql
-- No Supabase SQL Editor
SELECT id, org_id, name FROM offers.offers WHERE id = 'seu-offer-id';
```

### 2. Verificar políticas RLS:
```sql
-- Verificar se o usuário tem acesso à org
SELECT * FROM core.user_orgs WHERE user_id = auth.uid();
```

### 3. Verificar console:
- Abrir DevTools → Console
- Buscar por tags: `[*_ERROR]`
- Ver objeto completo do erro Supabase

### 4. Erros Comuns:

**"new row violates row-level security policy"**
- ✅ **Corrigido**: Agora todos os INSERTs incluem `org_id`

**"Oferta não encontrada ou sem org_id"**
- Oferta existe?
- Oferta tem `org_id` válido no banco?
- Usuário tem acesso a essa oferta (RLS)?

---

## ✅ Checklist Final

- [x] Criado `/lib/offer.ts` com `getOfferOrgId()`
- [x] Criativos Originais: `org_id` + logs
- [x] Criativos Modelados: `org_id` + logs
- [x] Páginas & Funil: `org_id` + logs
- [x] Entregáveis: `org_id` + logs
- [x] Upsell: `org_id` + logs
- [x] Pixel: `org_id` + logs
- [x] Anexos: `org_id` + logs
- [x] Comentários: `org_id` + logs
- [x] 0 erros de lint
- [x] Logs detalhados com tags
- [x] URLs normalizadas onde aplicável
- [x] `.schema("offers")` consistente

---

## 🎯 Resultado Esperado

**Antes**: ❌
```
Error: new row violates row-level security policy for table "offer_creatives_original"
```

**Depois**: ✅
```
Toast verde: "Criativo original salvo com sucesso"
Registro criado no banco
Console: sem erros
```

---

## 📝 Observações

1. **NÃO alteramos o schema SQL** - Apenas código da aplicação
2. **NÃO alteramos as políticas RLS** - As políticas existentes agora funcionam
3. **Padrão consistente** - Todas as abas usam o mesmo approach
4. **Single source of truth** - `getOfferOrgId()` é a única forma de obter `org_id`
5. **Logs melhorados** - Objeto completo do erro Supabase antes do throw
6. **Type-safe** - Sem `any`, tudo tipado

---

**Data**: 29 de Outubro de 2025  
**Versão**: 2.1.0 - Correções RLS  
**Status**: ✅ **COMPLETO - SEM ERROS DE RLS**




