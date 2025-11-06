# FunilSpy - Educational URL/Subdomain Scanner

Ferramenta educacional para demonstrar enumeração de URLs (paths) e subdomínios de alvos controlados.

## 📋 Funcionalidades

- **Scan de Paths**: Testa palavras-chave de uma wordlist contra um alvo
- **Scan de Subdomínios**: Resolve e testa subdomínios via DNS e HTTP
- **Terminal Visual**: Interface estilo terminal com output em tempo real
- **Painel de Resultados**: Lista de URLs válidas encontradas (status 200)
- **Controle de Concorrência**: Limita requisições simultâneas
- **Timeouts Configuráveis**: Evita travamentos em requisições lentas
- **Persistência no Supabase**: Salva resultados válidos automaticamente

## 🚀 Instalação

### 1. Dependências

As dependências já foram instaladas:
- `@xterm/xterm` - Terminal visual
- `@xterm/addon-fit` - Ajuste automático do terminal
- `axios` - Cliente HTTP

### 2. Schema do Banco de Dados

Execute o arquivo SQL no Supabase:

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Cole o conteúdo de `supabase/funilspy-schema.sql`
4. Execute o script

```sql
-- O arquivo cria:
-- - Tabela funilspy_results
-- - Índices para performance
-- - RLS (Row Level Security) policies
-- - View para consultas
```

## 📁 Estrutura de Arquivos

```
app/
├── (protected)/
│   └── funilspy/
│       └── page.tsx              # Interface principal
├── api/
│   └── funilspy/
│       ├── start-job/route.ts   # Inicia scan
│       ├── stop-job/route.ts    # Para scan
│       ├── job-status/route.ts  # Status do scan
│       └── job-result/route.ts  # Resultados finais
lib/
└── funilspy/
    └── worker.ts                 # Worker assíncrono de scan
public/
└── wordlists/
    ├── paths.txt                 # Wordlist de paths
    └── subdomains.txt            # Wordlist de subdomínios
```

## 🎯 Como Usar

### 1. Acesse a Página

Navegue para `/funilspy` (rota protegida - requer login).

### 2. Configure o Scan

- **Target URL**: Digite o alvo (ex: `http://localhost:8000` ou `example.com`)
- **Scan Paths**: Marque para escanear paths (padrão: ativado)
- **Scan Subdomains**: Marque para escanear subdomínios (padrão: ativado)
- **Concurrency**: Número de requisições simultâneas (padrão: 5, máximo: 20)
- **Timeout**: Tempo limite por requisição em ms (padrão: 5000, máximo: 30000)

### 3. Inicie o Scan

Clique em **Start Scan**. O terminal mostrará:
- Progresso em tempo real
- Cada requisição feita
- Status codes retornados
- URLs encontradas (FOUND)

### 4. Visualize Resultados

O painel lateral mostra:
- Lista de URLs válidas (status 200)
- Status code de cada resultado
- Tipo (path ou subdomain)
- Link para abrir a URL

### 5. Pare o Scan

Clique em **Stop** para interromper o scan a qualquer momento.

## 📊 Códigos de Status Aceitos

Por padrão, o scanner considera válidos os seguintes status codes:
- `200` - OK (salvo no banco)
- `301` - Redirect permanente
- `302` - Redirect temporário
- `403` - Forbidden (recurso existe, mas acesso negado)
- `401` - Unauthorized (requer autenticação)

**Nota**: Apenas resultados com status `200` são salvos no Supabase automaticamente.

## 🔧 Personalização

### Modificar Wordlists

Edite os arquivos em `public/wordlists/`:

- **paths.txt**: Uma palavra por linha
- **subdomains.txt**: Um subdomínio por linha

Exemplo `paths.txt`:
```
admin
login
dashboard
api
test
```

Exemplo `subdomains.txt`:
```
www
mail
ftp
admin
api
```

### Limites de Segurança

O scanner tem limites configurados para evitar sobrecarga:
- **Concurrency**: 1-20 requisições simultâneas
- **Timeout**: 1s-30s por requisição
- **Limpeza automática**: Mantém apenas os 10 jobs mais recentes

## 🧪 Testes Manuais

### Teste 1: Scan Local

