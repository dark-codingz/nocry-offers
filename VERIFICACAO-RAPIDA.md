# 🚀 Verificação Rápida - Checklist de Teste

## ⚡ Teste Rápido (5 minutos)

### 1. Iniciar o servidor
```bash
npm run dev
```

### 2. Login
- Acessar: http://localhost:3000/login
- Fazer login com usuário válido
- ✅ Deve redirecionar para `/ofertas`

---

## 🧪 Testes por Tab

### Tab: Criativos (Originais)
```
1. Abrir qualquer oferta → tab "Criativos"
2. Clicar "+ Criativo original"
3. Preencher:
   - Ref Name: "Teste RLS 1"
   - Ad Link: facebook.com/ads (sem https://)
   - Format: "Video"
4. Clicar "Salvar"

✅ ESPERADO:
- Toast: "Criativo original salvo com sucesso"
- Console (navegador): [CREATE_ORIG_PAYLOAD] { org_id: "...", offer_id: "..." }
- Console (servidor): mesma linha acima
- URL salva como: https://facebook.com/ads
- SEM erro RLS

❌ SE DER ERRO:
- Ver console do servidor
- Se "[CRIATIVOS_ORIG_SAVE_ERROR] RLS policy": verificar user_orgs
```

---

### Tab: Entregáveis
```
1. Tab "Entregáveis" → Adicionar
2. Preencher apenas:
   - Título: "Teste"
   - Descrição: "Desc"
   - Tipo: "PDF"
3. NÃO fazer upload, clicar "Salvar"

✅ ESPERADO:
- Toast: "Envie um arquivo ou cole um link"
- Formulário não envia

4. Fazer upload de qualquer arquivo
5. Clicar "Salvar"

✅ ESPERADO:
- Toast: "Entregável salvo com sucesso"
- Console: [BONUS_PAYLOAD] { file_or_link: "storage-key..." }
- SEM erro RLS
```

---

### Tab: Páginas
```
1. Tab "Páginas do Funil" → Adicionar
2. Preencher:
   - Título: "Landing Page"
   - URL: exemplo.com/lp (sem https://)
   - Notas: "Teste reset"
3. Clicar "Salvar"

✅ ESPERADO:
- Toast: "Página salva com sucesso"
- Console: [FUNIL_PAYLOAD] { our_quiz_or_lp: "https://exemplo.com/lp" }
- Formulário limpo (reset seguro)
- SEM erro "Cannot read properties of null"
```

---

### Tab: Pixel
```
1. Tab "Pixel" → Adicionar
2. Preencher:
   - Pixel Meta: "123456789"
   - Token: "abc123xyz" (deve ser visível, não oculto)
   - Status: Ativo
3. Clicar "Salvar"

✅ ESPERADO:
- Toast: "Pixel salvo com sucesso"
- Console: [PIXEL_PAYLOAD] { pixel_meta: "...", token: "abc123xyz" }
- Token visível na lista
- Botão "Copiar" ao lado do token

4. Clicar "Copiar"

✅ ESPERADO:
- Toast: "Token copiado para área de transferência"
- Ctrl+V deve colar o token
```

---

### Tab: Upsell
```
1. Tab "Upsells" → Adicionar
2. Preencher:
   - Nome: "Upsell Teste"
   - Preço: 97
   - Link: checkout.com/upsell (sem https://)
3. Clicar "Salvar"

✅ ESPERADO:
- Toast: "Upsell salvo com sucesso"
- Console: [UPSELL_PAYLOAD] { page_link: "https://checkout.com/upsell" }
- Formulário limpo
- SEM erro de reset
```

---

### Tab: Anexos
```
1. Tab "Anexos & Comentários" → Upload arquivo
2. Escolher qualquer arquivo
3. Label: "Teste upload"
4. Salvar

✅ ESPERADO:
- Toast: "Anexo salvo com sucesso"
- Console: [ANEXO_PAYLOAD] { file_url: "storage-key..." }
- Link "Baixar" funciona
```

---

## 🔍 Verificação de Logs

