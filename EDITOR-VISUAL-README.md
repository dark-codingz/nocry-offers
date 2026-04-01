# 🎨 Editor Visual de Landing Pages

Editor visual completo para editar landing pages clonadas com seleção de elementos, edição de texto e cores.

---

## 📍 Localização

```
app/(protected)/ofertas/editor/[id]/page.tsx
```

---

## 🎯 Funcionalidades

### ✅ Implementadas

1. **Carregamento de clone**
   - Busca HTML via `GET /api/clones/[id]`
   - Exibe em iframe com `srcDoc`

2. **Seleção de elementos**
   - Hover: destaque amarelo (`outline: 2px solid #FACC15`)
   - Click: seleciona elemento e carrega dados no painel
   - Double-click: edição inline com `contentEditable`

3. **Edição de texto**
   - Textarea para editar `innerText`
   - Aplicação em tempo real via `postMessage`

4. **Edição de cor**
   - Color picker visual
   - Input de texto para código hex
   - Conversão automática de `rgb()` para `#hex`

5. **Salvar & Baixar**
   - Salva HTML editado no banco (`PUT /api/clones/[id]`)
   - Gera e baixa ZIP (`POST /api/clones/[id]/zip`)

### 🔮 Preparado para Futuro

- Trocar imagens (estrutura pronta)
- Remover elementos (estrutura pronta)
- Editar background color
- Editar font size/weight

---

## 🏗️ Arquitetura

### Estados Principais

```typescript
const [clone, setClone] = useState<Clone | null>(null)
const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null)
const [loading, setLoading] = useState(true)
const [saving, setSaving] = useState(false)
const [error, setError] = useState<string | null>(null)
```

### Comunicação iframe ↔ React

#### 1. Iframe → React (seleção)
```javascript
// No iframe (script injetado)
window.parent.postMessage({
  type: 'NCRY_SELECT_ELEMENT',
  payload: {
    elementId: 'nocry-123',
    tagName: 'H1',
    innerText: 'Título',
    styles: { color: 'rgb(0,0,0)', ... }
  }
}, '*')

// No React
useEffect(() => {
  window.addEventListener('message', handleMessage)
}, [])
```

#### 2. React → Iframe (atualização)
```javascript
// No React
iframeRef.current.contentWindow.postMessage({
  type: 'NCRY_UPDATE_ELEMENT',
  payload: {
    elementId: 'nocry-123',
    innerText: 'Novo título',
    styles: { color: '#ff0000' }
  }
}, '*')

// No iframe (script injetado)
window.addEventListener('message', (event) => {
  if (event.data.type === 'NCRY_UPDATE_ELEMENT') {
    const el = document.querySelector(`[data-nocry-id="${elementId}"]`)
    el.innerText = innerText
    el.style.color = styles.color
  }
})
```

---

## 🎨 Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌──────────────────────────┐  ┌──────────────────────┐   │
│  │                          │  │  ← Voltar            │   │
│  │                          │  │                      │   │
│  │                          │  │  Editor Visual       │   │
│  │                          │  │  example.com         │   │
│  │      IFRAME              │  │  ──────────────────  │   │
│  │   (Landing clonada)      │  │                      │   │
│  │                          │  │  <h1>                │   │
│  │   Hover: outline amarelo │  │                      │   │
│  │   Click: seleciona       │  │  Texto:              │   │
│  │   DblClick: edita inline │  │  ┌────────────────┐ │   │
│  │                          │  │  │ Textarea       │ │   │
│  │                          │  │  └────────────────┘ │   │
│  │                          │  │                      │   │
│  │                          │  │  Cor do texto:       │   │
│  │                          │  │  🎨 #000000          │   │
│  │                          │  │                      │   │
│  │                          │  │  [Aplicar alterações]│   │
│  │                          │  │                      │   │
│  │                          │  │  ──────────────────  │   │
│  │                          │  │                      │   │
│  │                          │  │  [Salvar & Baixar]   │   │
│  └──────────────────────────┘  └──────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Script Injetado no Iframe

