# Clone Tool - Landing Page Cloner

Ferramenta para clonar landing pages completas com todos os assets, removendo trackers e sanitizando formulários.

## 🎯 Funcionalidades

- ✅ **Renderização com Puppeteer**: Opção de renderizar JavaScript ou apenas HTML estático
- ✅ **Download automático de assets**: Images, CSS, JS, videos, iframes do mesmo domínio
- ✅ **Reescrita de URLs**: URLs relativas apontando para arquivos locais
- ✅ **Remoção de trackers**: Google Analytics, GTM, Facebook Pixel, Hotjar, Segment e mais
- ✅ **Sanitização de forms**: Remove actions e event handlers perigosos
- ✅ **Controle de concorrência**: Configuravel (1-20 downloads simultâneos)
- ✅ **Geração de ZIP**: Arquivo pronto para download
- ✅ **Terminal visual**: Logs em tempo real da operação

## 🚀 Como Usar

### 1. Acesse a Página

Navegue para `/clone` (rota protegida - requer login).

### 2. Configure os Parâmetros

- **URL**: Digite a URL da landing page a clonar
- **Renderizar JS**: Marque para aguardar JavaScript executar
- **Remover Trackers**: Remove scripts de tracking (padrão: ativado)
- **Sanitizar Forms**: Remove actions e handlers de formulários
- **Concorrência**: Downloads simultâneos (padrão: 10)

### 3. Inicie a Clonagem

Clique em **Clonar** e observe o terminal mostrando:
- Navegação para a página
- Parse do HTML
- Download de cada asset
- Geração do ZIP
- Link de download aparecerá quando concluído

### 4. Baixe o Resultado

Ao concluir, um botão **Baixar ZIP** aparecerá. O ZIP contém:
- `index.html`: HTML processado
- Assets baixados na estrutura original
- Funciona offline

## ⚙️ Configurações Avançadas

### Remover Trackers

A lista de trackers removidos está em `lib/clone/crawler.ts`:

```typescript
const TRACKERS_TO_REMOVE = [
  'google-analytics.com',
  'googletagmanager.com',
  'facebook.com/tr',
  'hotjar.com',
  // Adicione mais aqui
]
```

### Downloads Cross-Domain

Por padrão, **apenas assets do mesmo domínio** são baixados. Assets de CDNs externos (ex: cloudflare, jsdelivr) são ignorados.

### Limites de Segurança

- **Timeout**: 10s por download
- **Concorrência**: Máximo 20
- **Tamanho**: Sem limite (cuidado com sites grandes!)

## 🧪 Teste Rápido

```bash
# 1. Acesse: http://localhost:3000/clone
# 2. URL: http://localhost:8000 (seu test-server.html)
# 3. Click: Clonar
# 4. Baixe o ZIP gerado
# 5. Extraia e abra index.html
```

## 📁 Estrutura do ZIP Gerado

```
site-clone-job-123.zip
├── index.html          (HTML processado)
├── css/               (estilos)
├── js/                (scripts)
├── images/            (imagens)
└── ...                (estrutura original)
```

## ⚠️ Aviso Legal

**USE APENAS PARA FINES EDUCACIONAIS**

Esta ferramenta é para:
- ✅ Estudo de UX/UI
- ✅ Análise de estrutura de landing pages
- ✅ Prototipagem e inspiração

**NUNCA use para**:
- ❌ Roubar/copiar sites sem permissão
- ❌ Violar direitos autorais
- ❌ Contornar paywalls
- ❌ Redistribuir conteúdo protegido

## 🐛 Troubleshooting

### Puppeteer não inicia

No macOS/Linux, Puppeteer precisa de dependências:
```bash
# macOS
brew install chromium

# Linux (Ubuntu/Debian)
sudo apt-get install chromium-browser
```

### Build falha com Puppeteer

Puppeteer é pesado. Se o build falhar, tente:
```bash
npm install --save-optional puppeteer
```

### Cross-domain assets não baixam

Isso é esperado! A ferramenta **só baixa assets do mesmo domínio** para evitar problemas legais. CDNs externos não são clonados.

### ZIP muito grande

Sites com muitos assets podem gerar ZIPs grandes. Considere:
- Usar concurrency menor
- Testar em landing pages simples primeiro

## 🔧 Personalização

### Adicionar trackers à lista

Edite `lib/clone/crawler.ts` e adicione à lista `TRACKERS_TO_REMOVE`.

### Permitir domínios específicos

No futuro, podemos adicionar whitelist de domínios permitidos para download.

### Timeout customizável

Atualmente fixo em 10s. Pode ser adicionado à UI se necessário.

## 📊 Logs

Logs são salvos em tempo real e mostrados no terminal. Exemplo:

```
$ Created working directory
$ Puppeteer browser launched
$ Navigating to: https://example.com
$ HTML content captured
$ HTML parsed
$ Trackers removed from HTML
$ Forms sanitized
$ Found 45 assets to download
$ Downloaded 45/45 assets
$ Final HTML saved
$ ZIP archive created
$ Temporary directory cleaned
$ Browser closed
$ Clone completed successfully
```

## 🎓 Casos de Uso Educacionais

1. **Análise de estrutura**: Estude como landing pages são organizadas
2. **Extração de padrões**: Veja padrões de CSS/JS comuns
3. **Inspiração de design**: Use como referência visual
4. **Aprendizado offline**: Estude designs sem internet
5. **Debugging**: Ver HTML renderizado sem JavaScript

---

**Desenvolvido com responsabilidade. Use com ética! 🎯**