```bash
# 1. Inicie um servidor local de teste
# Exemplo com Python:
python -m http.server 8000

# 2. No FunilSpy, configure:
Target: http://localhost:8000
Scan Paths: ✅
Scan Subdomains: ❌
Concurrency: 5
Timeout: 5000

# 3. Clique em Start Scan
# 4. Observe o terminal mostrando as requisições
# 5. Verifique os resultados no painel lateral
```

**Resultado Esperado**:
- Terminal mostra: `$ GET http://localhost:8000/admin -> 404`
- Terminal mostra: `$ GET http://localhost:8000/ -> 200`
- Painel mostra URLs com status 200

### Teste 2: Scan de Subdomínios

```bash
# 1. Configure um alvo real (exemplo.com)
Target: example.com
Scan Paths: ❌
Scan Subdomains: ✅

# 2. Clique em Start Scan
# 3. Observe resoluções DNS e requisições HTTP
```

**Resultado Esperado**:
- Terminal mostra: `$ DNS www.example.com -> RESOLVES`
- Terminal mostra: `$ DNS+GET www.example.com -> 200`
- Painel mostra subdomínios válidos

### Teste 3: Interromper Scan

```bash
# 1. Inicie um scan longo (target com muitos paths)
# 2. Após alguns segundos, clique em Stop
# 3. Verifique que o scan parou imediatamente
```

**Resultado Esperado**:
- Terminal mostra: `$ Scan stopped by user`
- Status muda para "stopped"
- Resultados parciais são mantidos

## 🗄️ Consultando Resultados no Supabase

Após completar um scan, os resultados (status 200) são salvos automaticamente.

### Query SQL

```sql
-- Ver todos os seus resultados
SELECT * FROM funilspy_results_view
WHERE user_id = auth.uid()
ORDER BY scanned_at DESC;

-- Contar resultados por tipo
SELECT 
  type,
  COUNT(*) as total,
  COUNT(DISTINCT job_id) as jobs
FROM funilspy_results
WHERE user_id = auth.uid()
GROUP BY type;

-- Ver resultados de um job específico
SELECT * FROM funilspy_results
WHERE job_id = 'job-1234567890-abc123'
AND user_id = auth.uid();
```

## 🔒 Segurança e Ética

⚠️ **AVISO IMPORTANTE**: Esta ferramenta é apenas para fins educacionais e testes em ambientes controlados.

**NUNCA use esta ferramenta para**:
- Escanear sites sem autorização
- Realizar ataques em sistemas de terceiros
- Violar termos de uso de serviços

**Use apenas em**:
- Seu próprio servidor local
- Servidores de teste que você controla
- Ambientes educacionais com permissão explícita

## 🐛 Troubleshooting

### Terminal não aparece

- Verifique se `@xterm/xterm` e `@xterm/addon-fit` foram instalados
- Confira o console do navegador para erros
- Recarregue a página

### Wordlists não carregam

- Verifique se os arquivos existem em `public/wordlists/`
- Confira o Network tab do DevTools para erros 404
- Use wordlists padrão caso falhe o carregamento

### Scan não inicia

- Verifique se o target está correto (deve começar com http:// ou https://)
- Confira o console do navegador para erros da API
- Verifique se está autenticado (rota protegida)

### Resultados não aparecem no banco

- Apenas status 200 são salvos automaticamente
- Verifique se o job completou com sucesso
- Confira os logs do servidor para erros de inserção

## 📝 Notas Técnicas

- **Worker Assíncrono**: Usa `asyncio` (via Node.js async/await) para controle de concorrência
- **Semaphore**: Implementado para limitar requisições simultâneas
- **Memory Store**: Jobs são armazenados em memória (Map) - reinicia ao reiniciar o servidor
- **Polling**: Frontend faz polling a cada 500ms para atualizar status
- **DNS Resolution**: Subdomínios são testados primeiro via DNS, depois HTTP

## 🚧 Melhorias Futuras

- [ ] Cache de resultados por URL
- [ ] Exportar resultados para CSV/JSON
- [ ] Histórico de jobs anteriores
- [ ] Gráficos de progresso
- [ ] Suporte a wordlists customizadas via upload
- [ ] Rate limiting mais sofisticado
- [ ] Suporte a outros métodos HTTP (POST, PUT, etc.)

## 📄 Licença

Uso educacional apenas. Use com responsabilidade.


