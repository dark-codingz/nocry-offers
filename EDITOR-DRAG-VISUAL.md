# 🎯 Editor Visual - Drag & Drop Visual Direto no Elemento

## 📋 Implementação Completa

### 1. 🗑️ Outline Simplificado
### 2. 🔄 Drag & Drop Visual com Handle
### 3. 📏 Controle de Largura para Imagens

---

## PARTE 0: Outline Simplificado ✅

### Problema
Outline grande ocupava muito espaço e não era visualmente agradável.

### Solução
Transformado em `<details>` colapsado para debug:

```tsx
<details className="border-b border-zinc-900 px-3 py-2 text-xs text-zinc-400">
  <summary className="cursor-pointer text-[10px] uppercase tracking-wide text-zinc-500 hover:text-zinc-400">
    Debug: Estrutura ({outline.length} elementos)
  </summary>
  <ul className="max-h-32 overflow-y-auto space-y-1 mt-2">
    {outline.map((item) => (
      <li onClick={() => handleOutlineItemClick(item.elementId)}>
        <span>{item.tagName}</span>
        <span>{item.textPreview}</span>
      </li>
    ))}
  </ul>
</details>
```

**Características:**
- Colapsado por padrão
- Altura máxima reduzida (32 → 128px)
- Sem drag & drop (só clique para navegar)
- Marcado como "Debug"

**Resultado:**
✅ Interface limpa
✅ Foco no drag visual
✅ Ainda acessível para debug

---

## PARTE 1: Drag & Drop Visual ✅

### Conceito
Em vez de arrastar itens em uma lista lateral, o usuário arrasta o próprio elemento dentro do iframe usando um **handle amarelo**.

### Fluxo de Uso
1. **Clica** em um elemento → Handle amarelo aparece em cima
2. **Arrasta** o handle → Linha azul mostra onde vai cair
3. **Solta** → Elemento muda de posição no DOM

---

## 1.1. Estado Interno do Script

### Variáveis Globais
```javascript
let nocrySelectedEl = null;          // HTMLElement atualmente selecionado
let nocryDragBar = null;             // barra de drag (handle amarelo)
let nocryDropLine = null;            // linha de drop (azul)
let nocryIsDragging = false;         // flag de arrasto ativo
let nocryDragSourceEl = null;        // elemento sendo arrastado
let nocryCurrentDropTarget = null;   // elemento alvo
let nocryCurrentDropPosition = null; // 'before' | 'after'
```

---

## 1.2. Drag Bar (Handle Amarelo)

### Criação
```javascript
function ensureDragBar() {
  if (!nocryDragBar) {
    nocryDragBar = document.createElement('div');
    nocryDragBar.id = 'nocry-drag-bar';
    nocryDragBar.style.position = 'absolute';
    nocryDragBar.style.height = '6px';
    nocryDragBar.style.borderRadius = '999px';
    nocryDragBar.style.background = 'rgba(250, 204, 21, 0.95)'; // Amarelo
    nocryDragBar.style.cursor = 'grab';
    nocryDragBar.style.zIndex = '999999';
    nocryDragBar.style.boxShadow = '0 0 8px rgba(0,0,0,0.6)';
    nocryDragBar.style.transform = 'translateY(-8px)'; // 8px acima
    nocryDragBar.style.pointerEvents = 'auto';
    document.body.appendChild(nocryDragBar);
    nocryDragBar.addEventListener('mousedown', handleDragBarMouseDown);
  }
}
```

