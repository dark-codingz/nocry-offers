# 🧪 Como Testar o FunilSpy

## Opção 1: Teste Local (Python)

```bash
# Terminal 1: Servidor Python
cd public
python -m http.server 8000

# Terminal 2: Next.js
npm run dev

# Navegador
1. Acesse: http://localhost:3000/funilspy
2. Login necessário
3. Target: http://localhost:8000
4. Config:
   - Scan Paths: ✅
   - Scan Subdomains: ❌ (opcional)
   - Concurrency: 5
   - Timeout: 5000
5. Clique: Start Scan
```

**Resultado esperado**:
- Terminal mostra: `$ GET http://localhost:8000/test-server.html -> 200`
- Painel lateral lista URLs encontradas
- Apenas status 200 aparecem

---

## Opção 2: Teste com Site de Referência

```bash
# Configure no FunilSpy:
Target: httpbin.org
Scan Paths: ✅
Scan Subdomains: ❌
Timeout: 3000

# Resultados esperados:
- /status/200
- /json
- /xml
```

---

## Opção 3: Simulação de E-commerce (Seus Paths)

Com sua wordlist de **paths** (389 entradas incluindo ofertas, checkout, upsells), você pode testar:

```
Target: exemplo-ecommerce.com
Resultados potenciais:
- /landing
- /checkout  
- /thank-you
- /upsell
- /lp-offer
- /api
- /admin (pode retornar 403)
```

---

## 📊 O Que Esperar no Terminal

```
$ Starting scan for: http://localhost:8000
$ Config: paths=true, subdomains=false
$ Concurrency: 5, Timeout: 5000ms
$ Loading paths wordlist...
$ Loaded 389 paths
$ GET http://localhost:8000/admin -> 404
$ GET http://localhost:8000/login -> 404
$ GET http://localhost:8000/test-server.html -> 200
$ FOUND http://localhost:8000/test-server.html -> 200
$ GET http://localhost:8000/api -> 404
... (continua)
$ Scan completed in 12.45s
$ Found 1 valid results
```

---

## ⚠️ Troubleshooting

### Se os 404s continuarem aparecendo no console:

Isso é esperado nas primeiras requisições enquanto o worker inicializa. O sistema tem retry automático.

### Se o scan não iniciar:

1. Verifique se o target está correto (deve ter `http://` ou `https://`)
2. Abra o DevTools → Network
3. Verifique se `/api/funilspy/start-job` retorna 200

### Se os resultados não aparecerem:

- Apenas status **200** são salvos no banco
- Outros status (301, 302, 403, 401) aparecem no terminal mas não no painel

---

## 🎯 Pronto para Uso!

Seu FunilSpy está 100% funcional com:
- ✅ 389 paths customizados para marketing/funil
- ✅ 313 subdomínios comuns
- ✅ Worker otimizado
- ✅ Interface terminal premium
- ✅ Salva automaticamente no Supabase

**Só falta executar o schema SQL no Supabase!**


