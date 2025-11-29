# 🎨 Editor Visual - Drag & Drop e Controles de Tamanho

## 📋 Novas Funcionalidades Implementadas

### 1. 🎯 Blocos com Layout em Coluna
### 2. 🔄 Drag & Drop para Reordenar
### 3. 📏 Controles de Tamanho (Fonte e Largura)

---

## PARTE 0: Blocos com Layout em Coluna ✅

### Problema Resolvido
Antes, blocos novos (H1, P, Button, IMG) herdavam o layout do elemento pai, causando posicionamento incorreto (ex: H1 ao lado de imagem).

### Solução
Todos os blocos agora têm `display:block` ou `display:inline-block` com margens adequadas:

#### **H1 (Título)**
```html
<h1 style="display:block; margin:16px 0; font-size:2rem;">
  Novo título
</h1>
```

#### **Parágrafo**
```html
<p style="display:block; margin:12px 0; font-size:1rem;">
  Novo parágrafo de texto. Edite aqui.
</p>
```

#### **Botão**
```html
<a href="#" class="nocry-btn" style="display:inline-block; margin:16px 0; padding:12px 24px; background:#f05252; color:#ffffff; border-radius:999px; text-decoration:none; font-weight:600;">
  Novo botão
</a>
```

#### **Imagem**
```html
<img src="https://via.placeholder.com/400x250" alt="Nova imagem" style="display:block; margin:16px auto; max-width:100%; height:auto;" />
```

### Resultado
✅ Todos os blocos nascem como elementos de bloco
✅ Layout consistente e previsível
✅ Imagens centralizadas automaticamente

---

## PARTE 1: Drag & Drop para Reordenar ✅

### 1.1. Mensagens no Script do Iframe

#### **NCRY_MOVE_ELEMENT_BEFORE**
Move elemento source antes do elemento target.

```javascript
if (data.type === 'NCRY_MOVE_ELEMENT_BEFORE') {
  const { sourceId, targetId } = data.payload || {};
  const src = document.querySelector('[data-nocry-id="' + sourceId + '"]');
  const tgt = document.querySelector('[data-nocry-id="' + targetId + '"]');
  if (!src || !tgt || !tgt.parentElement) return;
  tgt.parentElement.insertBefore(src, tgt);
}
```

#### **NCRY_MOVE_ELEMENT_TO_END**
Move elemento para o final do body.

```javascript
if (data.type === 'NCRY_MOVE_ELEMENT_TO_END') {
  const { sourceId } = data.payload || {};
  const src = document.querySelector('[data-nocry-id="' + sourceId + '"]');
  if (!src) return;
  document.body.appendChild(src);
}
```

### 1.2. Tipo OutlineItem

```typescript
type OutlineItem = {
  elementId: string    // data-nocry-id
  tagName: string      // 'h1', 'p', 'button', etc
  textPreview: string  // Primeiros 60 caracteres
}
```

### 1.3. Estados Adicionados

```typescript
const [outline, setOutline] = useState<OutlineItem[]>([])
const [isDraggingId, setIsDraggingId] = useState<string | null>(null)
```

### 1.4. useEffect para Construir Outline

```typescript
useEffect(() => {
  if (!iframeLoaded || !iframeRef.current) return
  const doc = iframeRef.current.contentDocument
  if (!doc) return

  // Lista os filhos diretos do body
  const nodes = Array.from(doc.body.children) as HTMLElement[]

  const items: OutlineItem[] = nodes
    .filter((el) => el.dataset?.nocryId)
    .map((el) => {
      const text = (el.innerText || '').replace(/\s+/g, ' ').trim()
      const preview = text.slice(0, 60) + (text.length > 60 ? '…' : '')
      return {
        elementId: el.dataset.nocryId!,
        tagName: el.tagName.toLowerCase(),
        textPreview: preview || `[${el.tagName.toLowerCase()} vazio]`,
      }
    })

  setOutline(items)
}, [iframeLoaded, selectedElement])
```

