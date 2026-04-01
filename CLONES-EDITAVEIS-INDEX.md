# 📚 Índice - Documentação de Clones Editáveis

Sistema completo de clones editáveis de landing pages com API REST e armazenamento em banco.

---

## 🚀 Começar Aqui

### Para Desenvolvedores
1. **[Setup Rápido](CLONES-EDITAVEIS-SETUP.md)** ⚡
   - 3 passos para ativar o sistema
   - Aplicar migração, testar API, criar UI

### Para Entender o Sistema
2. **[Resumo Executivo](CLONES-EDITAVEIS-RESUMO.md)** 📋
   - Visão geral do que foi implementado
   - Status atual e próximos passos
   - Comparação com `/api/clone` existente

---

## 📖 Documentação Técnica

### API
3. **[README da API](CLONES-EDITAVEIS-README.md)** 🛣️
   - Documentação completa das 4 rotas
   - Request/Response de cada endpoint
   - Autenticação e RLS
   - Estrutura da tabela

### Exemplos de Código
4. **[Exemplos de Uso](CLONES-EDITAVEIS-EXEMPLO-USO.md)** 🎨
   - Componente React completo
   - Exemplos de fetch para cada rota
   - Integração com Monaco Editor
   - Preview em tempo real

### Testes
5. **[Guia de Testes](CLONES-EDITAVEIS-TESTE.md)** 🧪
   - Testes via curl
   - Testes via console do navegador
   - Testes de erro
   - Verificações no Supabase
   - Troubleshooting

---

## 🗂️ Arquivos do Sistema

### Rotas da API
```
app/api/clones/
├── route.ts                    # POST - Criar clone
└── [id]/
    ├── route.ts                # GET/PUT - Buscar/Atualizar
    └── zip/
        └── route.ts            # POST - Gerar ZIP
```

### Migração
```
migrations/20250128000000_cloned_pages.sql
```

### Documentação
```
CLONES-EDITAVEIS-INDEX.md       # Este arquivo
CLONES-EDITAVEIS-SETUP.md       # Setup rápido
CLONES-EDITAVEIS-RESUMO.md      # Resumo executivo
CLONES-EDITAVEIS-README.md      # Documentação da API
CLONES-EDITAVEIS-EXEMPLO-USO.md # Exemplos de código
CLONES-EDITAVEIS-TESTE.md       # Guia de testes
```

---

## 🎯 Fluxo de Uso

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUXO COMPLETO                           │
└─────────────────────────────────────────────────────────────┘

1. Criar Clone
   POST /api/clones { url: "https://example.com" }
   ↓
   Retorna { cloneId: "uuid" }

2. Buscar Clone
   GET /api/clones/{id}
   ↓
   Retorna { id, original_url, html, css, js, ... }

3. Editar HTML (na UI)
   ↓
   Usuário modifica HTML no editor

4. Salvar Edições
   PUT /api/clones/{id} { html: "..." }
   ↓
   Atualiza banco

5. Baixar ZIP
   POST /api/clones/{id}/zip
   ↓
   Retorna ZIP com index.html editado
```

---

## 🔑 Conceitos Principais

### 1. Separação de Responsabilidades
- **`/api/clone`** (existente): Clone completo com assets → ZIP imediato
- **`/api/clones`** (novo): Clone editável → Banco → ZIP on-demand

### 2. Autenticação
- Usa `getServerClient()` do projeto
- RLS garante isolamento por usuário
- Todas as rotas verificam `auth.getUser()`

### 3. Storage
- HTML salvo em `public.cloned_pages` (Postgres)
- ZIPs gerados em `public/clone-edited-jobs/` (filesystem)
- ZIPs não versionados (`.gitignore`)

---

## 📊 Status de Implementação

| Componente | Status | Arquivo |
|------------|--------|---------|
| Tabela no banco | ✅ | `migrations/20250128000000_cloned_pages.sql` |
| RLS e políticas | ✅ | Incluído na migração |
| POST /api/clones | ✅ | `app/api/clones/route.ts` |
| GET /api/clones/[id] | ✅ | `app/api/clones/[id]/route.ts` |
| PUT /api/clones/[id] | ✅ | `app/api/clones/[id]/route.ts` |
| POST /api/clones/[id]/zip | ✅ | `app/api/clones/[id]/zip/route.ts` |
| Documentação | ✅ | 6 arquivos markdown |
| Testes | ⏳ | Aguardando migração |
| UI de edição | ⏳ | Próxima etapa |

---

## 🚀 Próximos Passos

### Curto Prazo
1. Aplicar migração no Supabase
2. Testar rotas via console
3. Criar UI básica de edição

### Médio Prazo
4. Listagem de clones (`GET /api/clones`)
5. Deletar clone (`DELETE /api/clones/[id]`)
6. Monaco Editor ou CodeMirror

### Longo Prazo
7. Suporte a CSS/JS customizado
8. Versionamento (histórico de edições)
9. Compartilhamento e colaboração

---

## 🆘 Precisa de Ajuda?

### Problemas de Setup
→ Veja [CLONES-EDITAVEIS-SETUP.md](CLONES-EDITAVEIS-SETUP.md)

### Erros na API
→ Veja [CLONES-EDITAVEIS-TESTE.md](CLONES-EDITAVEIS-TESTE.md) seção "Troubleshooting"

### Dúvidas sobre Implementação
→ Veja [CLONES-EDITAVEIS-README.md](CLONES-EDITAVEIS-README.md)

### Exemplos de Código
→ Veja [CLONES-EDITAVEIS-EXEMPLO-USO.md](CLONES-EDITAVEIS-EXEMPLO-USO.md)

---

## 📝 Changelog

### v1.0.0 (2025-01-28)
- ✅ Sistema completo de clones editáveis
- ✅ 4 rotas da API implementadas
- ✅ Migração SQL com RLS
- ✅ Documentação completa
- ✅ Exemplos de uso em React
- ✅ Guia de testes

---

**Desenvolvido para edição visual de landing pages! 🎨**

**Comece pelo [Setup Rápido](CLONES-EDITAVEIS-SETUP.md) →**








