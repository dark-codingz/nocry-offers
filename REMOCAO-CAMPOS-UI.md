# ✅ REMOÇÃO DE CAMPOS DA UI

## 🎯 Objetivo

Remover campos de link e taxa de conversão da UI e Server Actions, **SEM alterar o schema SQL nem RLS**.

---

## 📋 Campos Removidos

### 1. **Criativos Originais** - Campo `ad_link`
- ❌ Input "Link do Anúncio"
- ❌ Coluna/exibição de link na listagem
- ❌ Campo `ad_link` no DTO
- ❌ Campo `ad_link` no payload do banco

### 2. **Criativos Modelados** - Campo `meta_ads_link`
- ❌ Input "Link Meta Ads"
- ❌ Coluna/exibição de link na listagem
- ❌ Campo `meta_ads_link` no DTO
- ❌ Campo `meta_ads_link` no payload do banco

### 3. **Upsell** - Campo `conv_rate`
- ❌ Input "Taxa de Conversão (%)"
- ❌ Exibição de taxa de conversão na listagem
- ❌ Campo `conv_rate` no DTO
- ❌ Campo `conv_rate` no payload do banco

---

## 📂 Arquivos Modificados

### 1. `/components/offer-details/tabs/criativos-tab.tsx`

#### **Criativos Originais**

**DTO (linha ~75)**:
```typescript
// ANTES
const dto = {
  ref_name: formData.get('ref_name') as string,
  format: formData.get('format') as string,
  ad_link: (formData.get('ad_link') as string) || undefined, // ❌ REMOVIDO
  copy: (formData.get('copy') as string) || undefined,
  preview_url: previewUrlKey || undefined,
  captured_at: (formData.get('captured_at') as string) || undefined,
  notes: (formData.get('notes') as string) || undefined,
}

// DEPOIS
const dto = {
  ref_name: formData.get('ref_name') as string,
  format: formData.get('format') as string,
  copy: (formData.get('copy') as string) || undefined,
  preview_url: previewUrlKey || undefined,
  captured_at: (formData.get('captured_at') as string) || undefined,
  notes: (formData.get('notes') as string) || undefined,
}
```

**Formulário (linha ~220)**:
```tsx
<!-- REMOVIDO -->
<div className="space-y-2">
  <Label htmlFor="ad_link">Link do Anúncio</Label>
  <Input
    id="ad_link"
    name="ad_link"
    placeholder="facebook.com/ads/library/..."
  />
</div>
```

**Listagem (linha ~298)**:
```tsx
<!-- REMOVIDO -->
{criativo.ad_link && (
  <a href={criativo.ad_link} target="_blank" rel="noopener noreferrer"
     className="text-blue-600 hover:underline">
    Ver Anúncio
  </a>
)}
```

---

#### **Criativos Modelados**

**DTO (linha ~114)**:
```typescript
// ANTES
const dto = {
  internal_name: formData.get('internal_name') as string,
  meta_ads_link: (formData.get('meta_ads_link') as string) || undefined, // ❌ REMOVIDO
  asset_url: assetUrlKey || undefined,
  copy: (formData.get('copy') as string) || undefined,
  status: (formData.get('status') as string) || undefined,
  notes: (formData.get('notes') as string) || undefined,
}

// DEPOIS
const dto = {
  internal_name: formData.get('internal_name') as string,
  asset_url: assetUrlKey || undefined,
  copy: (formData.get('copy') as string) || undefined,
  status: (formData.get('status') as string) || undefined,
  notes: (formData.get('notes') as string) || undefined,
}
```

**Formulário (linha ~358)**:
```tsx
<!-- REMOVIDO -->
<div className="space-y-2">
  <Label htmlFor="meta_ads_link">Link Meta Ads</Label>
  <Input
    id="meta_ads_link"
    name="meta_ads_link"
    placeholder="business.facebook.com/..."
  />
</div>
```

**Listagem (linha ~444)**:
```tsx
<!-- REMOVIDO -->
{criativo.meta_ads_link && (
  <a href={criativo.meta_ads_link} target="_blank" rel="noopener noreferrer"
     className="text-blue-600 hover:underline">
    Meta Ads
  </a>
)}
```

---

### 2. `/components/offer-details/tabs/upsell-tab.tsx`

**DTO (linha ~54)**:
```typescript
// ANTES
const price = formData.get('price') as string
const convRate = formData.get('conv_rate') as string // ❌ REMOVIDO

const dto = {
  name: formData.get('name') as string,
  price: price ? parseFloat(price) : undefined,
  page_link: (formData.get('page_link') as string) || undefined,
  short_desc: (formData.get('short_desc') as string) || undefined,
  conv_rate: convRate ? parseFloat(convRate) : undefined, // ❌ REMOVIDO
  notes: (formData.get('notes') as string) || undefined,
}

// DEPOIS
const price = formData.get('price') as string

const dto = {
  name: formData.get('name') as string,
  price: price ? parseFloat(price) : undefined,
  page_link: (formData.get('page_link') as string) || undefined,
  short_desc: (formData.get('short_desc') as string) || undefined,
  notes: (formData.get('notes') as string) || undefined,
}
```

