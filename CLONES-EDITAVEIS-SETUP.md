# ⚡ Setup Rápido - Clones Editáveis

## 🚀 3 Passos para Ativar

### 1️⃣ Aplicar Migração no Supabase

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Copie o conteúdo de `migrations/20250128000000_cloned_pages.sql`
5. Cole no editor
6. Clique em **Run**

**Verificar:**
```sql
-- Deve retornar a tabela
SELECT * FROM public.cloned_pages LIMIT 1;
```

---

### 2️⃣ Testar API

Abra o console do navegador (já logado no app):

```javascript
// Criar clone
const res = await fetch('/api/clones', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://example.com' }),
})

const { cloneId } = await res.json()
console.log('✅ Clone criado:', cloneId)

// Buscar clone
const res2 = await fetch(`/api/clones/${cloneId}`)
const clone = await res2.json()
console.log('✅ HTML:', clone.html.substring(0, 100) + '...')

// Baixar ZIP
const res3 = await fetch(`/api/clones/${cloneId}/zip`, { method: 'POST' })
const blob = await res3.blob()
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = 'teste.zip'
a.click()
console.log('✅ ZIP baixado!')
```

---

### 3️⃣ Criar UI (Opcional)

Crie `app/(protected)/clone-editor/page.tsx`:

```tsx
'use client'

import { useState } from 'react'

export default function CloneEditorPage() {
  const [url, setUrl] = useState('')
  const [cloneId, setCloneId] = useState<string | null>(null)
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    setLoading(true)
    const res = await fetch('/api/clones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    const { cloneId: id } = await res.json()
    setCloneId(id)

    const res2 = await fetch(`/api/clones/${id}`)
    const clone = await res2.json()
    setHtml(clone.html)
    setLoading(false)
  }

  const handleSave = async () => {
    setLoading(true)
    await fetch(`/api/clones/${cloneId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html }),
    })
    alert('Salvo!')
    setLoading(false)
  }

  const handleDownload = async () => {
    const res = await fetch(`/api/clones/${cloneId}/zip`, { method: 'POST' })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'clone.zip'
    a.click()
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Editor de Clones</h1>

      {!cloneId ? (
        <div className="flex gap-4 mb-6">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 px-4 py-2 border rounded"
          />
          <button
            onClick={handleCreate}
            disabled={loading}
            className="px-6 py-2 bg-blue-500 text-white rounded"
          >
            Criar Clone
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-4">
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded"
            >
              Salvar
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-purple-500 text-white rounded"
            >
              Baixar ZIP
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

          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            className="w-full h-96 p-4 border rounded font-mono text-sm"
          />

          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Preview</h3>
            <iframe
              srcDoc={html}
              className="w-full h-96 border rounded"
              sandbox="allow-same-origin"
            />
          </div>
        </>
      )}
    </div>
  )
}
```

Adicione ao menu em `hooks/use-route-tabs.ts`:

```typescript
{ path: '/clone-editor', label: 'Editor', icon: Edit, badge: 0 }
```

---

## ✅ Checklist

- [ ] Migração aplicada no Supabase
- [ ] Teste via console do navegador funcionou
- [ ] Tabela `cloned_pages` visível no Supabase
- [ ] RLS habilitado (políticas ativas)
- [ ] Pasta `public/clone-edited-jobs/` criada
- [ ] `.gitignore` atualizado
- [ ] (Opcional) UI criada em `/clone-editor`

---

## 🆘 Problemas Comuns

### "Não autenticado"
- Faça login no app
- Verifique cookies no DevTools

### "Clone não encontrado"
- Verifique se aplicou a migração
- Verifique RLS no Supabase

### "Falha ao buscar página"
- Use `https://example.com` (sempre funciona)
- Verifique se a URL é pública

---

## 📚 Documentação Completa

- `CLONES-EDITAVEIS-README.md` - Documentação da API
- `CLONES-EDITAVEIS-EXEMPLO-USO.md` - Exemplos de código
- `CLONES-EDITAVEIS-TESTE.md` - Guia de testes
- `CLONES-EDITAVEIS-RESUMO.md` - Resumo executivo

---

**Pronto em 3 passos! 🚀**

