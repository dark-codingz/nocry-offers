# 🎯 Painel de Pixels & UTMs - Editor Visual

## 📋 Funcionalidade Implementada

Sistema completo de detecção e edição de pixels de rastreamento e scripts de UTMs no editor visual.

---

## 🎯 O Que Foi Adicionado

### 1. Detecção Automática de Scripts

O editor agora detecta automaticamente:

#### **UTMify Pixel**
```javascript
// Detecta:
window.pixelId = "68dfd7c9b20d2dfa8bab49d7"
```

#### **Script de UTMs UTMify**
```html
<!-- Detecta: -->
<script src="https://cdn.utmify.com.br/scripts/utms/latest.js"></script>
```

#### **Meta Pixel (Facebook)**
```javascript
// Detecta:
fbq('init', '1367698035025270')
```

---

## 🏗️ Estrutura de Estado

### TrackingInfo Type
```typescript
type TrackingInfo = {
  utmifyPixel?: {
    found: boolean      // Se foi encontrado no código
    pixelId: string | null  // ID do pixel
  }
  utmifyUtms?: {
    found: boolean      // Se script foi encontrado
    enabled: boolean    // Se deve manter habilitado
  }
  metaPixel?: {
    found: boolean      // Se foi encontrado no código
    pixelId: string | null  // ID do pixel
  }
}
```

### Estados Adicionados
```typescript
const [tracking, setTracking] = useState<TrackingInfo | null>(null)
const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false)
const [iframeLoaded, setIframeLoaded] = useState(false)
```

---

## 🔍 Detecção Automática

### useEffect de Detecção
```typescript
useEffect(() => {
  if (!iframeLoaded || !iframeRef.current) return
  
  const doc = iframeRef.current.contentDocument
  const scripts = Array.from(doc.querySelectorAll('script'))
  
  // Detecta cada tipo de script
  // Atualiza estado tracking
}, [iframeLoaded])
```

**Quando roda:**
- Após o iframe carregar completamente
- Varre todos os `<script>` do documento
- Extrai IDs usando regex
- Atualiza estado `tracking`

---

## 🎨 Interface do Usuário

### 1. Botão no Painel Lateral
```tsx
<button
  disabled={!tracking}
  onClick={() => setIsTrackingModalOpen(true)}
>
  Pixels & UTMs {tracking ? '(detecção ativa)' : '(carregando...)'}
</button>
```

**Localização:** Topo do painel lateral (antes do conteúdo de edição)

**Estados:**
- Desabilitado enquanto `tracking` é `null`
- Mostra "(carregando...)" durante detecção
- Mostra "(detecção ativa)" quando pronto

### 2. Modal de Edição

**Campos:**

#### UTMify Pixel ID
- Input de texto
- Placeholder: `ex: 68dfd7c9b20d2dfa8bab49d7`
- Label mostra "(encontrado)" em verde se detectado
- Label mostra "(não encontrado no código)" se não detectado

#### Meta Pixel ID
- Input de texto
- Placeholder: `ex: 1367698035025270`
- Label mostra "(encontrado)" em verde se detectado
- Label mostra "(não encontrado no código)" se não detectado

#### Script de UTMs
- Checkbox
- Label: "Manter script de UTMs da UTMify na página"
- Marcado se script foi encontrado
- Pode marcar/desmarcar para adicionar/remover

**Botões:**
- **Cancelar:** Fecha modal sem aplicar
- **Aplicar & voltar:** Aplica mudanças e fecha modal

---

## ⚙️ Aplicação de Mudanças

### Função `applyTrackingChanges()`

#### 1. Atualizar UTMify Pixel ID
```typescript
// Encontra script com window.pixelId
// Substitui o ID usando regex
s.textContent = text.replace(
  /window\.pixelId\s*=\s*["']([^"']+)["']/,
  `window.pixelId = "${tracking.utmifyPixel.pixelId}"`
)
```

#### 2. Atualizar Meta Pixel ID
```typescript
// Encontra script com fbq('init')
// Substitui o ID usando regex
s.textContent = text.replace(
  /fbq\(['"]init['"]\s*,\s*['"](\d+)['"]\)/,
  `fbq('init', '${tracking.metaPixel.pixelId}')`
)
```