O script `buildSrcDoc()` injeta JavaScript no HTML que:

### 1. Atribui IDs únicos
```javascript
function assignIds(root) {
  const all = root.querySelectorAll('*')
  all.forEach(el => {
    if (!el.dataset.nocryId) {
      el.dataset.nocryId = 'nocry-' + (counter++)
    }
  })
}
```

### 2. Highlight on hover
```javascript
document.body.addEventListener('mouseover', (e) => {
  e.target.style.outline = '2px solid #FACC15'
  e.target.style.cursor = 'pointer'
}, true)
```

### 3. Seleção on click
```javascript
document.body.addEventListener('click', (e) => {
  e.preventDefault()
  e.stopPropagation()
  
  const computed = window.getComputedStyle(e.target)
  
  window.parent.postMessage({
    type: 'NCRY_SELECT_ELEMENT',
    payload: {
      elementId: e.target.dataset.nocryId,
      tagName: e.target.tagName,
      innerText: e.target.innerText,
      styles: {
        color: computed.color,
        backgroundColor: computed.backgroundColor,
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight
      }
    }
  }, '*')
}, true)
```

### 4. Edição inline on double-click
```javascript
document.body.addEventListener('dblclick', (e) => {
  e.target.contentEditable = 'true'
  e.target.focus()
}, true)
```

### 5. Recebe atualizações do React
```javascript
window.addEventListener('message', (event) => {
  if (event.data.type === 'NCRY_UPDATE_ELEMENT') {
    const { elementId, innerText, styles } = event.data.payload
    const el = document.querySelector(`[data-nocry-id="${elementId}"]`)
    
    if (innerText !== undefined) {
      el.innerText = innerText
    }
    
    if (styles) {
      Object.keys(styles).forEach(key => {
        el.style[key] = styles[key]
      })
    }
  }
})
```

---

## 🎨 Tema Visual

### Cores
- Background: `bg-neutral-950` (preto profundo)
- Painel lateral: `bg-neutral-900`
- Bordas: `border-neutral-800`
- Inputs: `bg-neutral-800`
- Botão principal: `bg-yellow-400 text-black`
- Destaque: `#FACC15` (amarelo)

### Componentes
- Botão voltar: `ArrowLeft` icon + texto
- Tag do elemento: Badge com `<tagname>`
- Textarea: 8 linhas, rounded, focus ring amarelo
- Color picker: 48x48px + input hex
- Botão salvar: Full width, rounded-xl, ícone Save

---

## 🧪 Como Testar

### 1. Criar um clone
```
1. Acesse /clone
2. Cole URL: https://example.com
3. Clique em "Clonar"
4. Clique em "Editar página"
```

### 2. Selecionar elemento
```
1. Passe o mouse sobre textos na landing
2. Veja o outline amarelo
3. Clique em um texto
4. Veja os dados no painel lateral
```

### 3. Editar texto
```
1. Selecione um elemento
2. Edite o texto no textarea
3. Clique em "Aplicar alterações"
4. Veja a mudança no iframe
```

### 4. Editar cor
```
1. Selecione um elemento
2. Clique no color picker
3. Escolha uma cor
4. Clique em "Aplicar alterações"
5. Veja a cor mudar no iframe
```

### 5. Edição inline
```
1. Dê duplo-clique em qualquer texto
2. Edite diretamente no iframe
3. Pressione Enter ou clique fora
```

### 6. Salvar e baixar
```
1. Faça algumas edições
2. Clique em "Salvar & Baixar ZIP"
3. Aguarde o download
4. Extraia o ZIP
5. Abra index.html
6. Veja as edições aplicadas
```

---

## 🔮 Próximas Funcionalidades