**Quando atualiza:**
- Após iframe carregar
- Quando elemento é selecionado (para refletir mudanças)

### 1.5. UI do Outline

```tsx
<div className="border-b border-zinc-900 px-3 py-2 text-xs text-zinc-400">
  <div className="mb-1 text-[10px] uppercase tracking-wide text-zinc-500">
    Estrutura da página
  </div>
  <ul className="max-h-40 overflow-y-auto space-y-1">
    {outline.map((item) => (
      <li
        key={item.elementId}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', item.elementId)
          setIsDraggingId(item.elementId)
        }}
        onDragEnd={() => setIsDraggingId(null)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDropOnOutline(e, item.elementId)}
        onClick={() => handleOutlineItemClick(item.elementId)}
        className={...}
      >
        <span className="uppercase text-[9px] text-zinc-500">
          {item.tagName}
        </span>
        <span className="truncate flex-1">
          {item.textPreview}
        </span>
      </li>
    ))}
  </ul>
</div>
```

**Estados visuais:**
- Normal: `border-transparent hover:bg-zinc-900`
- Selecionado: `border-yellow-500 bg-zinc-900`
- Arrastando: `opacity-60`

### 1.6. Handlers de Drag & Drop

#### **handleDropOnOutline**
```typescript
function handleDropOnOutline(
  e: React.DragEvent<HTMLLIElement>,
  targetId: string,
) {
  e.preventDefault()
  const sourceId = e.dataTransfer.getData('text/plain')
  if (!sourceId || sourceId === targetId) return
  
  // 1) Atualiza DOM no iframe
  win.postMessage({
    type: 'NCRY_MOVE_ELEMENT_BEFORE',
    payload: { sourceId, targetId },
  }, '*')

  // 2) Atualiza lista local
  setOutline((prev) => {
    const current = [...prev]
    const fromIdx = current.findIndex((i) => i.elementId === sourceId)
    const toIdx = current.findIndex((i) => i.elementId === targetId)
    if (fromIdx === -1 || toIdx === -1) return prev
    const [moved] = current.splice(fromIdx, 1)
    current.splice(toIdx, 0, moved)
    return current
  })

  setIsDraggingId(null)
}
```

#### **handleOutlineItemClick**
```typescript
function handleOutlineItemClick(elementId: string) {
  const doc = iframeRef.current.contentDocument
  const el = doc.querySelector<HTMLElement>(`[data-nocry-id="${elementId}"]`)
  if (!el) return
  
  // Scroll suave até o elemento
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  
  // Seleciona o elemento
  el.click()
}
```

### Como Usar

1. **Ver estrutura:** Lista aparece abaixo dos blocos rápidos
2. **Arrastar:** Clique e segure em um item
3. **Soltar:** Solte sobre outro item para reordenar
4. **Clicar:** Clique em um item para selecionar e rolar até ele

---

## PARTE 2: Controles de Tamanho ✅

### 2.1. Funções Helper

#### **parsePx**
Extrai valor numérico de strings CSS.

```typescript
function parsePx(value?: string): number {
  if (!value) return 16
  const m = value.match(/([\d.]+)/)
  if (!m) return 16
  const n = parseFloat(m[1])
  return isNaN(n) ? 16 : n
}
```

**Exemplos:**
- `"16px"` → `16`
- `"2rem"` → `2`
- `"1.5em"` → `1.5`
- `undefined` → `16`

#### **clamp**
Limita valor entre min e max.

```typescript
function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}
```

**Exemplos:**
- `clamp(5, 8, 72)` → `8`
- `clamp(50, 8, 72)` → `50`
- `clamp(100, 8, 72)` → `72`

### 2.2. Estados de Tamanho

```typescript
const [fontSize, setFontSize] = useState<number | null>(null)
const [imageWidthPercent, setImageWidthPercent] = useState<number | null>(null)
```

### 2.3. useEffect para Gerenciar Tamanhos