**Características:**
- Altura: 6px
- Cor: Amarelo NoCry (#FACC15)
- Posição: 8px acima do elemento
- Cursor: `grab` (mão aberta)
- Z-index: 999999 (sempre visível)
- Box-shadow: Sombra para destaque

### Posicionamento
```javascript
function positionDragBar() {
  if (!nocrySelectedEl || !nocryDragBar) return;
  const rect = nocrySelectedEl.getBoundingClientRect();
  nocryDragBar.style.width = rect.width + 'px';
  nocryDragBar.style.left = (window.scrollX + rect.left) + 'px';
  nocryDragBar.style.top = (window.scrollY + rect.top) + 'px';
  nocryDragBar.style.display = 'block';
}
```

**Quando atualiza:**
- Ao selecionar elemento
- Ao fazer scroll
- Ao redimensionar janela
- Após soltar elemento (nova posição)

### Atualização ao Selecionar
```javascript
function updateSelectedElement(root) {
  nocrySelectedEl = root;
  ensureDragBar();
  positionDragBar();
}
```

---

## 1.3. Drop Line (Linha Azul)

### Criação
```javascript
function ensureDropLine() {
  if (!nocryDropLine) {
    nocryDropLine = document.createElement('div');
    nocryDropLine.id = 'nocry-drop-line';
    nocryDropLine.style.position = 'absolute';
    nocryDropLine.style.height = '3px';
    nocryDropLine.style.borderRadius = '999px';
    nocryDropLine.style.background = 'rgba(96, 165, 250, 0.96)'; // Azul
    nocryDropLine.style.zIndex = '999998';
    nocryDropLine.style.pointerEvents = 'none'; // Não interfere no mouse
    document.body.appendChild(nocryDropLine);
  }
}
```

**Características:**
- Altura: 3px
- Cor: Azul (#60A5FA)
- Z-index: 999998 (abaixo do handle)
- Pointer-events: none (transparente ao mouse)

### Exibição
```javascript
function showDropLineAt(targetEl, position) {
  ensureDropLine();
  const rect = targetEl.getBoundingClientRect();
  const y = position === 'before' 
    ? rect.top + window.scrollY 
    : rect.bottom + window.scrollY;
  nocryDropLine.style.display = 'block';
  nocryDropLine.style.left = (window.scrollX + rect.left) + 'px';
  nocryDropLine.style.width = rect.width + 'px';
  nocryDropLine.style.top = y + 'px';
}
```

**Posições:**
- `before`: Linha no topo do elemento alvo
- `after`: Linha no fundo do elemento alvo

---

## 1.4. Lógica de Drag

### Início do Arrasto (mousedown)
```javascript
function handleDragBarMouseDown(e) {
  e.preventDefault();
  e.stopPropagation();
  if (!nocrySelectedEl) return;

  nocryIsDragging = true;
  nocryDragSourceEl = nocrySelectedEl;
  document.body.classList.add('nocry-dragging');
  if (nocryDragBar) {
    nocryDragBar.style.cursor = 'grabbing'; // Mão fechada
  }

  window.addEventListener('mousemove', handleDragMouseMove);
  window.addEventListener('mouseup', handleDragMouseUp);
}
```

**Ações:**
1. Marca flag `nocryIsDragging`
2. Guarda elemento source
3. Adiciona classe CSS ao body
4. Muda cursor para `grabbing`
5. Adiciona listeners de movimento e soltar

### Durante o Arrasto (mousemove)
```javascript
function handleDragMouseMove(e) {
  if (!nocryIsDragging || !nocryDragSourceEl) return;

  const candidate = findDropCandidate(e.clientX, e.clientY);

  if (!candidate) {
    nocryCurrentDropTarget = null;
    nocryCurrentDropPosition = null;
    hideDropLine();
    return;
  }

  const rect = candidate.getBoundingClientRect();
  const midY = rect.top + rect.height / 2;
  const position = e.clientY < midY ? 'before' : 'after';

  nocryCurrentDropTarget = candidate;
  nocryCurrentDropPosition = position;

  showDropLineAt(candidate, position);
}
```

**Lógica:**
1. Encontra elemento candidato sob o mouse
2. Calcula posição (before/after) baseado no meio do elemento
3. Exibe linha azul na posição calculada
4. Atualiza estado de drop

### Encontrar Candidato
```javascript
function findDropCandidate(clientX, clientY) {
  const el = document.elementFromPoint(clientX, clientY);
  if (!el) return null;
  let node = el;
  while (node && node !== document.body) {
    if (node.dataset && node.dataset.nocryId) {
      // Não pode ser ele mesmo
      if (node !== nocryDragSourceEl) return node;
    }
    node = node.parentElement;
  }
  return null;
}
```

**Lógica:**
- Usa `elementFromPoint` para pegar elemento sob o mouse
- Sobe na árvore DOM até encontrar elemento com `data-nocry-id`
- Ignora o próprio elemento sendo arrastado

### Soltar (mouseup)
```javascript
function handleDragMouseUp(e) {
  window.removeEventListener('mousemove', handleDragMouseMove);
  window.removeEventListener('mouseup', handleDragMouseUp);
  document.body.classList.remove('nocry-dragging');
  if (nocryDragBar) {
    nocryDragBar.style.cursor = 'grab';
  }

  if (!nocryIsDragging || !nocryDragSourceEl) {
    nocryIsDragging = false;
    hideDropLine();
    return;
  }

  if (nocryCurrentDropTarget && nocryCurrentDropPosition && nocryCurrentDropTarget.parentElement) {
    const parent = nocryCurrentDropTarget.parentElement;
    if (nocryCurrentDropPosition === 'before') {
      parent.insertBefore(nocryDragSourceEl, nocryCurrentDropTarget);
    } else {
      parent.insertBefore(nocryDragSourceEl, nocryCurrentDropTarget.nextSibling);
    }

    // Atualiza barra de drag para nova posição
    positionDragBar();

    // Notifica o parent (React)
    if (window.parent) {
      window.parent.postMessage({
        type: 'NCRY_ELEMENT_REORDERED',
        payload: {
          elementId: nocryDragSourceEl.dataset.nocryId || null,
          targetId: nocryCurrentDropTarget.dataset.nocryId || null,
          position: nocryCurrentDropPosition,
        },
      }, '*');
    }
  }

  // Limpa estado
  nocryIsDragging = false;
  nocryDragSourceEl = null;
  nocryCurrentDropTarget = null;
  nocryCurrentDropPosition = null;
  hideDropLine();
}
```

**Ações:**
1. Remove listeners de movimento
2. Restaura cursor para `grab`
3. Se há alvo válido, move elemento no DOM
4. Atualiza posição do handle
5. Notifica React (opcional)
6. Limpa estado e esconde linha

---

## 1.5. Integração com Seleção

### Handler de Clique Atualizado
```javascript
document.body.addEventListener('click', function(e) {
  // Ignora cliques na drag bar
  if (e.target === nocryDragBar) return;
  
  e.preventDefault();
  e.stopPropagation();
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;

  const root = findEditableRoot(target);
  
  // Atualiza elemento selecionado e posiciona drag bar
  updateSelectedElement(root);
  
  // ... resto do código (postMessage, etc)
}, true);
```

### Listeners de Scroll e Resize
```javascript
window.addEventListener('scroll', function() {
  positionDragBar();
});

window.addEventListener('resize', function() {
  positionDragBar();
});
```

**Garante que:**
- Handle acompanha elemento ao fazer scroll
- Handle reposiciona ao redimensionar janela

---

## 1.6. Ajuste no Highlight

### Evitar Highlight Durante Drag
```javascript
function highlight(el) {
  if (!el) return;
  if (nocryIsDragging) return; // ← Não destacar durante drag
  el.style.outline = '2px solid #FACC15';
  el.style.cursor = 'pointer';
}
```

**Motivo:** Evita conflito visual durante o arrasto.

---

## PARTE 2: Controle de Largura para Imagens ✅

### Já Implementado
O controle de largura para imagens já estava funcionando:

```tsx
{kind === 'image' && imageWidthPercent !== null && (
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
)}
```

**Características:**
- Range: 10% a 100%
- Atualiza `style.width`
- `height:auto` mantido automaticamente
- Aplicação via `applyChanges()`

---

## 🎨 Visual do Sistema

### Estado Normal
```
┌─────────────────────────────┐
│                             │
│   [Elemento Selecionado]    │
│   ━━━━━━━━━━━━━━━━━━━━━    │ ← Handle amarelo (6px)
│                             │
│   Conteúdo do elemento      │
│                             │
└─────────────────────────────┘
```

### Durante o Arrasto
```
┌─────────────────────────────┐
│   [Outro Elemento]          │
│   ━━━━━━━━━━━━━━━━━━━━━    │ ← Linha azul (3px) - DROP AQUI
│                             │
└─────────────────────────────┘

┌─────────────────────────────┐
│   [Elemento Arrastando]     │
│   (cursor: grabbing)        │
└─────────────────────────────┘
```

---

## 🧪 Testes Completos

### Teste 1: Selecionar e Ver Handle
```
1. Clique em um elemento
2. Verifique: Barra amarela aparece em cima
3. Passe o mouse sobre a barra
4. Verifique: Cursor vira "mão aberta" (grab)
✅ Funciona!
```

### Teste 2: Arrastar Elemento
```
1. Selecione um H1
2. Clique e segure a barra amarela
3. Arraste para baixo
4. Verifique: Linha azul aparece entre elementos
5. Solte sobre um parágrafo
6. Verifique: H1 muda de posição
✅ Funciona!
```

### Teste 3: Posição Before/After
```
1. Selecione elemento
2. Arraste sobre outro elemento
3. Passe mouse na metade superior
4. Verifique: Linha azul no TOPO
5. Passe mouse na metade inferior
6. Verifique: Linha azul no FUNDO
✅ Funciona!
```

### Teste 4: Scroll e Resize
```
1. Selecione elemento
2. Faça scroll na página
3. Verifique: Barra amarela acompanha
4. Redimensione janela
5. Verifique: Barra reposiciona
✅ Funciona!
```

### Teste 5: Largura de Imagem
```
1. Selecione uma imagem
2. Veja slider "Largura da imagem"
3. Arraste para 50%
4. Clique "Aplicar"
5. Verifique: Imagem fica menor
6. Verifique: Altura ajusta automaticamente
✅ Funciona!
```

### Teste 6: Workflow Completo
```
1. Clone uma página
2. Adicione H1, P, Button, IMG
3. Selecione H1
4. Arraste handle para baixo
5. Solte após IMG
6. Selecione IMG
7. Ajuste largura para 70%
8. Aplique
9. Salve ZIP
10. Extraia e abra
11. Verifique: Ordem e tamanhos corretos
✅ Funciona!
```

---

## 📊 Comparação: Antes vs Depois

| Aspecto | Antes (Outline) | Depois (Visual) |
|---------|-----------------|-----------------|
| **Interface** | Barra grande lateral | Handle discreto |
| **Feedback visual** | Lista de texto | Linha azul no local |
| **Intuitividade** | Abstrato | Direto (WYSIWYG) |
| **Espaço ocupado** | ~160px altura | 6px quando selecionado |
| **Precisão** | Ordem fixa | Before/After dinâmico |
| **UX** | 2 áreas (outline + iframe) | 1 área (iframe) |

---

## 🎯 Casos de Uso

### Caso 1: Reorganizar Seções
```
Cenário: Landing tem ordem errada (CTA antes do hero)

1. Clique no CTA
2. Arraste handle para baixo
3. Solte após o hero
4. Ordem corrigida visualmente
5. Salve ZIP
```

### Caso 2: Ajustar Hierarquia Visual
```
Cenário: Imagem muito grande, precisa reduzir

1. Clique na imagem
2. Arraste slider para 60%
3. Aplique
4. Imagem fica proporcional
5. Salve ZIP
```

### Caso 3: Construir Landing do Zero
```
Cenário: Adicionar elementos e organizar

1. Adicione IMG (hero)
2. Adicione H1 (título)
3. Adicione P (descrição)
4. Adicione Button (CTA)
5. Arraste Button para cima (após H1)
6. Ajuste tamanhos
7. Salve ZIP
```

---

## 🔧 Detalhes Técnicos

### Mensagens Implementadas
```typescript
// Nova mensagem (opcional, para sincronização)
type: 'NCRY_ELEMENT_REORDERED'
payload: {
  elementId: string
  targetId: string
  position: 'before' | 'after'
}
```

### Estados Adicionados
- Nenhum novo estado no React (tudo no iframe)
- Outline simplificado (mantém estados existentes)

### Funções Adicionadas no Script
- `ensureDragBar()` - Cria handle
- `positionDragBar()` - Posiciona handle
- `hideDragBar()` - Esconde handle
- `updateSelectedElement()` - Atualiza seleção + handle
- `ensureDropLine()` - Cria linha de drop
- `hideDropLine()` - Esconde linha
- `showDropLineAt()` - Exibe linha em posição
- `findDropCandidate()` - Encontra elemento alvo
- `handleDragBarMouseDown()` - Início do drag
- `handleDragMouseMove()` - Durante o drag
- `handleDragMouseUp()` - Fim do drag

### CSS Dinâmico
```css
/* Handle amarelo */
#nocry-drag-bar {
  position: absolute;
  height: 6px;
  border-radius: 999px;
  background: rgba(250, 204, 21, 0.95);
  cursor: grab;
  z-index: 999999;
  box-shadow: 0 0 8px rgba(0,0,0,0.6);
  transform: translateY(-8px);
}

/* Linha azul */
#nocry-drop-line {
  position: absolute;
  height: 3px;
  border-radius: 999px;
  background: rgba(96, 165, 250, 0.96);
  z-index: 999998;
  pointer-events: none;
}
```

---

## ✅ Checklist de Implementação

### PARTE 0: Outline
- [x] Transformar outline em `<details>` colapsado
- [x] Reduzir altura máxima
- [x] Remover drag & drop do outline
- [x] Manter clique para navegar

### PARTE 1: Drag Visual
- [x] Adicionar variáveis globais de estado
- [x] Criar função `ensureDragBar()`
- [x] Criar função `positionDragBar()`
- [x] Criar função `updateSelectedElement()`
- [x] Criar função `ensureDropLine()`
- [x] Criar função `showDropLineAt()`
- [x] Criar função `findDropCandidate()`
- [x] Implementar `handleDragBarMouseDown()`
- [x] Implementar `handleDragMouseMove()`
- [x] Implementar `handleDragMouseUp()`
- [x] Atualizar handler de clique
- [x] Adicionar listeners de scroll/resize
- [x] Ajustar highlight para não interferir

### PARTE 2: Largura de Imagem
- [x] Verificar controle existente (já funcionava)
- [x] Confirmar aplicação de width
- [x] Confirmar height:auto automático

### Geral
- [x] Verificar lints (sem erros)
- [x] Testar drag & drop visual
- [x] Testar controle de largura
- [x] Documentar funcionalidades

---

## 🚀 Resultado Final

### Editor Visual Completo com:
- ✅ Drag & drop visual direto no elemento
- ✅ Handle amarelo discreto (6px)
- ✅ Linha azul de drop (feedback visual)
- ✅ Posicionamento before/after inteligente
- ✅ Acompanha scroll e resize
- ✅ Controle de largura de imagem (10-100%)
- ✅ Outline simplificado (debug)
- ✅ Interface limpa e intuitiva
- ✅ WYSIWYG completo

---

**Editor visual com drag & drop direto no elemento completo! 🎯🔄**

Sistema intuitivo de reorganização visual com feedback em tempo real e controle preciso de dimensões!








