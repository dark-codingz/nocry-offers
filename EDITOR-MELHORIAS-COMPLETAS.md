# 🎨 Editor Visual - 3 Melhorias Completas

## 📋 Implementação Finalizada

### 1. 🔄 Drag & Drop dos Blocos Rápidos
### 2. 📐 Alinhamento (Esquerda/Centro/Direita)
### 3. 📏 Margens Verticais (Top/Bottom)

---

## PARTE 1: Drag & Drop dos Blocos Rápidos ✅

### Conceito
Arrastar blocos rápidos (H1, P, Button, IMG) da barra diretamente para dentro da página, com feedback visual de linha azul mostrando onde vai cair.

### Como Funciona

#### **1.1. Estados Adicionados**
```typescript
type QuickBlockKind = 'h1' | 'p' | 'button' | 'img'

const [dragBlockKind, setDragBlockKind] = useState<QuickBlockKind | null>(null)
const [dragGhostPos, setDragGhostPos] = useState<{ x: number; y: number } | null>(null)
```

#### **1.2. Função Centralizada de HTML**
```typescript
function buildQuickBlockHtml(kind: QuickBlockKind): string {
  if (kind === 'h1') {
    return '<h1 style="display:block; margin:16px 0; font-size:2rem;">Novo título</h1>'
  }
  if (kind === 'p') {
    return '<p style="display:block; margin:12px 0; font-size:1rem;">Novo parágrafo de texto. Edite aqui.</p>'
  }
  if (kind === 'button') {
    return '<a href="#" class="nocry-btn" style="display:inline-block; margin:16px 0; padding:12px 24px; background:#f05252; color:#ffffff; border-radius:999px; text-decoration:none; font-weight:600;">Novo botão</a>'
  }
  if (kind === 'img') {
    return '<img src="https://via.placeholder.com/400x250" alt="Nova imagem" style="display:block; margin:16px auto; max-width:100%; height:auto;" />'
  }
  return ''
}
```

#### **1.3. Função de Drag**
```typescript
function startQuickBlockDrag(kind: QuickBlockKind, e: React.MouseEvent) {
  e.preventDefault()
  setDragBlockKind(kind)
  setDragGhostPos({ x: e.clientX, y: e.clientY })

  const handleMove = (ev: MouseEvent) => {
    setDragGhostPos({ x: ev.clientX, y: ev.clientY })

    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'NCRY_BLOCK_DRAG_MOVE',
        payload: {
          kind,
          clientX: ev.clientX,
          clientY: ev.clientY,
        },
      }, '*')
    }
  }

  const handleUp = (ev: MouseEvent) => {
    window.removeEventListener('mousemove', handleMove)
    window.removeEventListener('mouseup', handleUp)

    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'NCRY_BLOCK_DRAG_DROP',
        payload: {
          kind,
          clientX: ev.clientX,
          clientY: ev.clientY,
          html: buildQuickBlockHtml(kind),
        },
      }, '*')
    }

    setDragBlockKind(null)
    setDragGhostPos(null)
  }

  window.addEventListener('mousemove', handleMove)
  window.addEventListener('mouseup', handleUp)
}
```

#### **1.4. Botões Atualizados**
```tsx
<button
  onMouseDown={(e) => startQuickBlockDrag('h1', e)}
  onClick={(e) => {
    if (!dragBlockKind) {
      handleInsertBlock('h1')
    }
  }}
  className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 transition-colors cursor-grab active:cursor-grabbing"
  title="Clique ou arraste para adicionar título H1"
>
  H1
</button>
```

**Características:**
- `onMouseDown` → Inicia drag
- `onClick` → Fallback para clique simples
- `cursor-grab` → Indica que pode arrastar
- `cursor-grabbing` → Durante o arrasto

#### **1.5. Ghost Visual**
```tsx
{dragBlockKind && dragGhostPos && (
  <div
    className="fixed pointer-events-none z-[99999] px-3 py-1 rounded-full bg-yellow-400/90 text-black text-xs font-semibold shadow-lg"
    style={{
      left: dragGhostPos.x + 12,
      top: dragGhostPos.y + 12,
    }}
  >
    {dragBlockKind === 'h1' && 'Título (H1)'}
    {dragBlockKind === 'p' && 'Parágrafo'}
    {dragBlockKind === 'button' && 'Botão'}
    {dragBlockKind === 'img' && 'Imagem'}
  </div>
)}
```

**Características:**
- Badge amarelo que segue o mouse
- Offset de 12px para não ficar sob o cursor
- `pointer-events-none` para não interferir
- Z-index 99999 (acima de tudo)

