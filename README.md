# NoCry Offers

Sistema de gerenciamento de ofertas construído com Next.js 15, usando o mesmo projeto Supabase do NoCry Finance.

## 🚀 Stack Tecnológica

- **Next.js 15+** (App Router, TypeScript, Server Actions)
- **Tailwind CSS** para estilização
- **Supabase Auth** (@supabase/ssr) para autenticação SSR/Edge
- **Zod + React Hook Form** para validação de formulários
- **dnd-kit** para funcionalidade Kanban drag & drop
- **ESLint + Prettier + Husky** para qualidade de código

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Acesso ao projeto Supabase do NoCry Finance
- Usuário criado no Supabase Auth

## 🔧 Configuração Local

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Copie o arquivo `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

Edite `.env.local` com as credenciais do Supabase do NoCry Finance:

```env
NEXT_PUBLIC_SUPABASE_URL=sua-url-do-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-do-supabase
```

**IMPORTANTE:** Use as MESMAS credenciais do projeto NoCry Finance. NÃO crie um novo projeto Supabase.

### 3. Criar usuário no Supabase

Como o app não possui funcionalidade de signup, você precisa criar usuários manualmente:

1. Acesse o painel do Supabase: https://supabase.com/dashboard
2. Selecione o projeto do NoCry Finance
3. Vá em **Authentication** → **Users**
4. Clique em **Add user** → **Create new user**
5. Preencha:
   - Email: seu@email.com
   - Password: sua-senha-segura
   - **Marque**: "Auto Confirm User" (para pular confirmação de email)
6. Clique em **Create user**

### 4. Configurar Supabase Storage (para upload de arquivos)

Para permitir upload de arquivos (criativos, anexos, entregáveis):

1. Acesse: Storage → Buckets
2. Crie um bucket chamado **`offers-files`** (marque como **Privado**)
3. Configure políticas RLS:
   - Vá em: Storage → `offers-files` → **Policies**
   - Adicione as 4 políticas SQL (INSERT, SELECT, UPDATE, DELETE)
   - 📋 Ver políticas completas em: **`SOLUCAO-RAPIDA-UPLOAD.md`**

**Diagnóstico**: Acesse `/diagnostics/upload` no app para verificar se está tudo configurado.

### 5. Rodar o projeto

```bash
npm run dev
```

Acesse: http://localhost:3000

## 🔐 Autenticação

- O app usa **apenas email + senha** (sem signup, forgot password ou reset)
- Após criar o usuário no Supabase, faça login em `/login`
- Todas as rotas em `/ofertas/**` exigem autenticação
- Para sair, use o botão "Sair" no header

## 📊 Schemas do Banco de Dados

O app consome os schemas existentes no Supabase:

### Schema `core`
- Tabelas de usuários e organizações (se existirem)

### Schema `offers`
- `offers` - Ofertas principais
- `offer_creatives_original` - Criativos originais
- `offer_creatives_modeled` - Criativos modelados
- `offer_pages` - Páginas do funil
- `offer_bonuses` - Entregáveis/bônus
- `offer_upsells` - Upsells
- `offer_pixel` - Configuração de pixel (campos: pixel_meta, token, is_active, notes)
- `offer_attachments` - Anexos
- `offer_comments` - Comentários

**NÃO é necessário rodar migrations**. O banco de dados já deve estar configurado no Supabase.

## 📝 Como Usar

### Criando uma Nova Oferta

1. Acesse `/ofertas/new`
2. Preencha os campos obrigatórios:
   - **name**: Nome da oferta
   - **country**: País
   - **ad_library_url**: URL da biblioteca de anúncios
   - **original_funnel_url**: URL do funil original
3. Escolha a visibilidade:
   - **NoCry (geral)**: Visível para toda organização
   - **Apenas meu Squad**: Visível apenas para seu squad
   - **Personalizado**: Visibilidade customizada
4. Clique em "Criar Oferta"

**Campos Automáticos:**
- **org_id**: Preenchido automaticamente com a organização do usuário logado
- **owner_user_id**: Preenchido automaticamente com o ID do usuário logado
- **status**: Sempre definido como "Em análise" ao criar

**Importante:** O usuário precisa pertencer a uma organização (via `core.user_orgs` ou `core.squad_members`). Se aparecer erro "Nenhuma organização encontrada", é necessário:
1. Criar a organização NoCry no Supabase (tabela `core.orgs`)
2. Adicionar o usuário a um squad dessa organização (tabela `core.squad_members`)

### Usando o Kanban

- **Arrastar cards**: Arraste os cards entre as colunas para mudar o status
- **Filtros**: Use os filtros no topo para filtrar por Status, País ou Visibilidade
- **Clicar no card**: Clica no card para ver detalhes completos

### Gerenciando Detalhes da Oferta

Na página de detalhes (`/ofertas/[id]`), você tem acesso a 7 tabs:

1. **Resumo**: Visualizar/editar informações básicas da oferta
2. **Criativos**: Gerenciar criativos originais e modelados
3. **Páginas**: Cadastrar páginas do funil
4. **Entregáveis**: Listar bônus e entregáveis
5. **Upsell**: Configurar upsells
6. **Pixel**: Configurar pixel Meta com token (campos exatos: pixel_meta, token, is_active, notes)
7. **Anexos**: Adicionar anexos e comentários

## 🎨 Componentes UI

Todos os componentes UI estão em `/components/ui`:

- `Button` - Botões com variantes
- `Input` - Campos de entrada
- `Textarea` - Área de texto
- `Select` - Seleção dropdown
- `Label` - Rótulos de formulário
- `Badge` - Badges de status com cores específicas:
  - Descartada: zinc
  - Em análise: amber
  - Modelando: blue
  - Rodando: green
  - Pausada: slate
  - Encerrada: rose
- `VisibilityChip` - Chip de visibilidade (NoCry/Squad/Custom)
- `Card` - Container com estilo
- `Tabs` - Navegação por tabs

## 🏗️ Estrutura do Projeto

```
nocry-offers/
├── app/
│   ├── login/          # Página de login
│   ├── logout/         # Rota de logout
│   ├── ofertas/        # App principal
│   │   ├── page.tsx    # Kanban board
│   │   ├── new/        # Criar nova oferta
│   │   └── [id]/       # Detalhes da oferta
│   ├── layout.tsx      # Layout raiz
│   └── globals.css     # Estilos globais
├── components/
│   ├── ui/             # Componentes UI base
│   ├── kanban/         # Componentes do Kanban
│   ├── offer-details/  # Componentes de detalhes
│   └── header.tsx      # Header principal
├── lib/
│   ├── supabase/       # Configuração Supabase
│   ├── types.ts        # Tipos TypeScript
│   └── validations/    # Schemas Zod
└── middleware.ts       # Middleware de autenticação
```

## 🔒 RLS (Row Level Security)

O app respeita as políticas RLS configuradas no Supabase. Todas as queries usam o cliente autenticado (não service role), garantindo que apenas dados autorizados sejam acessados.

## 🚢 Deploy em Produção

### Variáveis de Ambiente para Produção

Adicione no Vercel/plataforma de deploy:

```env
NEXT_PUBLIC_SUPABASE_URL=sua-url-do-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-do-supabase
AUTH_COOKIE_DOMAIN=.theresnocry.com
```

A variável `AUTH_COOKIE_DOMAIN` é necessária para compartilhar autenticação entre subdomínios.

## 🛠️ Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Iniciar em produção
npm start

# Lint
npm run lint

# Formatar código
npm run format
```

## 🐛 Troubleshooting

### "Credenciais inválidas" ao fazer login

- Verifique se o usuário foi criado no Supabase
- Confirme que marcou "Auto Confirm User" ao criar o usuário
- Verifique se está usando as credenciais corretas do Supabase no `.env.local`

### "Nenhuma organização encontrada" ao criar oferta

- O usuário precisa estar vinculado a uma organização
- Verifique se existe registro em `core.user_orgs` ou `core.squad_members` para esse usuário
- Se necessário, crie uma organização em `core.orgs` e adicione o usuário a ela

### Redirect infinito ou sessão não persiste

- Confirme que está usando `@supabase/ssr` (não `@supabase/auth-helpers-nextjs`)
- Verifique se o middleware está configurado corretamente
- Limpe cookies do navegador e tente novamente

### Erro de CORS

- Verifique se a URL do Supabase está correta no `.env.local`
- No dashboard do Supabase, vá em Settings → API → Additional allowed origins e adicione `http://localhost:3000`

## 🔍 FunilSpy

O FunilSpy é uma ferramenta para consultar Certificate Transparency via crt.sh e realizar pesquisas web (dorks) para descobrir subdomínios e páginas relacionadas a um domínio.

### Como Usar

1. Acesse `/funilspy` no navegador
2. Cole um domínio ou URL (ex.: `metododareconquistadefinitiva.com` ou `https://example.com`)
3. Clique em "Buscar"
4. Visualize duas seções de resultados:
   - **CRT.sh**: Tabela com hostnames encontrados via Certificate Transparency
   - **Pesquisa web (inurl:)**: Lista de páginas web encontradas com o domínio na URL

### APIs

#### API CRT

A API está disponível em `/api/crt?domain={domain}`:

```bash
curl "http://localhost:3000/api/crt?domain=metododareconquistadefinitiva.com"
```

**Resposta:**
```json
{
  "domain": "metododareconquistadefinitiva.com",
  "count": 42,
  "results": [
    {
      "hostname": "a.example.com",
      "not_before": "2023-01-01T00:00:00Z",
      "not_after": "2024-01-01T00:00:00Z",
      "issuer": "Let's Encrypt"
    }
  ]
}
```

#### API Dorks (Pesquisa Web)

A API está disponível em `/api/dorks?domain={domainOrQuery}&start={start?}` (usa exclusivamente SerpAPI):

```bash
# Buscar resultados agregados (site + inurl)
curl "http://localhost:3000/api/dorks?domain=metododareconquistadefinitiva.com"

# Usar start=100 para próxima página
curl "http://localhost:3000/api/dorks?domain=metododareconquistadefinitiva.com&start=100"
```

**Resposta:**
```json
{
  "domain": "metododareconquistadefinitiva.com",
  "queries": ["inurl:metododareconquistadefinitiva.com/", "site:metododareconquistadefinitiva.com"],
  "count": 123,
  "results": [
    {
      "title": "Página encontrada",
      "link": "https://metododareconquistadefinitiva.com/path",
      "snippet": "Descrição da página...",
      "source": "serpapi"
    }
  ]
}
```

**Características:**
- **SerpAPI exclusivo**: Requer `SERPAPI_KEY` no `.env.local` (ou Environment Variables da Vercel em produção)
- **Duas queries complementares**: Faz `site:{domain}` e `inurl:{domain}/` em paralelo e agrega resultados
- **Extração robusta de URLs**: Extrai URLs de vários campos da resposta SerpAPI (link, url, displayed_link, etc.)
- **Deduplicação inteligente**: Prioriza links com path sobre links sem path, mantém snippet maior em duplicatas
- **Cache automático**: Usa `lib/cache.ts` com TTL configurável via `CACHE_TTL` (padrão: 3600s)
- **Retry automático**: Em caso de rate limit (429), faz retry com backoff exponencial (2s, depois 4s)
- **Paginação**: Suporta parâmetro `start` para buscar páginas subsequentes (ex: start=0, start=100, start=200)
- **Limite**: Máximo de 200 resultados por resposta
- **Headers**: Respostas incluem `X-Cache: HIT` ou `X-Cache: MISS`

### Cache e Rate Limiting

O FunilSpy implementa cache e rate limiting opcionais:

- **Upstash Redis** (se `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` estiverem configurados):
  - Cache distribuído (compartilhado entre instâncias Serverless)
  - Rate limiting por IP (padrão: 10 req/min)
- **Map em memória** (fallback quando Upstash não está configurado):
  - Cache local por instância
  - Sem rate limiting (apenas backoff local em caso de 429 do crt.sh)
- **TTL padrão**: 3600 segundos (1 hora) - configurável via `CACHE_TTL`

Respostas cacheadas incluem o header `X-Cache: HIT`, enquanto respostas novas incluem `X-Cache: MISS`.

### Configuração na Vercel

1. Acesse [Upstash Console](https://console.upstash.com/)
2. Crie um novo banco Redis
3. Copie a **REST URL** e **REST TOKEN**
4. Adicione no painel da Vercel (Settings → Environment Variables):

```env
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
CACHE_TTL=3600
RATE_LIMIT_PER_MINUTE=10
```

### Configuração Local

Adicione no `.env.local`:

```env
# Upstash Redis (opcional - para cache distribuído e rate limiting)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# TTL do cache em segundos (padrão: 3600 = 1 hora)
CACHE_TTL=3600

# Rate limit por minuto (padrão: 10) - só funciona se Upstash estiver configurado
RATE_LIMIT_PER_MINUTE=10

# Dorks - Pesquisa Web (SerpAPI exclusivo)
# ⚠️ IMPORTANTE: NÃO COMMITE CHAVES REAIS EM REPOSITÓRIOS PÚBLICOS
# Para produção, use Environment Variables da Vercel
SERPAPI_KEY=a0908f8bcc5a0f987d674072c5d03dc568cfa42f8367529881890643da6d8265
# Tempo de cache em segundos (default 3600)
CACHE_TTL=3600
```

**⚠️ Segurança:** A chave SerpAPI no `.env.example` é apenas para testes locais. Para produção na Vercel:
1. Acesse o painel da Vercel → Settings → Environment Variables
2. Adicione `SERPAPI_KEY` com sua chave real
3. **NÃO** commite a chave no repositório

### Observações Importantes

⚠️ **Este serviço usa crt.sh (público) e APIs de busca. Respeite as regras e não faça scraping massivo sem autorização. Use cache e limites.**

**CRT.sh:**
- O FunilSpy implementa retry com backoff exponencial em caso de rate limit (429): 2s, depois 4s (máximo 2 tentativas)
- Requests concorrentes para o mesmo domínio são agrupados automaticamente
- Os dados são deduplicados e ordenados alfabeticamente

**Dorks (Pesquisa Web):**
- **SerpAPI exclusivo**: Usa apenas SerpAPI (Google engine), requer `SERPAPI_KEY` no `.env.local`
- **Cache automático**: Usa `lib/cache.ts` com TTL configurável via `CACHE_TTL` (padrão: 3600s)
- **Retry automático**: Em caso de rate limit (429), faz retry com backoff exponencial (2s, depois 4s)
- **Deduplicação**: Remove duplicatas por link (case-insensitive) e limita a 50 resultados
- **Headers de cache**: Respostas incluem `X-Cache: HIT` ou `X-Cache: MISS`

**Runtime:** Node.js (melhor compatibilidade com fetch, Upstash e cheerio)

## 📚 Recursos

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [dnd-kit Documentation](https://docs.dndkit.com/)
- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)

## 📄 Licença

Propriedade de NoCry Finance.

## 👥 Suporte

Para dúvidas ou problemas, entre em contato com a equipe de desenvolvimento.

