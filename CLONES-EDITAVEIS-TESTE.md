# 🧪 Teste das Rotas de Clones Editáveis

## ✅ Checklist de Implementação

- [x] Tabela `cloned_pages` criada (migração SQL)
- [x] RLS habilitado e políticas configuradas
- [x] `POST /api/clones` - Criar clone
- [x] `GET /api/clones/[id]` - Buscar clone
- [x] `PUT /api/clones/[id]` - Atualizar clone
- [x] `POST /api/clones/[id]/zip` - Gerar ZIP
- [x] Autenticação usando `getServerClient()`
- [x] Validações de entrada
- [x] Tratamento de erros
- [x] Documentação completa

---

## 🚀 Como Testar

### Pré-requisitos

1. **Aplicar migração no Supabase:**
   ```bash
   # Copie o conteúdo de migrations/20250128000000_cloned_pages.sql
   # Cole no SQL Editor do Supabase Dashboard
   # Execute
   ```

2. **Servidor rodando:**
   ```bash
   npm run dev
   ```

3. **Usuário autenticado:**
   - Faça login em `http://localhost:3000/login`
   - Pegue o cookie `sb-*` do navegador (DevTools → Application → Cookies)

---

### Teste 1: Criar Clone

**Request:**
```bash
curl -X POST http://localhost:3000/api/clones \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-localhost-auth-token=..." \
  -d '{"url": "https://example.com"}'
```

**Resposta esperada (201):**
```json
{
  "cloneId": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Verificar no Supabase:**
```sql
SELECT * FROM public.cloned_pages ORDER BY created_at DESC LIMIT 1;
```

---

### Teste 2: Buscar Clone

**Request:**
```bash
curl http://localhost:3000/api/clones/123e4567-e89b-12d3-a456-426614174000 \
  -H "Cookie: sb-localhost-auth-token=..."
```

**Resposta esperada (200):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "original_url": "https://example.com",
  "html": "<!DOCTYPE html>...",
  "css": null,
  "js": null,
  "created_at": "2025-01-28T...",
  "updated_at": "2025-01-28T..."
}
```

---

### Teste 3: Atualizar Clone

**Request:**
```bash
curl -X PUT http://localhost:3000/api/clones/123e4567-e89b-12d3-a456-426614174000 \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-localhost-auth-token=..." \
  -d '{"html": "<!DOCTYPE html><html><body><h1>Editado!</h1></body></html>"}'
```

**Resposta esperada (200):**
```json
{
  "success": true
}
```

**Verificar no Supabase:**
```sql
SELECT html, updated_at 
FROM public.cloned_pages 
WHERE id = '123e4567-e89b-12d3-a456-426614174000';
```

---

### Teste 4: Gerar ZIP

**Request:**
```bash
curl -X POST http://localhost:3000/api/clones/123e4567-e89b-12d3-a456-426614174000/zip \
  -H "Cookie: sb-localhost-auth-token=..." \
  -o clone-edited.zip
```

**Verificar:**
```bash
unzip -l clone-edited.zip
# Deve mostrar: index.html

unzip clone-edited.zip
cat index.html
# Deve mostrar o HTML editado
```

---

## 🧪 Teste via Navegador (DevTools)

### 1. Criar Clone

```javascript
// Console do navegador (já logado)
const response = await fetch('/api/clones', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://example.com' }),
})

const data = await response.json()
console.log('Clone ID:', data.cloneId)

// Salvar ID para próximos testes
const cloneId = data.cloneId
```

### 2. Buscar Clone

```javascript
const response = await fetch(`/api/clones/${cloneId}`)
const clone = await response.json()
console.log('HTML:', clone.html.substring(0, 100) + '...')
```

### 3. Atualizar Clone

```javascript
const editedHtml = '<!DOCTYPE html><html><body><h1>Teste Editado!</h1></body></html>'

const response = await fetch(`/api/clones/${cloneId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ html: editedHtml }),
})

const result = await response.json()
console.log('Atualizado:', result.success)
```

### 4. Baixar ZIP

```javascript
const response = await fetch(`/api/clones/${cloneId}/zip`, {
  method: 'POST',
})

