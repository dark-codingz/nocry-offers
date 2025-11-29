# 🚀 Editor Visual Avançado - Funcionalidades Completas

## 📋 Novas Funcionalidades

### 1. ❌ Remover Elemento
### 2. ➕ Adicionar Elementos (H1, Parágrafo, Botão, Imagem)
### 3. 🖼️ Editar Imagem
### 4. 🎨 Editar Cor de Fundo da Página

---

## 1. ❌ Remover Elemento

### Como Funciona

**No Script do Iframe:**
```javascript
if (data.type === 'NCRY_REMOVE_ELEMENT') {
  const { elementId } = data.payload || {};
  const el = document.querySelector('[data-nocry-id="' + elementId + '"]');
  if (el && el.parentElement) {
    el.parentElement.removeChild(el);
  }
}
```

**No React:**
```typescript
function handleRemoveElement() {
  win.postMessage({
    type: 'NCRY_REMOVE_ELEMENT',
    payload: { elementId: selectedElement.elementId }
  }, '*')
  setSelectedElement(null)
}
```

**Interface:**
- Botão "Remover elemento" no final do painel
- Aparece quando há elemento selecionado
- Cor vermelha para indicar ação destrutiva
- Remove elemento e limpa seleção

**Teste:**
```
1. Selecione um elemento
2. Clique "Remover elemento"
3. Elemento desaparece do iframe
4. Painel volta ao estado inicial
```

---

## 2. ➕ Adicionar Elementos

### Blocos Disponíveis

#### **H1 (Título)**
```html
<h1 style="font-size: 2em; font-weight: bold; margin: 1em 0;">
  Novo título
</h1>
```

#### **Parágrafo**
```html
<p style="margin: 1em 0;">
  Novo parágrafo de texto. Edite aqui.
</p>
```

#### **Botão**
```html
<a href="#" style="display: inline-block; padding: 12px 24px; background: #D4AF37; color: #000; text-decoration: none; border-radius: 8px; font-weight: 600;">
  Novo botão
</a>
```

#### **Imagem**
```html
<img src="https://via.placeholder.com/400x250" alt="Nova imagem" style="max-width: 100%; height: auto; display: block; margin: 1em 0;" />
```

### Como Funciona

**Barra de Blocos:**
```tsx
<div className="border-b border-zinc-900 px-4 py-2 flex items-center gap-2">
  <span>Blocos rápidos:</span>
  <button onClick={() => handleInsertBlock('h1')}>H1</button>
  <button onClick={() => handleInsertBlock('p')}>Parágrafo</button>
  <button onClick={() => handleInsertBlock('button')}>Botão</button>
  <button onClick={() => handleInsertBlock('img')}>Imagem</button>
</div>
```

**Lógica de Inserção:**
```typescript
function handleInsertBlock(kind: 'h1' | 'p' | 'button' | 'img') {
  // Se há elemento selecionado: insere DEPOIS dele
  if (selectedElement) {
    win.postMessage({
      type: 'NCRY_INSERT_ELEMENT_AFTER',
      payload: { referenceId: selectedElement.elementId, html }
    }, '*')
  } 
  // Se não há seleção: insere no FINAL do body
  else {
    win.postMessage({
      type: 'NCRY_INSERT_ELEMENT_AT_END',
      payload: { html }
    }, '*')
  }
}
```

**No Script do Iframe:**
```javascript
// Inserir após elemento
if (data.type === 'NCRY_INSERT_ELEMENT_AFTER') {
  const refEl = document.querySelector('[data-nocry-id="' + referenceId + '"]');
  const newEl = wrapper.firstElementChild;
  refEl.parentElement.insertBefore(newEl, refEl.nextSibling);
}

// Inserir no final
if (data.type === 'NCRY_INSERT_ELEMENT_AT_END') {
  const newEl = wrapper.firstElementChild;
  document.body.appendChild(newEl);
}
```

**Teste:**
```
1. Clique em "H1" na barra de blocos
2. Título aparece no final da página
3. Selecione um elemento existente
4. Clique em "Botão"
5. Botão aparece DEPOIS do elemento selecionado
6. Clique no novo botão
7. Edite texto/cores normalmente
```

---

## 3. 🖼️ Editar Imagem

### Como Funciona

**Detecção:**
- Quando usuário clica em `<img>`
- Script envia `attributes: { src: '...', alt: '...' }`
- React captura e seta `imageUrl`

