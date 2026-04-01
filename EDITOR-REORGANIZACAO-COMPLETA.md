# 🎨 Editor Visual - Reorganização Completa

## 📋 3 Melhorias Implementadas

### 1. ✅ Correção do Drag & Drop dos Blocos Rápidos
### 2. ✅ Sidebar Esquerda Colapsável para Blocos
### 3. ✅ Abas no Painel Direito (Geral / Layout)

---

## 1. ✅ Correção do Drag & Drop

### Problema
As coordenadas `clientX` e `clientY` eram do viewport do parent, mas o iframe esperava coordenadas do seu próprio viewport.

### Solução

#### **No React (startQuickBlockDrag)**
```typescript
const handleMove = (ev: MouseEvent) => {
  setDragGhostPos({ x: ev.clientX, y: ev.clientY })

  const iframe = iframeRef.current
  if (!iframe || !iframe.contentWindow) return

  const rect = iframe.getBoundingClientRect()

  // Coordenadas relativas ao iframe
  const iframeX = ev.clientX - rect.left
  const iframeY = ev.clientY - rect.top

  iframe.contentWindow.postMessage({
    type: 'NCRY_BLOCK_DRAG_MOVE',
    payload: {
      kind,
      iframeX,
      iframeY,
    },
  }, '*')
}
```

**Mudanças:**
- Calcula `iframeX` e `iframeY` relativos ao iframe
- Envia `iframeX/iframeY` em vez de `clientX/clientY`

#### **No Script do Iframe**
```javascript
if (data.type === 'NCRY_BLOCK_DRAG_MOVE') {
  const { iframeX, iframeY } = data.payload || {};
  if (typeof iframeX !== 'number' || typeof iframeY !== 'number') return;

  const candidate = findDropCandidate(iframeX, iframeY);
  // ... resto igual
}

if (data.type === 'NCRY_BLOCK_DRAG_DROP') {
  const { html, iframeX, iframeY } = data.payload || {};
  // ... usa iframeX/iframeY
}
```

**Resultado:**
✅ Drag funciona corretamente em toda a área do iframe
✅ Não trava mais nas bordas
✅ Coordenadas precisas

---

## 2. ✅ Sidebar Esquerda Colapsável

### Estrutura

#### **Layout Principal**
```tsx
<div className="relative flex-1 min-w-0 border-r border-zinc-900">
  {/* Sidebar esquerda */}
  <div className="absolute inset-y-0 left-0 z-40 flex">
    {/* Painel colapsável */}
  </div>

  {/* Preview iframe */}
  <div style={{ paddingLeft: blocksSidebarOpen ? '224px' : '40px' }}>
    <iframe ... />
  </div>
</div>
```

#### **Sidebar**
```tsx
<div className={`h-full bg-[#050509]/95 border-r border-zinc-900 shadow-xl transition-all duration-200 ${
  blocksSidebarOpen ? 'w-56' : 'w-10'
}`}>
  {/* Header com botão de toggle */}
  <div className="flex items-center justify-between px-2 py-2 border-b border-zinc-800">
    <span className={!blocksSidebarOpen && 'hidden'}>
      Blocos rápidos
    </span>
    <button onClick={() => setBlocksSidebarOpen((v) => !v)}>
      {blocksSidebarOpen ? '<' : '>'}
    </button>
  </div>

  {/* Grid de blocos (2 colunas) */}
  {blocksSidebarOpen && (
    <div className="p-2 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {/* H1, Parágrafo, Botão, Imagem */}
      </div>
    </div>
  )}
</div>
```

**Características:**
- **Expandida:** 224px (w-56)
- **Colapsada:** 40px (w-10)
- **Transição:** 200ms suave
- **Z-index:** 40 (acima do iframe)
- **Background:** Semi-transparente (95% opacidade)

#### **Iframe com Padding Dinâmico**
```tsx
<div
  className="h-full w-full overflow-auto"
  style={{ paddingLeft: blocksSidebarOpen ? '224px' : '40px' }}
>
  <iframe ... />
</div>
```

**Resultado:**
✅ Sidebar não sobrepõe o iframe
✅ Iframe ajusta padding automaticamente
✅ Transição suave ao colapsar/expandir

---

## 3. ✅ Abas no Painel Direito

### Estrutura

#### **Estado**
```typescript
type EditorTab = 'geral' | 'layout'
const [activeTab, setActiveTab] = useState<EditorTab>('geral')
```

#### **Header das Abas**
```tsx
{selectedElement && (
  <div className="px-4 pt-4 pb-2 flex gap-2 text-xs shrink-0">
    <button
      onClick={() => setActiveTab('geral')}
      className={`flex-1 py-2 rounded-lg border ${
        activeTab === 'geral'
          ? 'bg-yellow-400 text-black border-yellow-500'
          : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:bg-zinc-800'
      }`}
    >
      Geral
    </button>
    <button
      onClick={() => setActiveTab('layout')}
      className={...}
    >
      Layout
    </button>
  </div>
)}
```

#### **Conteúdo por Aba**

**Aba Geral (`renderGeneralTab`):**
- Breadcrumb (seletor CSS)
- Editor de texto (textarea)
- Cor do texto
- Cor de fundo (botões/badges)
- Editor de imagem (URL src) - se for imagem
- Botão "Aplicar alterações"