```typescript
useEffect(() => {
  if (!selectedElement) {
    setFontSize(null)
    setImageWidthPercent(null)
    return
  }

  const kind = classifyElement(selectedElement)

  // Tamanho de fonte (para textos, botões, headings)
  if (['heading', 'button', 'badge', 'link', 'text'].includes(kind)) {
    const sz = parsePx(selectedElement.styles.fontSize)
    setFontSize(clamp(sz, 8, 72))
  } else {
    setFontSize(null)
  }

  // Largura da imagem (em %)
  if (kind === 'image') {
    const w = selectedElement.styles.width || ''
    let pct = 100
    const m = w.match(/([\d.]+)%/)
    if (m) {
      pct = parseFloat(m[1])
    }
    setImageWidthPercent(clamp(pct, 10, 100))
  } else {
    setImageWidthPercent(null)
  }
}, [selectedElement])
```

### 2.4. UI - Controle de Tamanho de Fonte

```tsx
{(() => {
  const kind = classifyElement(selectedElement)
  const canEditFontSize = ['heading', 'button', 'badge', 'link', 'text'].includes(kind)
  
  return (
    canEditFontSize && fontSize !== null && (
      <div className="space-y-2">
        <label className="block text-xs font-medium text-zinc-400">
          Tamanho da fonte ({fontSize.toFixed(0)}px)
        </label>
        <input
          type="range"
          min={8}
          max={72}
          value={fontSize}
          onChange={(e) => {
            const v = clamp(parseInt(e.target.value, 10), 8, 72)
            setFontSize(v)
            setSelectedElement((prev) =>
              prev ? {
                ...prev,
                styles: {
                  ...prev.styles,
                  fontSize: `${v}px`,
                },
              } : prev
            )
          }}
          className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-yellow-400"
        />
      </div>
    )
  )
})()}
```

**Características:**
- Range: 8px a 72px
- Label mostra valor atual
- Atualiza estado em tempo real
- Accent amarelo (tema NoCry)

### 2.5. UI - Controle de Largura de Imagem

```tsx
{(() => {
  const kind = classifyElement(selectedElement)
  
  return (
    kind === 'image' && imageWidthPercent !== null && (
      <div className="space-y-2">
        <label className="block text-xs font-medium text-zinc-400">
          Largura da imagem ({imageWidthPercent.toFixed(0)}%)
        </label>
        <input
          type="range"
          min={10}
          max={100}
          value={imageWidthPercent}
          onChange={(e) => {
            const v = clamp(parseInt(e.target.value, 10), 10, 100)
            setImageWidthPercent(v)
            setSelectedElement((prev) =>
              prev ? {
                ...prev,
                styles: {
                  ...prev.styles,
                  width: `${v}%`,
                },
              } : prev
            )
          }}
          className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-yellow-400"
        />
      </div>
    )
  )
})()}
```

**Características:**
- Range: 10% a 100%
- Label mostra valor atual
- Atualiza estado em tempo real
- Só aparece para imagens

### 2.6. Atualização de applyChanges

```typescript
function applyChanges() {
  const styles: Record<string, string> = {}
  
  if (selectedElement.styles.color) 
    styles.color = selectedElement.styles.color
  if (selectedElement.styles.backgroundColor)
    styles.backgroundColor = selectedElement.styles.backgroundColor
  if (selectedElement.styles.borderColor) 
    styles.borderColor = selectedElement.styles.borderColor
  if (selectedElement.styles.fontSize) 
    styles.fontSize = selectedElement.styles.fontSize  // ← NOVO
  if (selectedElement.styles.width) 
    styles.width = selectedElement.styles.width        // ← NOVO

  win.postMessage({
    type: 'NCRY_UPDATE_ELEMENT',
    payload: {
      elementId: selectedElement.elementId,
      innerText: selectedElement.innerText,
      styles,
    },
  }, '*')
}
```

### 2.7. Atualização do Script do Iframe

