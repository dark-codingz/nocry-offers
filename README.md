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

