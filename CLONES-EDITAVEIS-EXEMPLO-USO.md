# 🎨 Exemplo de Uso - Clones Editáveis

## Componente React Completo

```tsx
'use client'

import { useState } from 'react'

export default function CloneEditorPage() {
  const [url, setUrl] = useState('')
  const [cloneId, setCloneId] = useState<string | null>(null)
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 1. Criar clone
  const handleCreate = async () => {
    if (!url.trim()) {
      alert('Digite uma URL')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/clones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Falha ao criar clone')
      }

      const { cloneId: newId } = await response.json()
      setCloneId(newId)

      // Buscar HTML do clone recém-criado
      await handleLoad(newId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  // 2. Carregar clone existente
  const handleLoad = async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/clones/${id}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Falha ao carregar clone')
      }

      const clone = await response.json()
      setHtml(clone.html)
      setCloneId(clone.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  // 3. Salvar edições
  const handleSave = async () => {
    if (!cloneId) {
      alert('Nenhum clone carregado')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/clones/${cloneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Falha ao salvar')
      }

      alert('Salvo com sucesso!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  // 4. Baixar ZIP
  const handleDownloadZip = async () => {
    if (!cloneId) {
      alert('Nenhum clone carregado')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/clones/${cloneId}/zip`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Falha ao gerar ZIP')
      }

      // Download do ZIP
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = 'nocry-clone-edited.zip'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)

      alert('ZIP baixado!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6">Editor de Clones</h1>

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded mb-4">
          {error}
        </div>
      )}

      {/* Criar novo clone */}
      {!cloneId && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Criar Novo Clone</h2>
          <div className="flex gap-4">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 px-4 py-2 border rounded"
              disabled={loading}
            />
            <button
              onClick={handleCreate}
              disabled={loading || !url.trim()}
              className="px-6 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar Clone'}
            </button>
          </div>
        </div>
      )}

      {/* Editor de HTML */}
      {cloneId && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              Editando Clone: <code className="text-sm">{cloneId}</code>
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                onClick={handleDownloadZip}
                disabled={loading}
                className="px-4 py-2 bg-purple-500 text-white rounded disabled:opacity-50"
              >
                {loading ? 'Gerando...' : 'Baixar ZIP'}
              </button>
              <button
                onClick={() => {
                  setCloneId(null)
                  setHtml('')
                  setUrl('')
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded"
              >
                Novo
              </button>
            </div>
          </div>

          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            className="w-full h-96 p-4 border rounded font-mono text-sm"
            placeholder="HTML será carregado aqui..."
            disabled={loading}
          />

          {/* Preview */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Preview</h3>
            <iframe
              srcDoc={html}
              className="w-full h-96 border rounded"
              sandbox="allow-same-origin"
              title="Preview"
            />
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## 📋 Fluxo de Uso

### 1. Criar Clone
```typescript
const response = await fetch('/api/clones', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://example.com' }),
})

const { cloneId } = await response.json()
// cloneId: "123e4567-e89b-12d3-a456-426614174000"
```

### 2. Carregar Clone
```typescript
const response = await fetch(`/api/clones/${cloneId}`)
const clone = await response.json()

console.log(clone.html) // HTML da página
console.log(clone.original_url) // URL original
```

### 3. Editar e Salvar
```typescript
// Usuário edita o HTML no editor
const editedHtml = '<!DOCTYPE html>...'

const response = await fetch(`/api/clones/${cloneId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ html: editedHtml }),
})

const { success } = await response.json()
```

### 4. Baixar ZIP
```typescript
const response = await fetch(`/api/clones/${cloneId}/zip`, {
  method: 'POST',
})

const blob = await response.blob()

// Trigger download
const url = window.URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = 'nocry-clone-edited.zip'
a.click()
window.URL.revokeObjectURL(url)
```

---

## 🎯 Casos de Uso

### 1. Editor Visual Simples
```tsx
// Componente minimalista
function SimpleEditor({ cloneId }: { cloneId: string }) {
  const [html, setHtml] = useState('')

  useEffect(() => {
    fetch(`/api/clones/${cloneId}`)
      .then(r => r.json())
      .then(data => setHtml(data.html))
  }, [cloneId])

  const save = () => {
    fetch(`/api/clones/${cloneId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html }),
    })
  }

  return (
    <>
      <textarea value={html} onChange={e => setHtml(e.target.value)} />
      <button onClick={save}>Salvar</button>
    </>
  )
}
```

### 2. Monaco Editor (VS Code)
```tsx
import Editor from '@monaco-editor/react'

function AdvancedEditor({ cloneId }: { cloneId: string }) {
  const [html, setHtml] = useState('')

  // ... load clone

  return (
    <Editor
      height="600px"
      defaultLanguage="html"
      value={html}
      onChange={(value) => setHtml(value || '')}
      theme="vs-dark"
    />
  )
}
```

### 3. Preview em Tempo Real
```tsx
function LivePreview({ html }: { html: string }) {
  return (
    <iframe
      srcDoc={html}
      sandbox="allow-same-origin allow-scripts"
      className="w-full h-full"
    />
  )
}
```

---

## 🔄 Integração com UI Existente

### Adicionar ao Menu
```tsx
// hooks/use-route-tabs.ts
{ 
  path: '/clone-editor', 
  label: 'Editor', 
  icon: Edit, 
  badge: 0 
}
```

### Criar Página
```tsx
// app/(protected)/clone-editor/page.tsx
import CloneEditorPage from '@/components/clone-editor'

export default function Page() {
  return <CloneEditorPage />
}
```

---

## 🛠️ Funcionalidades Futuras

### 1. Listagem de Clones
```typescript
// GET /api/clones (adicionar no futuro)
const response = await fetch('/api/clones')
const clones = await response.json()

// Renderizar galeria
clones.map(clone => (
  <CloneCard
    key={clone.id}
    id={clone.id}
    url={clone.original_url}
    createdAt={clone.created_at}
  />
))
```

### 2. Deletar Clone
```typescript
// DELETE /api/clones/[id] (adicionar no futuro)
await fetch(`/api/clones/${cloneId}`, { method: 'DELETE' })
```

### 3. Duplicar Clone
```typescript
// POST /api/clones/[id]/duplicate (adicionar no futuro)
const response = await fetch(`/api/clones/${cloneId}/duplicate`, {
  method: 'POST',
})
const { cloneId: newId } = await response.json()
```

---

## 📦 Dependências Necessárias

Já instaladas no projeto:
- ✅ `@supabase/ssr` - Cliente Supabase
- ✅ `archiver` - Geração de ZIP
- ✅ `next` - Framework

Para editor avançado (opcional):
```bash
npm install @monaco-editor/react
# ou
npm install @codemirror/view @codemirror/lang-html
```

---

**Pronto para integrar na UI! 🚀**