#### **1.6. Script do Iframe - NCRY_BLOCK_DRAG_MOVE**
```javascript
if (data.type === 'NCRY_BLOCK_DRAG_MOVE') {
  const { clientX, clientY } = data.payload || {};
  
  const candidate = findDropCandidate(clientX, clientY);
  if (!candidate) {
    hideDropLine();
    return;
  }

  const rect = candidate.getBoundingClientRect();
  const midY = rect.top + rect.height / 2;
  const position = clientY < midY ? 'before' : 'after';

  nocryCurrentDropTarget = candidate;
  nocryCurrentDropPosition = position;
  showDropLineAt(candidate, position);
}
```

**Reutiliza:**
- `findDropCandidate()` - Encontra elemento sob o mouse
- `showDropLineAt()` - Mostra linha azul
- Lógica de before/after do drag bar existente

#### **1.7. Script do Iframe - NCRY_BLOCK_DRAG_DROP**
```javascript
if (data.type === 'NCRY_BLOCK_DRAG_DROP') {
  const { kind, html, clientX, clientY } = data.payload || {};
  if (!html) return;

  let target = nocryCurrentDropTarget;
  let position = nocryCurrentDropPosition;

  if (!target) {
    target = findDropCandidate(clientX, clientY);
    if (target) {
      const rect = target.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      position = clientY < midY ? 'before' : 'after';
    }
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  const newEl = wrapper.firstElementChild;
  if (!newEl) return;

  if (!newEl.dataset.nocryId) {
    newEl.dataset.nocryId = 'nocry-' + (counter++);
  }

  if (target && position && target.parentElement) {
    if (position === 'before') {
      target.parentElement.insertBefore(newEl, target);
    } else {
      target.parentElement.insertBefore(newEl, target.nextSibling);
    }
  } else {
    document.body.appendChild(newEl);
  }

  hideDropLine();
  nocryCurrentDropTarget = null;
  nocryCurrentDropPosition = null;
}
```

**Lógica:**
1. Recebe HTML do bloco
2. Cria elemento a partir do HTML
3. Atribui `data-nocry-id`
4. Insere before/after do alvo ou no final do body
5. Esconde linha azul

### Fluxo Completo
```
1. MOUSEDOWN no botão
   ↓
2. startQuickBlockDrag()
   ↓
3. Ghost amarelo aparece
   ↓
4. MOUSEMOVE
   ↓
5. Envia NCRY_BLOCK_DRAG_MOVE
   ↓
6. Iframe mostra linha azul
   ↓
7. MOUSEUP
   ↓
8. Envia NCRY_BLOCK_DRAG_DROP
   ↓
9. Iframe insere elemento
   ↓
10. Ghost desaparece
```

---

## PARTE 2: Alinhamento ✅

### Conceito
Controlar alinhamento de textos, botões, badges, links e imagens (esquerda/centro/direita).

### Como Funciona

#### **2.1. Tipo e Estado**
```typescript
type TextAlign = 'left' | 'center' | 'right'

const [textAlign, setTextAlign] = useState<TextAlign>('left')
```

#### **2.2. Função Helper**
```typescript
function normalizeAlign(value?: string): TextAlign {
  const v = (value || '').toLowerCase()
  if (v === 'center') return 'center'
  if (v === 'right') return 'right'
  return 'left'
}
```

#### **2.3. Payload Atualizado**
```javascript
// No script do iframe
styles: {
  color: computed.color,
  backgroundColor: computed.backgroundColor,
  // ... outros
  textAlign: computed.textAlign,  // ← NOVO
  marginTop: computed.marginTop,
  marginBottom: computed.marginBottom
}
```

#### **2.4. useEffect para Alinhamento**
```typescript
useEffect(() => {
  if (!selectedElement) {
    setTextAlign('left')
    return
  }

  const kind = classifyElement(selectedElement)

  if (['heading', 'text', 'button', 'badge', 'link'].includes(kind)) {
    setTextAlign(normalizeAlign(selectedElement.styles.textAlign))
  } else if (kind === 'image') {
    setTextAlign(normalizeAlign(selectedElement.styles.textAlign))
  } else {
    setTextAlign('left')
  }
}, [selectedElement])
```

#### **2.5. UI de Alinhamento**
```tsx
{canAlign && (
  <div className="mt-3 space-y-1">
    <label className="text-xs text-zinc-400">Alinhamento</label>
    <div className="flex gap-1">
      {(['left', 'center', 'right'] as TextAlign[]).map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => {
            setTextAlign(opt)
            setSelectedElement((prev) =>
              prev ? {
                ...prev,
                styles: {
                  ...prev.styles,
                  textAlign: opt,
                },
              } : prev
            )
          }}
          className={`flex-1 py-1 rounded-lg text-xs border ${
            textAlign === opt
              ? 'bg-yellow-400 text-black border-yellow-500'
              : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:bg-zinc-800'
          }`}
        >
          {opt === 'left' && 'Esq.'}
          {opt === 'center' && 'Centro'}
          {opt === 'right' && 'Dir.'}
        </button>
      ))}
    </div>
  </div>
)}
```