**Interface Especial para Imagens:**
```tsx
{elementKind === 'image' && (
  <div>
    <div className="text-xs text-zinc-500">
      IMG · Fonte atual:
      <span className="text-[10px]">{imageUrl}</span>
    </div>
    
    <label>URL da imagem</label>
    <input
      value={imageUrl}
      onChange={(e) => setImageUrl(e.target.value)}
      placeholder="https://example.com/image.jpg"
    />
    
    <button onClick={handleApplyImageUrl}>
      Aplicar imagem
    </button>
  </div>
)}
```

**Aplicação:**
```typescript
function handleApplyImageUrl() {
  win.postMessage({
    type: 'NCRY_UPDATE_IMAGE_SRC',
    payload: {
      elementId: selectedElement.elementId,
      src: imageUrl
    }
  }, '*')
}
```

**No Script do Iframe:**
```javascript
if (data.type === 'NCRY_UPDATE_IMAGE_SRC') {
  const el = document.querySelector('[data-nocry-id="' + elementId + '"]');
  if (el && el.tagName.toLowerCase() === 'img') {
    el.setAttribute('src', src);
  }
}
```

**Teste:**
```
1. Clique em uma imagem no iframe
2. Painel mostra URL atual
3. Cole nova URL: https://picsum.photos/400/250
4. Clique "Aplicar imagem"
5. Imagem muda no iframe
```

---

## 4. 🎨 Editar Cor de Fundo da Página

### Como Funciona

**Detecção Inicial:**
```typescript
useEffect(() => {
  if (!iframeLoaded) return
  const doc = iframeRef.current.contentDocument
  const bodyBg = window.getComputedStyle(doc.body).backgroundColor
  setPageBgColor(normalizeColorToHex(bodyBg))
}, [iframeLoaded])
```

**Interface:**
```tsx
{!selectedElement && tracking && (
  <div className="mt-6 pt-6 border-t border-zinc-800">
    <h3>Configurações da Página</h3>
    
    <label>Cor de fundo da página (body)</label>
    <input
      type="color"
      value={pageBgColor}
      onChange={(e) => {
        const color = e.target.value
        setPageBgColor(color)
        win.postMessage({
          type: 'NCRY_SET_BODY_BACKGROUND',
          payload: { color }
        }, '*')
      }}
    />
  </div>
)}
```

**Aplicação em Tempo Real:**
- Muda cor → Atualiza estado
- Envia mensagem para iframe
- Iframe aplica imediatamente

**No Script do Iframe:**
```javascript
if (data.type === 'NCRY_SET_BODY_BACKGROUND') {
  const { color } = data.payload || {};
  if (!color) return;
  document.body.style.backgroundColor = color;
}
```

**Teste:**
```
1. Desselecione qualquer elemento (clique em área vazia)
2. Role até "Configurações da Página"
3. Mude a cor de fundo
4. Veja página mudar em tempo real
```

---

## 🎨 Layout Atualizado

```
┌─────────────────────────────────────────────────────────────┐
│  [H1] [Parágrafo] [Botão] [Imagem]  ← Barra de blocos      │
├─────────────────────────────────────────────────────────────┤
│                                     │                        │
│                                     │  ← Voltar              │
│                                     │  Editor Visual         │
│                                     │  ──────────────────    │
│                                     │                        │
│         IFRAME                      │  [Pixels & UTMs]       │
│      (Landing clonada)              │                        │
│                                     │  button.btn • BUTTON   │
│                                     │                        │
│                                     │  Texto: [...]          │
│                                     │  Cor: 🎨 #000000       │
│                                     │  Fundo: 🎨 #D4AF37     │
│                                     │                        │
│                                     │  [Aplicar alterações]  │
│                                     │                        │
│                                     │  [Remover elemento]    │
│                                     │                        │
│                                     │  ──────────────────    │
│                                     │  Configurações Página  │
│                                     │  Fundo: 🎨 #ffffff     │
│                                     │                        │
│                                     │  [Salvar & Baixar ZIP] │
└─────────────────────────────────────────────────────────────┘
```

---

## 📡 Mensagens Implementadas

### Existentes
- `NCRY_SELECT_ELEMENT` - Selecionar elemento
- `NCRY_UPDATE_ELEMENT` - Atualizar texto/estilos