```javascript
// No NCRY_SELECT_ELEMENT, envia width também:
styles: {
  color: computed.color,
  backgroundColor: computed.backgroundColor,
  borderColor: computed.borderColor,
  borderRadius: computed.borderRadius,
  boxShadow: computed.boxShadow,
  fontSize: computed.fontSize,
  fontWeight: computed.fontWeight,
  width: computed.width  // ← NOVO
}
```

---

## 🎨 Layout Atualizado

```
┌─────────────────────────────────────────────────────────────┐
│  Blocos: [H1] [Parágrafo] [Botão] [Imagem]                 │
├─────────────────────────────────────────────────────────────┤
│  ESTRUTURA DA PÁGINA                                        │
│  ┌─────────────────────────────────────────────┐            │
│  │ h1   Novo título                            │ ← Draggable│
│  │ p    Novo parágrafo de texto. Edite aqui.  │            │
│  │ a    Novo botão                             │            │
│  │ img  [img vazio]                            │            │
│  └─────────────────────────────────────────────┘            │
├─────────────────────────────────────────────────────────────┤
│                                     │                        │
│         IFRAME                      │  h1 • HEADING         │
│      (Landing clonada)              │                        │
│                                     │  Texto: [...]          │
│                                     │  Cor: 🎨 #000          │
│                                     │                        │
│                                     │  Tamanho: 32px         │
│                                     │  ━━━━━━━●━━━━━         │
│                                     │  8px        72px       │
│                                     │                        │
│                                     │  [Aplicar alterações]  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 Testes Completos

### Teste 1: Blocos com Layout Correto
```
1. Adicione uma imagem
2. Selecione a imagem
3. Clique "H1" nos blocos rápidos
4. Verifique: H1 aparece ABAIXO da imagem (não ao lado)
5. Clique "Botão"
6. Verifique: Botão aparece ABAIXO do H1
✅ Layout em coluna funciona
```

### Teste 2: Drag & Drop Básico
```
1. Adicione H1, P, Button, IMG
2. Veja outline com 4 itens
3. Arraste "img" para cima de "h1"
4. Verifique: ordem muda no outline E no iframe
5. Salve ZIP
6. Abra HTML
7. Verifique: nova ordem está salva
✅ Drag & drop funciona
```

### Teste 3: Clicar no Outline
```
1. Adicione vários elementos
2. Role o iframe para baixo
3. Clique em um item no topo do outline
4. Verifique: iframe rola suavemente até o elemento
5. Verifique: elemento é selecionado (painel atualiza)
✅ Clique no outline funciona
```

### Teste 4: Tamanho de Fonte
```
1. Selecione um H1
2. Veja slider "Tamanho da fonte"
3. Arraste para 48px
4. Verifique: label mostra "48px"
5. Clique "Aplicar alterações"
6. Verifique: H1 fica maior no iframe
7. Salve ZIP
8. Abra HTML
9. Verifique: font-size: 48px no estilo inline
✅ Controle de fonte funciona
```

### Teste 5: Largura de Imagem
```
1. Selecione uma imagem
2. Veja slider "Largura da imagem"
3. Arraste para 50%
4. Verifique: label mostra "50%"
5. Clique "Aplicar alterações"
6. Verifique: imagem fica menor no iframe
7. Arraste para 100%
8. Aplique
9. Verifique: imagem volta ao tamanho original
✅ Controle de largura funciona
```

### Teste 6: Workflow Completo
```
1. Clone uma página
2. Adicione H1, P, Button, IMG
3. Reordene via drag & drop
4. Selecione H1
5. Mude tamanho para 36px
6. Mude cor
7. Aplique
8. Selecione imagem
9. Mude largura para 60%
10. Aplique
11. Salve ZIP
12. Extraia e abra
13. Verifique: todas as mudanças aplicadas
✅ Workflow completo funciona
```

---

## 📊 Resumo de Mensagens

| Tipo | Direção | Função |
|------|---------|--------|
| `NCRY_SELECT_ELEMENT` | Iframe → React | Notificar seleção (agora com `width`) |
| `NCRY_UPDATE_ELEMENT` | React → Iframe | Atualizar (agora com `fontSize` e `width`) |
| `NCRY_MOVE_ELEMENT_BEFORE` | React → Iframe | Mover elemento antes de outro |
| `NCRY_MOVE_ELEMENT_TO_END` | React → Iframe | Mover elemento para o final |

**Total: 9 tipos de mensagens** (7 anteriores + 2 novas)

---

## 🎯 Casos de Uso

### Caso 1: Construir Landing Estruturada
```
Cenário: Criar landing do zero com ordem específica