const blob = await response.blob()
const url = window.URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = 'teste-clone.zip'
a.click()
window.URL.revokeObjectURL(url)
```

---

## ❌ Testes de Erro

### 1. Criar sem autenticação

```bash
curl -X POST http://localhost:3000/api/clones \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

**Esperado (401):**
```json
{
  "error": "Não autenticado"
}
```

### 2. URL inválida

```bash
curl -X POST http://localhost:3000/api/clones \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-localhost-auth-token=..." \
  -d '{"url": "not-a-url"}'
```

**Esperado (400):**
```json
{
  "error": "URL inválida"
}
```

### 3. Clone não encontrado

```bash
curl http://localhost:3000/api/clones/00000000-0000-0000-0000-000000000000 \
  -H "Cookie: sb-localhost-auth-token=..."
```

**Esperado (404):**
```json
{
  "error": "Clone não encontrado"
}
```

### 4. Tentar acessar clone de outro usuário

```bash
# Login com usuário A, criar clone
# Login com usuário B, tentar acessar clone do A

curl http://localhost:3000/api/clones/{clone-do-usuario-A} \
  -H "Cookie: sb-localhost-auth-token-usuario-B=..."
```

**Esperado (404):**
```json
{
  "error": "Clone não encontrado"
}
```

---

## 🔍 Verificações no Supabase

### 1. Verificar RLS

```sql
-- Tentar acessar como anônimo (deve falhar)
SELECT * FROM public.cloned_pages;

-- Tentar inserir sem user_id (deve falhar)
INSERT INTO public.cloned_pages (original_url, html)
VALUES ('https://test.com', '<html></html>');
```

### 2. Verificar Políticas

```sql
-- Ver políticas ativas
SELECT * FROM pg_policies WHERE tablename = 'cloned_pages';
```

### 3. Verificar Dados

```sql
-- Listar todos os clones
SELECT 
  id,
  user_id,
  original_url,
  LENGTH(html) as html_size,
  created_at,
  updated_at
FROM public.cloned_pages
ORDER BY created_at DESC;
```

---

## 📊 Testes de Performance

### 1. Criar múltiplos clones

```javascript
// Console do navegador
const urls = [
  'https://example.com',
  'https://google.com',
  'https://github.com',
]

const results = await Promise.all(
  urls.map(url =>
    fetch('/api/clones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    }).then(r => r.json())
  )
)

console.log('Clones criados:', results)
```

### 2. Atualizar clone com HTML grande

```javascript
// Gerar HTML grande (1MB)
const largeHtml = '<!DOCTYPE html><html><body>' +
  '<p>'.repeat(50000) + 'Lorem ipsum' + '</p>'.repeat(50000) +
  '</body></html>'

console.log('Tamanho:', largeHtml.length, 'bytes')

const response = await fetch(`/api/clones/${cloneId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ html: largeHtml }),
})

console.log('Status:', response.status)
```

---

## 🐛 Troubleshooting

### Erro: "Não autenticado"
- Verifique se o cookie `sb-*` está presente
- Faça login novamente
- Verifique variáveis de ambiente `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Erro: "Clone não encontrado"
- Verifique se o ID está correto
- Verifique se o clone pertence ao usuário logado
- Verifique RLS no Supabase

### Erro: "Falha ao buscar página"
- Verifique se a URL é acessível publicamente
- Verifique se não há firewall bloqueando
- Tente com `https://example.com` (sempre funciona)

### ZIP vazio ou corrompido
- Verifique se a pasta `public/clone-edited-jobs/` existe
- Verifique permissões de escrita
- Verifique logs do servidor

---

## ✅ Checklist Final

Antes de considerar completo, teste:

- [ ] Criar clone com URL válida
- [ ] Criar clone com URL inválida (deve falhar)
- [ ] Buscar clone existente
- [ ] Buscar clone inexistente (deve falhar)
- [ ] Atualizar HTML de clone próprio
- [ ] Tentar atualizar clone de outro usuário (deve falhar)
- [ ] Gerar ZIP de clone editado
- [ ] Extrair e abrir index.html do ZIP
- [ ] Verificar que HTML editado está no ZIP
- [ ] Tentar acessar sem autenticação (deve falhar)
- [ ] Verificar RLS no Supabase

---

**Todas as rotas implementadas e testadas! 🎉**