### Novas
- `NCRY_REMOVE_ELEMENT` - Remover elemento
- `NCRY_INSERT_ELEMENT_AFTER` - Inserir após elemento
- `NCRY_INSERT_ELEMENT_AT_END` - Inserir no final
- `NCRY_UPDATE_IMAGE_SRC` - Trocar src de imagem
- `NCRY_SET_BODY_BACKGROUND` - Mudar fundo da página

---

## 🧪 Testes Completos

### Teste 1: Remover Elemento
```
1. Selecione um parágrafo
2. Clique "Remover elemento"
3. Parágrafo desaparece
4. Salve ZIP
5. Verifique: elemento não está no HTML
```

### Teste 2: Adicionar H1
```
1. Clique "H1" na barra de blocos
2. Título aparece no final da página
3. Clique no novo título
4. Edite o texto
5. Aplique mudanças
```

### Teste 3: Adicionar Botão Após Elemento
```
1. Selecione um elemento
2. Clique "Botão" na barra
3. Botão aparece DEPOIS do elemento selecionado
4. Clique no novo botão
5. Mude texto e cor de fundo
6. Aplique
```

### Teste 4: Trocar Imagem
```
1. Clique em uma imagem
2. Painel mostra URL atual
3. Cole: https://picsum.photos/400/250
4. Clique "Aplicar imagem"
5. Imagem muda
6. Salve ZIP
7. Verifique: nova URL no HTML
```

### Teste 5: Mudar Fundo da Página
```
1. Desselecione elementos (clique em área vazia)
2. Role até "Configurações da Página"
3. Mude cor de fundo para #000000
4. Página fica preta
5. Salve ZIP
6. Abra HTML
7. Verifique: body tem background preto
```

### Teste 6: Workflow Completo
```
1. Clone uma página
2. Remova elementos desnecessários
3. Adicione novo H1
4. Adicione novo botão
5. Edite textos e cores
6. Troque uma imagem
7. Mude fundo da página
8. Edite pixels (modal)
9. Salve ZIP
10. Extraia e abra
11. Verifique: todas as mudanças aplicadas
```

---

## 🎯 Casos de Uso

### Caso 1: Limpar Página
```
Cenário: Página tem muitos elementos, quer simplificar

1. Selecione elementos desnecessários
2. Clique "Remover elemento" em cada um
3. Página fica limpa
4. Salve ZIP
```

### Caso 2: Construir Landing do Zero
```
Cenário: Começar com página em branco

1. Clone uma página simples
2. Remova tudo
3. Adicione H1 (título)
4. Adicione Parágrafo (descrição)
5. Adicione Botão (CTA)
6. Adicione Imagem (hero)
7. Edite textos/cores
8. Mude fundo da página
9. Salve ZIP
```

### Caso 3: Trocar Imagens de Produto
```
Cenário: Landing de produto, trocar fotos

1. Clique na primeira imagem
2. Cole URL da nova foto
3. Aplique
4. Repita para outras imagens
5. Salve ZIP
```

### Caso 4: Rebrand Completo
```
Cenário: Adaptar landing para nova marca

1. Mude fundo da página (nova cor da marca)
2. Selecione botões
3. Mude cor de fundo dos botões
4. Troque logo (imagem)
5. Edite textos
6. Atualize pixels (modal)
7. Salve ZIP
```

---

## 🎨 Interface Atualizada

### Barra de Blocos (Topo)
```
┌─────────────────────────────────────────────────────┐
│ Blocos rápidos: [H1] [Parágrafo] [Botão] [Imagem]  │
└─────────────────────────────────────────────────────┘
```

### Painel Lateral - Elemento Selecionado
```
┌─────────────────────────────────┐
│ button.btn • BUTTON             │
├─────────────────────────────────┤
│ Texto: [textarea]               │
│ Cor: 🎨 #ffffff                 │
│ Fundo: 🎨 #D4AF37               │
│ [Aplicar alterações]            │
├─────────────────────────────────┤
│ [Remover elemento] ← NOVO       │
└─────────────────────────────────┘
```

### Painel Lateral - Imagem Selecionada
```
┌─────────────────────────────────┐
│ img • IMAGE                     │
├─────────────────────────────────┤
│ IMG · Fonte atual:              │
│ https://example.com/hero.jpg    │
│                                 │
│ URL da imagem:                  │
│ [input]                         │
│                                 │
│ [Aplicar imagem] ← NOVO         │
├─────────────────────────────────┤
│ [Remover elemento]              │
└─────────────────────────────────┘
```