1. Adicione elementos na ordem: IMG, H1, P, Button
2. Veja outline refletir a estrutura
3. Arraste para reordenar se necessário
4. Ajuste tamanhos (H1: 48px, IMG: 80%)
5. Salve ZIP
```

### Caso 2: Reorganizar Landing Existente
```
Cenário: Landing tem ordem errada

1. Veja outline da estrutura atual
2. Arraste elementos para nova ordem
3. Mudanças refletem no iframe em tempo real
4. Salve ZIP com nova estrutura
```

### Caso 3: Ajuste Fino de Tipografia
```
Cenário: Títulos muito grandes ou pequenos

1. Selecione H1
2. Ajuste tamanho com slider (ex: 42px)
3. Selecione H2
4. Ajuste para 28px
5. Selecione parágrafo
6. Ajuste para 16px
7. Aplique e salve
```

### Caso 4: Responsividade de Imagens
```
Cenário: Imagens muito grandes em mobile

1. Selecione imagem hero
2. Ajuste largura para 90%
3. Selecione imagem de produto
4. Ajuste para 60%
5. Salve ZIP
```

---

## ✅ Checklist de Implementação

### PARTE 0: Blocos com Layout
- [x] Ajustar HTML do H1 (`display:block`)
- [x] Ajustar HTML do P (`display:block`)
- [x] Ajustar HTML do Button (`display:inline-block`)
- [x] Ajustar HTML do IMG (`display:block; margin:auto`)

### PARTE 1: Drag & Drop
- [x] Adicionar tipo `OutlineItem`
- [x] Adicionar estados `outline` e `isDraggingId`
- [x] Adicionar mensagem `NCRY_MOVE_ELEMENT_BEFORE`
- [x] Adicionar mensagem `NCRY_MOVE_ELEMENT_TO_END`
- [x] Criar useEffect para construir outline
- [x] Criar UI do outline com drag & drop
- [x] Criar função `handleDropOnOutline`
- [x] Criar função `handleOutlineItemClick`

### PARTE 2: Controles de Tamanho
- [x] Criar função `parsePx`
- [x] Criar função `clamp`
- [x] Adicionar estados `fontSize` e `imageWidthPercent`
- [x] Adicionar `width` ao tipo `SelectedElement`
- [x] Atualizar script para enviar `width`
- [x] Criar useEffect para gerenciar tamanhos
- [x] Criar UI de controle de fonte (range 8-72px)
- [x] Criar UI de controle de largura (range 10-100%)
- [x] Atualizar `applyChanges` para incluir `fontSize` e `width`

### Geral
- [x] Verificar lints (sem erros)
- [x] Testar drag & drop
- [x] Testar controles de tamanho
- [x] Documentar funcionalidades

---

## 🚀 Resultado Final

### Editor Visual Completo com:
- ✅ Blocos com layout em coluna
- ✅ Outline da estrutura da página
- ✅ Drag & drop para reordenar
- ✅ Clique no outline para selecionar
- ✅ Scroll automático até elemento
- ✅ Controle de tamanho de fonte (8-72px)
- ✅ Controle de largura de imagem (10-100%)
- ✅ Preview em tempo real
- ✅ Aplicação com !important
- ✅ Salvamento completo

---

**Editor visual com drag & drop e controles de tamanho completo! 🎨🔄📏**

Agora é possível construir, reorganizar e ajustar landing pages com controle total sobre estrutura e dimensões!

