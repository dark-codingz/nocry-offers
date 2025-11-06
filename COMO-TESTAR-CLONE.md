# 🧪 Como Testar o Clone Tool

## ✅ Status

**Build compilando sem erros!** ✅

Rotas criadas:
- `/clone` - Interface principal
- `/api/clone/start` - Iniciar clonagem
- `/api/clone/status` - Status do job

---

## 🚀 Teste Rápido

### 1. Inicie o servidor

```bash
npm run dev
```

### 2. Acesse

```
http://localhost:3000/clone
```

### 3. Configure

- **URL**: `http://localhost:8000` (ou qualquer site público)
- **Renderizar JS**: ✅
- **Remover Trackers**: ✅
- **Sanitizar Forms**: ✅
- **Concorrência**: 10

### 4. Clique em "Clonar"

Observe o terminal mostrando:
```
$ Created working directory
$ Puppeteer browser launched
$ Navigating to: http://localhost:8000
$ HTML content captured
$ HTML parsed
$ Trackers removed from HTML
$ Forms sanitized
$ Found X assets to download
$ Downloaded X/X assets
$ Final HTML saved
$ ZIP archive created
$ Clone completed successfully
```

### 5. Baixe o ZIP

Botão "⬇️ Baixar ZIP" aparecerá quando concluído.

---

## ⚠️ Aviso sobre Puppeteer

O Puppeteer **só funciona em ambiente Node.js** completo:

### ✅ Funciona em:
- Desenvolvimento local (`npm run dev`)
- Servidor Node.js próprio
- Docker com Node.js

### ❌ NÃO funciona em:
- Vercel serverless
- Netlify serverless
- Cloudflare Workers
- Funções serverless

### Para Deploy Produção:

Para usar em produção serverless, você precisaria:
1. Usar `puppeteer-core` + chromium fornecido
2. Ou usar serviço externo (Browserless.io, Apify)
3. Ou rodar em servidor dedicado

---

## 📋 Checklist de Teste

Teste básico:
- [ ] Servidor local inicia sem erros
- [ ] Página `/clone` carrega
- [ ] Formulário permite inserir URL
- [ ] Click em "Clonar" inicia o processo
- [ ] Terminal mostra logs em tempo real
- [ ] Botão de download aparece ao concluir

Teste avançado:
- [ ] Clone funciona com site externo (exemplo.com)
- [ ] Assets são baixados corretamente
- [ ] HTML abre localmente após extrair ZIP
- [ ] Trackers foram removidos
- [ ] Forms foram sanitizados
- [ ] Imagens carregam no HTML local

---

## 🎯 URLs para Testar

**Sites simples:**
- http://localhost:8000 (test-server.html criado)
- https://example.com
- Qualquer landing page pública

**Evite testar:**
- Sites com autenticação obrigatória
- Sites com proteção anti-bot
- Sites muito grandes (milhares de assets)

---

## 📝 Notas

O Puppeteer será instalado automaticamente com ~300MB. Na primeira execução, o Chromium é baixado se necessário.

---

**Pronto para teste educacional! 🚀**