**Aba Layout (`renderLayoutTab`):**
- Tamanho da fonte (slider 8-72px)
- Largura da imagem (slider 10-100%) - se for imagem
- Alinhamento (Esq./Centro/Dir.)
- Margens verticais (Topo/Baixo, 0-120px)
- Botão "Aplicar alterações"

#### **Botão Remover (Fora das Abas)**
```tsx
<div className="border-t border-zinc-800 pt-4 mt-4">
  <button onClick={handleRemoveElement}>
    Remover elemento
  </button>
</div>
```

**Resultado:**
✅ Interface organizada
✅ Fácil navegação entre opções
✅ Menos poluição visual

---

## 🎨 Layout Final

```
┌─────────────────────────────────────────────────────────────┐
│  [<] Blocos rápidos  │                                       │
│  ┌─────┬─────┐       │                                       │
│  │ H1  │  P  │       │         IFRAME                        │
│  │Btn  │ IMG │       │      (Landing clonada)               │
│  └─────┴─────┘       │                                       │
├──────────────────────┼───────────────────────────────────────┤
│                      │  ← Voltar                             │
│                      │  Editor Visual                        │
│                      │  example.com                          │
│                      │  [Pixels & UTMs]                      │
│                      │  [Geral] [Layout] ← NOVO              │
│                      ├───────────────────────────────────────┤
│                      │  Aba Geral:                           │
│                      │  • Texto                               │
│                      │  • Cor do texto                       │
│                      │  • Cor de fundo                       │
│                      │  [Aplicar alterações]                 │
│                      ├───────────────────────────────────────┤
│                      │  [Remover elemento]                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 Testes

### Teste 1: Drag & Drop Corrigido
```
1. Abra sidebar de blocos
2. Segure "H1"
3. Arraste para qualquer lugar do iframe
4. ✅ Linha azul aparece corretamente
5. Solte
6. ✅ H1 inserido no local exato
```

### Teste 2: Sidebar Colapsável
```
1. Sidebar expandida (224px)
2. Clique "<" no header
3. ✅ Sidebar colapsa para 40px
4. ✅ Iframe ajusta padding
5. Clique ">" para expandir
6. ✅ Sidebar volta ao tamanho normal
```

### Teste 3: Abas
```
1. Selecione um elemento
2. Veja abas "Geral" e "Layout"
3. Clique "Layout"
4. ✅ Mostra controles de layout
5. Clique "Geral"
6. ✅ Mostra controles gerais
```

### Teste 4: Workflow Completo
```
1. Abra sidebar
2. Arraste "Botão" para página
3. Selecione o botão
4. Aba "Geral": Mude texto e cor
5. Aba "Layout": Ajuste alinhamento e margens
6. Aplique mudanças
7. ✅ Todas as mudanças aplicadas
```

---

## 📊 Resumo Técnico

### Novos Estados
```typescript
const [blocksSidebarOpen, setBlocksSidebarOpen] = useState(true)
const [activeTab, setActiveTab] = useState<EditorTab>('geral')
```

### Novas Funções
- `renderGeneralTab()` - Renderiza aba Geral
- `renderLayoutTab()` - Renderiza aba Layout

### Mudanças no Drag
- `iframeX` e `iframeY` em vez de `clientX` e `clientY`
- Cálculo relativo ao iframe usando `getBoundingClientRect()`

### Layout
- Sidebar absoluta com z-index 40
- Iframe com padding dinâmico
- Transições suaves (200ms)

---

## ✅ Checklist de Implementação

### PARTE 1: Correção Drag
- [x] Calcular coordenadas relativas ao iframe
- [x] Enviar `iframeX/iframeY` em vez de `clientX/clientY`
- [x] Atualizar script do iframe para usar `iframeX/iframeY`
- [x] Testar drag em toda a área do iframe

### PARTE 2: Sidebar
- [x] Criar estado `blocksSidebarOpen`
- [x] Criar sidebar absoluta
- [x] Adicionar botão de toggle
- [x] Grid 2x2 de blocos
- [x] Padding dinâmico no iframe
- [x] Transições suaves

### PARTE 3: Abas
- [x] Criar estado `activeTab`
- [x] Criar header das abas
- [x] Criar função `renderGeneralTab()`
- [x] Criar função `renderLayoutTab()`
- [x] Separar conteúdo por aba
- [x] Manter botão "Remover" fora das abas

### Geral
- [x] Verificar lints (sem erros)
- [x] Testar drag corrigido
- [x] Testar sidebar colapsável
- [x] Testar abas
- [x] Documentar funcionalidades

---

## 🚀 Resultado Final

### Editor Visual Reorganizado com:
- ✅ Drag & drop corrigido (coordenadas precisas)
- ✅ Sidebar esquerda colapsável
- ✅ Blocos rápidos organizados (grid 2x2)
- ✅ Abas no painel (Geral / Layout)
- ✅ Interface limpa e organizada
- ✅ Transições suaves
- ✅ UX melhorada

---

**Reorganização completa implementada! 🎨✅**

Editor visual agora está mais organizado, intuitivo e funcional!