#### 3. Gerenciar Script de UTMs
```typescript
// Se habilitado e não existe: cria
if (tracking.utmifyUtms?.enabled && !utmScript) {
  const newScript = doc.createElement('script')
  newScript.src = 'https://cdn.utmify.com.br/scripts/utms/latest.js'
  newScript.setAttribute('async', '')
  newScript.setAttribute('defer', '')
  doc.head.appendChild(newScript)
}

// Se desabilitado e existe: remove
if (!tracking.utmifyUtms?.enabled && utmScript) {
  utmScript.remove()
}
```

---

## 🔄 Fluxo Completo

### 1. Carregar Editor
```
GET /api/clones/[id]
  ↓
Renderiza iframe com HTML
  ↓
onLoad={() => setIframeLoaded(true)}
  ↓
useEffect detecta scripts
  ↓
Atualiza estado tracking
  ↓
Botão "Pixels & UTMs" fica habilitado
```

### 2. Abrir Modal
```
Clica "Pixels & UTMs"
  ↓
setIsTrackingModalOpen(true)
  ↓
Modal aparece com campos preenchidos
  ↓
Mostra status: (encontrado) ou (não encontrado)
```

### 3. Editar e Aplicar
```
Usuário edita IDs
  ↓
Marca/desmarca checkbox de UTMs
  ↓
Clica "Aplicar & voltar"
  ↓
applyTrackingChanges()
  • Atualiza scripts no iframe
  • Adiciona/remove script de UTMs
  ↓
Modal fecha
  ↓
Mudanças refletem no iframe
```

### 4. Salvar
```
Clica "Salvar & Baixar ZIP"
  ↓
Lê HTML do iframe (com mudanças aplicadas)
  ↓
PUT /api/clones/[id] { html: editedHtml }
  ↓
POST /api/clones/[id]/zip
  ↓
ZIP contém HTML com pixels atualizados
```

---

## 🧪 Como Testar

### Teste 1: Detecção de UTMify Pixel

```
1. Clone uma página que tem:
   window.pixelId = "abc123"
2. Abra no editor
3. Aguarde carregar
4. Clique "Pixels & UTMs"
5. Verifique:
   ✅ Campo "UTMify Pixel ID" mostra "abc123"
   ✅ Label mostra "(encontrado)" em verde
```

### Teste 2: Detecção de Meta Pixel

```
1. Clone uma página que tem:
   fbq('init', '1234567890')
2. Abra no editor
3. Clique "Pixels & UTMs"
4. Verifique:
   ✅ Campo "Meta Pixel ID" mostra "1234567890"
   ✅ Label mostra "(encontrado)" em verde
```

### Teste 3: Detecção de Script de UTMs

```
1. Clone uma página que tem:
   <script src="https://cdn.utmify.com.br/scripts/utms/latest.js"></script>
2. Abra no editor
3. Clique "Pixels & UTMs"
4. Verifique:
   ✅ Checkbox "Manter script..." está marcado
```

### Teste 4: Editar Pixel

```
1. No modal, mude UTMify Pixel ID para "xyz789"
2. Clique "Aplicar & voltar"
3. Inspecione iframe (DevTools)
4. Verifique:
   ✅ Script mostra: window.pixelId = "xyz789"
```

### Teste 5: Adicionar Script de UTMs

```
1. Clone página SEM script de UTMs
2. Abra modal
3. Marque checkbox "Manter script..."
4. Clique "Aplicar & voltar"
5. Inspecione iframe
6. Verifique:
   ✅ <script src="...utms/latest.js"> foi adicionado ao <head>
```

### Teste 6: Remover Script de UTMs

```
1. Clone página COM script de UTMs
2. Abra modal
3. Desmarque checkbox
4. Clique "Aplicar & voltar"
5. Inspecione iframe
6. Verifique:
   ✅ Script de UTMs foi removido
```

### Teste 7: Salvar Mudanças

```
1. Edite pixels no modal
2. Aplique mudanças
3. Clique "Salvar & Baixar ZIP"
4. Extraia ZIP
5. Abra index.html
6. Inspecione código
7. Verifique:
   ✅ Pixels atualizados estão no HTML
```