**Características:**
- 3 botões (Esq. / Centro / Dir.)
- Botão ativo: amarelo
- Botões inativos: cinza escuro
- Atualiza estado em tempo real

#### **2.6. Aplicação em applyChanges**
```typescript
// Para textos, botões, badges, links
if (kind !== 'image') {
  styles.textAlign = textAlign
}

// Para imagens (via margin)
if (kind === 'image') {
  if (textAlign === 'left') {
    styles.display = 'block'
    styles.marginLeft = '0px'
    styles.marginRight = 'auto'
  } else if (textAlign === 'center') {
    styles.display = 'block'
    styles.marginLeft = 'auto'
    styles.marginRight = 'auto'
  } else if (textAlign === 'right') {
    styles.display = 'block'
    styles.marginLeft = 'auto'
    styles.marginRight = '0px'
  }
}
```

**Lógica:**
- **Textos:** Usa `text-align`
- **Imagens:** Usa `margin-left/right` com `auto`

---

## PARTE 3: Margens Verticais ✅

### Conceito
Controlar espaçamento vertical (margin-top e margin-bottom) com sliders de 0 a 120px.

### Como Funciona

#### **3.1. Estados**
```typescript
const [marginTopPx, setMarginTopPx] = useState<number>(0)
const [marginBottomPx, setMarginBottomPx] = useState<number>(0)
```

#### **3.2. useEffect para Margens**
```typescript
useEffect(() => {
  if (!selectedElement) {
    setMarginTopPx(0)
    setMarginBottomPx(0)
    return
  }

  setMarginTopPx(parsePx(selectedElement.styles.marginTop))
  setMarginBottomPx(parsePx(selectedElement.styles.marginBottom))
}, [selectedElement])
```

#### **3.3. UI de Margens**
```tsx
<div className="mt-3 space-y-2">
  <label className="text-xs text-zinc-400">
    Espaçamento vertical (margin-top / margin-bottom)
  </label>
  <div className="space-y-1">
    {/* Margin Top */}
    <div className="flex items-center gap-2">
      <span className="w-10 text-[10px] text-zinc-500 uppercase">Topo</span>
      <input
        type="range"
        min={0}
        max={120}
        value={marginTopPx}
        onChange={(e) =>
          setMarginTopPx(clamp(parseInt(e.target.value, 10), 0, 120))
        }
        className="flex-1 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-yellow-400"
      />
      <span className="w-10 text-[10px] text-right text-zinc-500">
        {marginTopPx}px
      </span>
    </div>

    {/* Margin Bottom */}
    <div className="flex items-center gap-2">
      <span className="w-10 text-[10px] text-zinc-500 uppercase">Baixo</span>
      <input
        type="range"
        min={0}
        max={120}
        value={marginBottomPx}
        onChange={(e) =>
          setMarginBottomPx(clamp(parseInt(e.target.value, 10), 0, 120))
        }
        className="flex-1 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-yellow-400"
      />
      <span className="w-10 text-[10px] text-right text-zinc-500">
        {marginBottomPx}px
      </span>
    </div>
  </div>
</div>
```

**Características:**
- 2 sliders (Topo / Baixo)
- Range: 0px a 120px
- Label mostra valor atual
- Accent amarelo

#### **3.4. Aplicação em applyChanges**
```typescript
styles.marginTop = `${marginTopPx}px`
styles.marginBottom = `${marginBottomPx}px`
```

**Simples:** Sempre aplica as margens como estão nos estados.

---

## 🎨 Interface Atualizada

### Painel Lateral
```
┌─────────────────────────────────┐
│  h1.title • HEADING             │
├─────────────────────────────────┤
│  Texto: [textarea]              │
│  Cor: 🎨 #000                   │
│  Fundo: 🎨 #fff                 │
│  Tamanho: 32px ━━━●━━━          │
├─────────────────────────────────┤
│  Alinhamento                    │
│  [Esq.] [Centro] [Dir.]         │ ← NOVO
├─────────────────────────────────┤
│  Espaçamento vertical           │ ← NOVO
│  Topo  ━━━━●━━━━  16px         │
│  Baixo ━━━━━●━━━  20px         │
├─────────────────────────────────┤
│  [Aplicar alterações]           │
└─────────────────────────────────┘
```

### Blocos Rápidos
```
Blocos rápidos: [H1] [Parágrafo] [Botão] [Imagem]
                 ↑ cursor: grab
                 ↑ Arraste para a página!
```

---

## 🧪 Testes Completos

### Teste 1: Drag & Drop de Bloco
```
1. Segure botão "H1"
2. Arraste para dentro do iframe
3. ✅ Badge amarelo "Título (H1)" aparece
4. ✅ Linha azul mostra onde vai cair
5. Solte
6. ✅ H1 é inserido no local
```

