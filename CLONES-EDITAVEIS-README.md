# 📝 Clones Editáveis - API de Edição Visual

Sistema separado do `/api/clone` (que gera ZIP completo). Este fluxo salva HTML no banco para edição visual futura.

## 🗄️ Tabela: `public.cloned_pages`

```sql
id uuid PRIMARY KEY
user_id uuid NOT NULL
original_url text NOT NULL
html text NOT NULL
css text (futuro)
js text (futuro)
created_at timestamptz
updated_at timestamptz
```

**RLS habilitado**: usuários só acessam seus próprios clones.

## 🛣️ Rotas da API

### 1. `POST /api/clones`

Cria um novo clone salvando HTML cru no banco.

**Request:**
```json
{
  "url": "https://example.com"
}
```

**Response (201):**
```json
{
  "cloneId": "uuid-do-clone"
}
```

**Erros:**
- `400`: URL inválida ou HTML vazio
- `401`: Não autenticado
- `502`: Falha ao buscar página
- `500`: Erro ao salvar no banco

**Comportamento:**
- Faz `fetch()` da URL com User-Agent `NoCryCloneBot/1.0`
- Valida que retornou `text/html`
- Salva HTML cru (sem baixar assets)
- Retorna ID do clone criado

---

### 2. `GET /api/clones/[id]`

Retorna um clone específico do usuário logado.

**Response (200):**
```json
{
  "id": "uuid",
  "original_url": "https://example.com",
  "html": "<!DOCTYPE html>...",
  "css": null,
  "js": null,
  "created_at": "2025-01-28T...",
  "updated_at": "2025-01-28T..."
}
```

**Erros:**
- `401`: Não autenticado
- `404`: Clone não encontrado ou não pertence ao usuário

---

### 3. `PUT /api/clones/[id]`

Atualiza o HTML de um clone.

**Request:**
```json
{
  "html": "<!DOCTYPE html>..."
}
```

**Response (200):**
```json
{
  "success": true
}
```

**Erros:**
- `400`: HTML inválido
- `401`: Não autenticado
- `404`: Clone não encontrado
- `500`: Erro ao atualizar

---

### 4. `POST /api/clones/[id]/zip`

Gera e retorna ZIP do clone editado.

**Response (200):**
- Binary ZIP file
- Headers:
  - `Content-Type: application/zip`
  - `Content-Disposition: attachment; filename="nocry-clone-edited.zip"`

**Estrutura do ZIP:**
```
nocry-clone-edited.zip
└── index.html (HTML editado)
```

**Erros:**
- `401`: Não autenticado
- `404`: Clone não encontrado
- `500`: Erro ao gerar ZIP

**Comportamento:**
1. Cria pasta temporária em `public/clone-edited-jobs/edit-{id}-{timestamp}/`
2. Escreve `index.html` com o HTML do banco
3. Gera ZIP usando `archiver`
4. Retorna ZIP como download
5. Limpa pasta temporária (mantém ZIP)

---

## 🔐 Autenticação

Todas as rotas usam o padrão existente do projeto:

```typescript
import { getServerClient } from '@/lib/supabase/server'

const supabase = await getServerClient()
const { data: { user }, error } = await supabase.auth.getUser()

if (error || !user) {
  return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
}
```

## 🧪 Testando

### 1. Criar um clone

```bash
curl -X POST http://localhost:3000/api/clones \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-..." \
  -d '{"url": "https://example.com"}'
```

**Resposta:**
```json
{"cloneId": "123e4567-e89b-12d3-a456-426614174000"}
```

### 2. Buscar o clone

```bash
curl http://localhost:3000/api/clones/123e4567-e89b-12d3-a456-426614174000 \
  -H "Cookie: sb-..."
```

### 3. Atualizar HTML

```bash
curl -X PUT http://localhost:3000/api/clones/123e4567-e89b-12d3-a456-426614174000 \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-..." \
  -d '{"html": "<!DOCTYPE html><html>...</html>"}'
```

### 4. Baixar ZIP

```bash
curl -X POST http://localhost:3000/api/clones/123e4567-e89b-12d3-a456-426614174000/zip \
  -H "Cookie: sb-..." \
  -o clone-edited.zip
```

---

## 📁 Estrutura de Arquivos

```
app/api/clones/
├── route.ts              # POST /api/clones
└── [id]/
    ├── route.ts          # GET, PUT /api/clones/[id]
    └── zip/
        └── route.ts      # POST /api/clones/[id]/zip

public/
└── clone-edited-jobs/    # ZIPs gerados (gitignored)
    ├── edit-{id}-{ts}/   # Pasta temporária
    └── edit-{id}-{ts}.zip

migrations/
└── 20250128000000_cloned_pages.sql
```

---

## 🆚 Diferenças: `/api/clone` vs `/api/clones`

| Aspecto | `/api/clone` | `/api/clones` |
|---------|--------------|---------------|
| **Propósito** | Clone completo (HTML + assets) | Edição visual (só HTML) |
| **Storage** | Apenas ZIP em `public/clone-jobs/` | Banco `cloned_pages` + ZIP on-demand |
| **Assets** | Baixa CSS/JS/imagens/vídeos | Não baixa assets |
| **Reescrita URLs** | Sim (URLs locais) | Não |
| **Edição** | Não (ZIP final) | Sim (PUT para atualizar) |
| **Uso** | Download imediato | Salvar → Editar → Baixar |

---

## 🚀 Próximos Passos (Futuro)

1. **UI de edição visual**:
   - Monaco Editor ou CodeMirror para editar HTML
   - Preview em iframe
   - Botão "Salvar" (PUT) e "Baixar ZIP" (POST zip)

2. **Suporte a CSS/JS customizado**:
   - Campos `css` e `js` na tabela
   - Injetar no HTML antes de gerar ZIP

3. **Listagem de clones**:
   - `GET /api/clones` (lista todos do usuário)
   - UI tipo galeria com thumbnails

4. **Versionamento**:
   - Tabela `cloned_pages_versions`
   - Histórico de edições

5. **Compartilhamento**:
   - Gerar link público temporário
   - Colaboração em tempo real

---

## ⚠️ Notas Importantes

- **Não mexe no `/api/clone` existente**: são fluxos separados
- **RLS habilitado**: segurança por usuário
- **ZIPs temporários**: limpar periodicamente `public/clone-edited-jobs/`
- **HTML cru**: não sanitiza (assumimos confiança no usuário)
- **Sem assets**: para clone completo, use `/api/clone`

---

**Desenvolvido para edição visual de landing pages! 🎨**