---

## 📊 Casos de Uso

### Caso 1: Trocar Pixel do Cliente
```
Cenário: Clonou página de outro cliente, precisa trocar pixel

1. Abre editor
2. Clica "Pixels & UTMs"
3. Vê pixel antigo detectado
4. Substitui por pixel do novo cliente
5. Aplica
6. Salva ZIP
7. Entrega ao cliente com pixel correto
```

### Caso 2: Adicionar Tracking
```
Cenário: Página não tem tracking, precisa adicionar

1. Abre editor
2. Clica "Pixels & UTMs"
3. Vê campos vazios (não encontrado)
4. Preenche IDs dos pixels
5. Marca checkbox de UTMs
6. Aplica
7. Scripts são adicionados ao HTML
```

### Caso 3: Remover Tracking
```
Cenário: Página tem tracking, precisa remover

1. Abre editor
2. Clica "Pixels & UTMs"
3. Limpa campos de IDs
4. Desmarca checkbox de UTMs
5. Aplica
6. Scripts são removidos
```

---

## 🎨 Visual do Modal

```
┌─────────────────────────────────────────┐
│  Pixels & UTMs                          │
├─────────────────────────────────────────┤
│                                         │
│  UTMify Pixel ID (encontrado)           │
│  ┌───────────────────────────────────┐  │
│  │ 68dfd7c9b20d2dfa8bab49d7          │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Meta Pixel ID (não encontrado)         │
│  ┌───────────────────────────────────┐  │
│  │ ex: 1367698035025270              │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ☑ Manter script de UTMs da UTMify      │
│                                         │
├─────────────────────────────────────────┤
│                  [Cancelar] [Aplicar]   │
└─────────────────────────────────────────┘
```

---

## 🔧 Detalhes Técnicos

### Regex para UTMify Pixel
```javascript
/window\.pixelId\s*=\s*["']([^"']+)["']/
```
Captura: `window.pixelId = "abc123"` ou `window.pixelId='abc123'`

### Regex para Meta Pixel
```javascript
/fbq\(['"]init['"]\s*,\s*['"](\d+)['"]\)/
```
Captura: `fbq('init', '123')` ou `fbq("init", "123")`

### Seletor de Script de UTMs
```javascript
'script[src*="utmify.com.br/scripts/utms"]'
```
Encontra qualquer script com `utmify.com.br/scripts/utms` no src

### Criação de Script Dinâmico
```javascript
const newScript = doc.createElement('script')
newScript.src = 'https://cdn.utmify.com.br/scripts/utms/latest.js'
newScript.setAttribute('async', '')
newScript.setAttribute('defer', '')
doc.head.appendChild(newScript)
```

---

## ✅ Checklist de Implementação

- [x] Adicionar tipo `TrackingInfo`
- [x] Adicionar estados (`tracking`, `isTrackingModalOpen`, `iframeLoaded`)
- [x] Adicionar `onLoad` no iframe
- [x] Criar useEffect de detecção
- [x] Detectar UTMify Pixel (regex)
- [x] Detectar Script de UTMs (seletor)
- [x] Detectar Meta Pixel (regex)
- [x] Criar botão "Pixels & UTMs"
- [x] Criar modal com campos
- [x] Criar função `applyTrackingChanges()`
- [x] Atualizar UTMify Pixel ID
- [x] Atualizar Meta Pixel ID
- [x] Adicionar/remover Script de UTMs
- [x] Verificar lints (sem erros)
- [x] Documentar funcionalidade

---

## 🎯 Benefícios

1. **Detecção automática:** Não precisa inspecionar código manualmente
2. **Edição visual:** Interface amigável para trocar pixels
3. **Gerenciamento de UTMs:** Adicionar/remover script facilmente
4. **Feedback claro:** Mostra se pixel foi encontrado ou não
5. **Salva no ZIP:** Mudanças são persistidas no HTML exportado
6. **Múltiplos pixels:** Suporta UTMify e Meta simultaneamente

---

**Painel de Pixels & UTMs completo e funcional! 🎯**

Agora é possível gerenciar tracking diretamente no editor visual!