**Formulário (linha ~172)**:
```tsx
<!-- REMOVIDO -->
<div className="space-y-2">
  <Label htmlFor="conv_rate">Taxa de Conversão (%)</Label>
  <Input
    id="conv_rate"
    name="conv_rate"
    type="number"
    step="0.01"
    placeholder="15.50"
    min="0"
    max="100"
  />
</div>
```

**Listagem (linha ~209)**:
```tsx
<!-- REMOVIDO -->
{upsell.conv_rate !== null && upsell.conv_rate !== undefined && (
  <span className="text-xs text-muted-foreground">
    Conv: {upsell.conv_rate.toFixed(2)}%
  </span>
)}
```

---

### 3. `/app/(protected)/ofertas/[id]/actions.ts`

#### **saCreateCreativeOriginal** (linha ~13)

```typescript
// ANTES
export async function saCreateCreativeOriginal(
  offerId: string,
  dto: {
    ref_name: string
    format: string
    ad_link?: string  // ❌ REMOVIDO
    copy?: string
    preview_url?: string
    captured_at?: string
    notes?: string
  }
): Promise<Result<boolean>> {
  // ...
  const payload = {
    org_id: orgId,
    offer_id: offerId,
    ref_name: dto.ref_name,
    format: dto.format,
    ad_link: dto.ad_link ? normalizeUrl(dto.ad_link) : null,  // ❌ REMOVIDO
    copy: dto.copy || null,
    preview_url: dto.preview_url || null,
    captured_at: dto.captured_at || new Date().toISOString().slice(0, 10),
    notes: dto.notes || null,
  }
}

// DEPOIS
export async function saCreateCreativeOriginal(
  offerId: string,
  dto: {
    ref_name: string
    format: string
    copy?: string
    preview_url?: string
    captured_at?: string
    notes?: string
  }
): Promise<Result<boolean>> {
  // ...
  const payload = {
    org_id: orgId,
    offer_id: offerId,
    ref_name: dto.ref_name,
    format: dto.format,
    copy: dto.copy || null,
    preview_url: dto.preview_url || null,
    captured_at: dto.captured_at || new Date().toISOString().slice(0, 10),
    notes: dto.notes || null,
  }
}
```

---

#### **createCreativeOriginal** (linha ~158)

```typescript
// ANTES
export async function createCreativeOriginal(offerId: string, dto: {
  ref_name: string
  ad_link?: string  // ❌ REMOVIDO
  format: string
  copy?: string
  preview_url?: string
  captured_at?: string
  notes?: string
}) {
  // ...
  const payload = {
    org_id: orgId,
    offer_id: offerId,
    ref_name: dto.ref_name,
    ad_link: dto.ad_link ? normalizeUrl(dto.ad_link) : null,  // ❌ REMOVIDO
    format: dto.format,
    copy: dto.copy || null,
    preview_url: dto.preview_url || null,
    captured_at: dto.captured_at || new Date().toISOString().slice(0, 10),
    notes: dto.notes || null,
  }
}

// DEPOIS
export async function createCreativeOriginal(offerId: string, dto: {
  ref_name: string
  format: string
  copy?: string
  preview_url?: string
  captured_at?: string
  notes?: string
}) {
  // ...
  const payload = {
    org_id: orgId,
    offer_id: offerId,
    ref_name: dto.ref_name,
    format: dto.format,
    copy: dto.copy || null,
    preview_url: dto.preview_url || null,
    captured_at: dto.captured_at || new Date().toISOString().slice(0, 10),
    notes: dto.notes || null,
  }
}
```

---

#### **createCreativeModeled** (linha ~226)

```typescript
// ANTES
export async function createCreativeModeled(offerId: string, dto: {
  internal_name: string
  meta_ads_link?: string  // ❌ REMOVIDO
  asset_url?: string
  copy?: string
  status?: string
  notes?: string
}) {
  // ...
  const payload = {
    org_id: orgId,
    offer_id: offerId,
    internal_name: dto.internal_name,
    meta_ads_link: dto.meta_ads_link ? normalizeUrl(dto.meta_ads_link) : null,  // ❌ REMOVIDO
    asset_url: dto.asset_url || null,
    copy: dto.copy || null,
    status: dto.status || null,
    notes: dto.notes || null,
  }
}

// DEPOIS
export async function createCreativeModeled(offerId: string, dto: {
  internal_name: string
  asset_url?: string
  copy?: string
  status?: string
  notes?: string
}) {
  // ...
  const payload = {
    org_id: orgId,
    offer_id: offerId,
    internal_name: dto.internal_name,
    asset_url: dto.asset_url || null,
    copy: dto.copy || null,
    status: dto.status || null,
    notes: dto.notes || null,
  }
}
```

---

#### **createUpsell** (linha ~413)