### Painel Lateral - Nenhum Elemento Selecionado
```
┌─────────────────────────────────┐
│ 👆 Clique em qualquer elemento  │
├─────────────────────────────────┤
│ Configurações da Página ← NOVO  │
│                                 │
│ Cor de fundo (body):            │
│ 🎨 #ffffff                      │
└─────────────────────────────────┘
```

---

## 🔄 Fluxo de Uso

### Adicionar Elemento
```
Clica "Botão" na barra
  ↓
NCRY_INSERT_ELEMENT_AT_END (se nada selecionado)
ou
NCRY_INSERT_ELEMENT_AFTER (se algo selecionado)
  ↓
Script cria elemento no DOM
  ↓
Atribui data-nocry-id automaticamente
  ↓
Elemento aparece no iframe
  ↓
Usuário pode clicar e editar normalmente
```

### Editar Imagem
```
Clica em <img>
  ↓
Script envia attributes: { src: '...' }
  ↓
React seta imageUrl
  ↓
Painel mostra campo de URL
  ↓
Usuário cola nova URL
  ↓
Clica "Aplicar imagem"
  ↓
NCRY_UPDATE_IMAGE_SRC
  ↓
Script atualiza el.setAttribute('src', newUrl)
  ↓
Imagem muda no iframe
```

### Remover Elemento
```
Seleciona elemento
  ↓
Clica "Remover elemento"
  ↓
NCRY_REMOVE_ELEMENT
  ↓
Script remove do DOM
  ↓
React limpa seleção
  ↓
Painel volta ao estado inicial
```

### Mudar Fundo da Página
```
Desseleciona elementos
  ↓
Painel mostra "Configurações da Página"
  ↓
Muda cor no color picker
  ↓
onChange envia NCRY_SET_BODY_BACKGROUND
  ↓
Script aplica document.body.style.backgroundColor
  ↓
Mudança reflete em tempo real
```

---

## 📊 Comparação: Antes vs Depois

| Funcionalidade | Antes | Depois |
|----------------|-------|--------|
| **Remover elementos** | ❌ | ✅ |
| **Adicionar elementos** | ❌ | ✅ (H1, P, Button, Img) |
| **Editar imagens** | ❌ | ✅ |
| **Mudar fundo da página** | ❌ | ✅ |
| **Barra de blocos** | ❌ | ✅ |
| **Painel de imagem** | ❌ | ✅ |
| **Configurações de página** | ❌ | ✅ |

---

## ✅ Checklist de Implementação

- [x] Adicionar `NCRY_REMOVE_ELEMENT` ao script
- [x] Adicionar `NCRY_INSERT_ELEMENT_AFTER` ao script
- [x] Adicionar `NCRY_INSERT_ELEMENT_AT_END` ao script
- [x] Adicionar `NCRY_UPDATE_IMAGE_SRC` ao script
- [x] Adicionar `NCRY_SET_BODY_BACKGROUND` ao script
- [x] Criar função `handleRemoveElement()`
- [x] Criar função `handleInsertBlock()`
- [x] Criar função `handleApplyImageUrl()`
- [x] Adicionar estados `imageUrl` e `pageBgColor`
- [x] Criar barra de blocos no topo
- [x] Criar painel especial para imagens
- [x] Criar seção "Configurações da Página"
- [x] Adicionar botão "Remover elemento"
- [x] Capturar `attributes.src` ao selecionar imagem
- [x] Detectar cor de fundo da página ao carregar
- [x] Verificar lints (sem erros)

---

## 🚀 Resultado Final

### Editor Visual Completo com:
- ✅ Seleção inteligente de elementos
- ✅ Edição de texto e cores
- ✅ Edição de fundo (botões/badges)
- ✅ Edição de imagens
- ✅ Remoção de elementos
- ✅ Adição de elementos (H1, P, Button, Img)
- ✅ Edição de fundo da página
- ✅ Gerenciamento de pixels (UTMify, Meta)
- ✅ Breadcrumb com seletor CSS
- ✅ Feedback visual
- ✅ ZIP completo com assets
- ✅ Layout fullscreen

---

**Editor visual avançado completo! 🎨🚀**

Agora é possível construir/editar landing pages completas visualmente!