### Console do Navegador (DevTools)
Deve aparecer **antes** de cada toast de sucesso:
```javascript
[CREATE_ORIG_PAYLOAD] { org_id: "uuid", offer_id: "uuid", ... }
[CREATE_MOD_PAYLOAD] { org_id: "uuid", offer_id: "uuid", ... }
[FUNIL_PAYLOAD] { org_id: "uuid", offer_id: "uuid", ... }
[BONUS_PAYLOAD] { org_id: "uuid", offer_id: "uuid", ... }
[UPSELL_PAYLOAD] { org_id: "uuid", offer_id: "uuid", ... }
[PIXEL_PAYLOAD] { offerId: "uuid", orgId: "uuid", ... }
[ANEXO_PAYLOAD] { org_id: "uuid", offer_id: "uuid", ... }
```

### Terminal do Next.js
As mesmas linhas acima devem aparecer no servidor.

**Se aparecer erro**:
```bash
[CRIATIVOS_ORIG_SAVE_ERROR] {
  code: "42501",
  message: "new row violates row-level security policy",
  ...
}
```

**Solução**:
1. Verificar que o usuário está em `core.squad_members`
2. Verificar que `core.user_orgs` retorna `org_id` para o usuário
3. Executar no Supabase SQL Editor:
```sql
-- Verificar org do usuário
SELECT * FROM core.user_orgs WHERE user_id = 'seu-user-id';

-- Se vazio, verificar squad_members
SELECT * FROM core.squad_members WHERE user_id = 'seu-user-id';
```

---

## ✅ Checklist Rápido

- [ ] Criativos salvam sem erro RLS
- [ ] Entregáveis bloqueiam se file_or_link vazio
- [ ] Páginas salvam sem erro de reset
- [ ] Pixel salva com SELECT → UPDATE | INSERT
- [ ] Token do Pixel visível e copiável
- [ ] URLs completam com https:// automaticamente
- [ ] Logs aparecem no console (navegador e servidor)
- [ ] Todos os payloads incluem `org_id` e `offer_id`
- [ ] Formulários resetam sem erro

---

## 🐛 Troubleshooting

### Erro: RLS policy violation
**Causa**: `org_id` não está no payload ou usuário não está na org

**Verificar**:
```sql
-- No Supabase SQL Editor
SELECT * FROM core.user_orgs WHERE user_id = 'seu-user-id';
```

**Se retornar vazio**:
```sql
-- Adicionar usuário a uma org (dev/test)
INSERT INTO core.squad_members (squad_id, user_id)
SELECT s.id, 'seu-user-id'
FROM core.squads s
WHERE s.org_id = 'org-id-nocry'
LIMIT 1;
```

---

### Erro: Cannot read properties of null (reading 'reset')
**Causa**: Reset não está seguro

**Verificar no código**:
```typescript
// ❌ ERRADO
e.currentTarget.reset()

// ✅ CORRETO
const formEl = e.currentTarget as HTMLFormElement | null
formEl?.reset()
```

**Status**: ✅ Já corrigido em todas as tabs

---

### Erro: Token do Pixel não está visível
**Verificar**:
```tsx
// Deve ser type="text", NÃO type="password"
<Input id="token" name="token" type="text" />
```

**Status**: ✅ Já correto em pixel-tab.tsx

---

### Erro: URL sem https://
**Verificar no console**:
```javascript
// Payload deve mostrar URL normalizada
[FUNIL_PAYLOAD] {
  our_quiz_or_lp: "https://exemplo.com/lp" // ← com https://
}
```

**Status**: ✅ normalizeUrl() aplicado em todas as Server Actions

---

## 📊 Resultado Esperado

| Item | Status |
|------|--------|
| RLS errors | ✅ Corrigido |
| file_or_link obrigatório | ✅ Corrigido |
| Reset de formulários | ✅ Corrigido |
| Pixel UPSERT | ✅ Corrigido |
| Token visível | ✅ Corrigido |
| URLs inteligentes | ✅ Corrigido |
| Logs completos | ✅ Corrigido |

**Tempo total de teste**: ~5 minutos

**Se tudo passar**: 🎉 **Pronto para produção!**