```typescript
// ANTES
export async function createUpsell(offerId: string, dto: {
  name: string
  price?: number
  page_link?: string
  short_desc?: string
  conv_rate?: number  // ❌ REMOVIDO
  notes?: string
}) {
  // ...
  const payload = {
    org_id: orgId,
    offer_id: offerId,
    name: dto.name,
    price: dto.price ?? null,
    page_link: dto.page_link ? normalizeUrl(dto.page_link) : null,
    short_desc: dto.short_desc || null,
    conv_rate: dto.conv_rate ?? null,  // ❌ REMOVIDO
    notes: dto.notes || null,
  }
}

// DEPOIS
export async function createUpsell(offerId: string, dto: {
  name: string
  price?: number
  page_link?: string
  short_desc?: string
  notes?: string
}) {
  // ...
  const payload = {
    org_id: orgId,
    offer_id: offerId,
    name: dto.name,
    price: dto.price ?? null,
    page_link: dto.page_link ? normalizeUrl(dto.page_link) : null,
    short_desc: dto.short_desc || null,
    notes: dto.notes || null,
  }
}
```

---

## ✅ Validações Removidas

- ❌ Validação de URL para `ad_link` (criativos originais)
- ❌ Validação de URL para `meta_ads_link` (criativos modelados)
- ❌ Validação de número para `conv_rate` (upsell)
- ❌ Normalização de URL via `normalizeUrl()` para campos removidos

---

## 🧪 Testes Esperados

### **Criativos Originais**
```
1. Abrir oferta → Tab "Criativos"
2. Clicar em "Adicionar" (Originais)
3. Verificar:
   ✅ Campo "Link do Anúncio" NÃO aparece
   ✅ Campos obrigatórios: "Nome de Referência", "Formato"
4. Preencher e salvar:
   ✅ Salva sem erro
   ✅ Listagem NÃO mostra link
```

### **Criativos Modelados**
```
1. Tab "Criativos" → Seção "Criativos Modelados"
2. Clicar em "Adicionar"
3. Verificar:
   ✅ Campo "Link Meta Ads" NÃO aparece
   ✅ Campo obrigatório: "Nome Interno"
4. Preencher e salvar:
   ✅ Salva sem erro
   ✅ Listagem NÃO mostra link Meta Ads
```

### **Upsell**
```
1. Abrir oferta → Tab "Upsell"
2. Clicar em "Adicionar"
3. Verificar:
   ✅ Campo "Taxa de Conversão (%)" NÃO aparece
   ✅ Campos: Nome (obrigatório), Preço, Link, Descrição, Notas
4. Preencher e salvar:
   ✅ Salva sem erro
   ✅ Listagem NÃO mostra taxa de conversão
```

---

## 📊 Comparação: Antes x Depois

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Criativos Originais** | 7 campos (com ad_link) | 6 campos |
| **Criativos Modelados** | 6 campos (com meta_ads_link) | 5 campos |
| **Upsell** | 6 campos (com conv_rate) | 5 campos |
| **Validações** | URLs + número | Somente campos restantes |
| **Payloads** | Incluíam campos removidos | Limpos |

---

## 🔍 Campos Existentes no Banco

**IMPORTANTE**: Os campos **ainda existem** no schema SQL:
- `offers.offer_creatives_original.ad_link`
- `offers.offer_creatives_modeled.meta_ads_link`
- `offers.offer_upsells.conv_rate`

**Comportamento**:
- ✅ Novos registros: campos ficam `null` (permitido)
- ✅ Registros antigos: valores preservados no banco (mas não exibidos na UI)
- ✅ RLS: não alterada

---

## ✅ Checklist Final

### Código
- [x] Campos removidos dos DTOs
- [x] Campos removidos dos payloads
- [x] Inputs removidos dos formulários
- [x] Colunas removidas das listagens
- [x] Validações ajustadas
- [x] Normalização de URL removida para campos deletados
- [x] TypeScript sem erros
- [x] ESLint sem erros

### Server Actions
- [x] `saCreateCreativeOriginal` - sem `ad_link`
- [x] `createCreativeOriginal` - sem `ad_link`
- [x] `createCreativeModeled` - sem `meta_ads_link`
- [x] `createUpsell` - sem `conv_rate`

### UI
- [x] `criativos-tab.tsx` - campos removidos
- [x] `upsell-tab.tsx` - campo removido

---

## 🎉 Resultado Final

**SEM alterar schema SQL nem RLS**:
- ✅ UI simplificada (menos campos)
- ✅ DTOs limpos (sem campos desnecessários)
- ✅ Payloads corretos (apenas campos usados)
- ✅ Código mais limpo e mantível
- ✅ Backwards compatible (registros antigos preservados)

---

**Data**: 29 de outubro de 2025

**Status**: ✅ **Implementação completa**

**Arquivos modificados**: 3
- `components/offer-details/tabs/criativos-tab.tsx`
- `components/offer-details/tabs/upsell-tab.tsx`
- `app/(protected)/ofertas/[id]/actions.ts`

🎯 **Pronto para testes!**