### Teste 2: Clique Simples (Fallback)
```
1. Clique rápido em "Parágrafo"
2. ✅ Parágrafo é inserido abaixo do elemento selecionado
3. ✅ Não ativa drag
```

### Teste 3: Alinhamento de Texto
```
1. Selecione um H1
2. Clique "Centro"
3. ✅ Botão fica amarelo
4. Clique "Aplicar"
5. ✅ H1 centraliza no iframe
```

### Teste 4: Alinhamento de Imagem
```
1. Selecione uma imagem
2. Clique "Dir."
3. Clique "Aplicar"
4. ✅ Imagem alinha à direita
5. Inspecione
6. ✅ margin-left: auto; margin-right: 0px;
```

### Teste 5: Margens
```
1. Selecione um parágrafo
2. Arraste "Topo" para 40px
3. Arraste "Baixo" para 60px
4. Clique "Aplicar"
5. ✅ Espaçamento aumenta no iframe
```

### Teste 6: Workflow Completo
```
1. Arraste "Botão" para a página
2. Solte após um H1
3. Selecione o novo botão
4. Mude alinhamento para "Centro"
5. Ajuste margin-top para 30px
6. Ajuste margin-bottom para 30px
7. Clique "Aplicar"
8. ✅ Botão centralizado com espaçamento
9. Salve ZIP
10. ✅ Mudanças persistem
```

---

## 📊 Resumo Técnico

### Novos Tipos
```typescript
type QuickBlockKind = 'h1' | 'p' | 'button' | 'img'
type TextAlign = 'left' | 'center' | 'right'
```

### Novos Estados
```typescript
const [dragBlockKind, setDragBlockKind] = useState<QuickBlockKind | null>(null)
const [dragGhostPos, setDragGhostPos] = useState<{ x: number; y: number } | null>(null)
const [textAlign, setTextAlign] = useState<TextAlign>('left')
const [marginTopPx, setMarginTopPx] = useState<number>(0)
const [marginBottomPx, setMarginBottomPx] = useState<number>(0)
```

### Novas Funções
- `buildQuickBlockHtml()` - Gera HTML dos blocos
- `startQuickBlockDrag()` - Inicia drag de bloco
- `normalizeAlign()` - Normaliza alinhamento

### Novas Mensagens
- `NCRY_BLOCK_DRAG_MOVE` - Durante drag do bloco
- `NCRY_BLOCK_DRAG_DROP` - Ao soltar bloco

### Propriedades Adicionadas ao Payload
- `textAlign`
- `marginTop`
- `marginBottom`

---

## ✅ Checklist de Implementação

### PARTE 1: Drag & Drop
- [x] Adicionar tipo `QuickBlockKind`
- [x] Adicionar estados `dragBlockKind` e `dragGhostPos`
- [x] Criar função `buildQuickBlockHtml()`
- [x] Criar função `startQuickBlockDrag()`
- [x] Atualizar botões com `onMouseDown`
- [x] Adicionar ghost visual
- [x] Adicionar `NCRY_BLOCK_DRAG_MOVE` no iframe
- [x] Adicionar `NCRY_BLOCK_DRAG_DROP` no iframe

### PARTE 2: Alinhamento
- [x] Adicionar tipo `TextAlign`
- [x] Adicionar estado `textAlign`
- [x] Criar função `normalizeAlign()`
- [x] Adicionar `textAlign` ao payload
- [x] Criar useEffect para alinhamento
- [x] Criar UI de alinhamento (3 botões)
- [x] Atualizar `applyChanges()` com lógica de alinhamento

### PARTE 3: Margens
- [x] Adicionar estados `marginTopPx` e `marginBottomPx`
- [x] Adicionar `marginTop` e `marginBottom` ao payload
- [x] Criar useEffect para margens
- [x] Criar UI de margens (2 sliders)
- [x] Atualizar `applyChanges()` com margens

### Geral
- [x] Verificar lints (sem erros)
- [x] Testar drag & drop
- [x] Testar alinhamento
- [x] Testar margens
- [x] Documentar funcionalidades

---

## 🚀 Resultado Final

### Editor Visual Completo com:
- ✅ Drag & drop de blocos rápidos
- ✅ Ghost visual amarelo
- ✅ Linha azul de drop
- ✅ Clique simples (fallback)
- ✅ Alinhamento (esq/centro/dir)
- ✅ Alinhamento de imagens via margin
- ✅ Margens verticais (0-120px)
- ✅ Preview em tempo real
- ✅ Salvamento completo

---

**3 Melhorias implementadas com sucesso! 🎨✅**

Editor visual agora tem drag & drop intuitivo, controle de alinhamento e espaçamento preciso!