### 1. Trocar Imagens
```typescript
// No painel lateral, quando <img> selecionado:
<div>
  <label>Imagem</label>
  <input type="file" accept="image/*" onChange={handleImageUpload} />
  <img src={selectedElement.src} className="w-full rounded" />
</div>

// Função:
async function handleImageUpload(e: ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0]
  if (!file) return
  
  // Upload para Supabase Storage ou converter para base64
  const base64 = await fileToBase64(file)
  
  // Atualizar no iframe
  iframeRef.current?.contentWindow?.postMessage({
    type: 'NCRY_UPDATE_ELEMENT',
    payload: {
      elementId: selectedElement.elementId,
      attributes: { src: base64 }
    }
  }, '*')
}
```

### 2. Remover Elementos
```typescript
// Botão no painel:
<button
  onClick={handleRemoveElement}
  className="w-full bg-red-500 text-white rounded-lg px-4 py-2"
>
  Remover elemento
</button>

// Função:
function handleRemoveElement() {
  if (!selectedElement) return
  
  iframeRef.current?.contentWindow?.postMessage({
    type: 'NCRY_REMOVE_ELEMENT',
    payload: { elementId: selectedElement.elementId }
  }, '*')
  
  setSelectedElement(null)
}

// No script do iframe:
if (data.type === 'NCRY_REMOVE_ELEMENT') {
  const el = document.querySelector(`[data-nocry-id="${elementId}"]`)
  el?.remove()
}
```

### 3. Editar Background
```typescript
// Adicionar ao painel:
<div>
  <label>Cor de fundo</label>
  <input
    type="color"
    value={normalizeColorToHex(selectedElement.styles.backgroundColor)}
    onChange={(e) => {
      setSelectedElement({
        ...selectedElement,
        styles: {
          ...selectedElement.styles,
          backgroundColor: e.target.value
        }
      })
    }}
  />
</div>
```

### 4. Editar Tipografia
```typescript
// Adicionar ao painel:
<div>
  <label>Tamanho da fonte</label>
  <input
    type="range"
    min="8"
    max="72"
    value={parseInt(selectedElement.styles.fontSize || '16')}
    onChange={(e) => {
      setSelectedElement({
        ...selectedElement,
        styles: {
          ...selectedElement.styles,
          fontSize: e.target.value + 'px'
        }
      })
    }}
  />
</div>

<div>
  <label>Peso da fonte</label>
  <select
    value={selectedElement.styles.fontWeight}
    onChange={(e) => {
      setSelectedElement({
        ...selectedElement,
        styles: {
          ...selectedElement.styles,
          fontWeight: e.target.value
        }
      })
    }}
  >
    <option value="400">Normal</option>
    <option value="500">Medium</option>
    <option value="600">Semibold</option>
    <option value="700">Bold</option>
  </select>
</div>
```

### 5. Histórico de Edições (Undo/Redo)
```typescript
const [history, setHistory] = useState<string[]>([])
const [historyIndex, setHistoryIndex] = useState(-1)

function undo() {
  if (historyIndex > 0) {
    setHistoryIndex(historyIndex - 1)
    // Restaurar HTML do history[historyIndex - 1]
  }
}

function redo() {
  if (historyIndex < history.length - 1) {
    setHistoryIndex(historyIndex + 1)
    // Restaurar HTML do history[historyIndex + 1]
  }
}
```

---

## 📊 Status

| Funcionalidade | Status |
|----------------|--------|
| Carregar clone | ✅ |
| Exibir em iframe | ✅ |
| Seleção de elementos | ✅ |
| Highlight on hover | ✅ |
| Edição de texto | ✅ |
| Edição de cor | ✅ |
| Edição inline (dblclick) | ✅ |
| Aplicar alterações | ✅ |
| Salvar no banco | ✅ |
| Baixar ZIP | ✅ |
| Conversão rgb→hex | ✅ |
| Loading states | ✅ |
| Error handling | ✅ |
| Trocar imagens | ⏳ |
| Remover elementos | ⏳ |
| Editar background | ⏳ |
| Editar tipografia | ⏳ |
| Undo/Redo | ⏳ |

---

**Editor visual completo e funcional! 🎨**








