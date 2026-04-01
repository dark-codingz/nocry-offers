# Migration: Adicionar suporte a SPA/Next.js

## ⚠️ Importante

A migration precisa ser executada no Supabase para habilitar a detecção automática de páginas SPA/Next.js/React.

## 📋 Como executar

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Execute o conteúdo do arquivo:
   ```
   migrations/20250129000000_add_is_spa_framework.sql
   ```

Ou execute diretamente:

```sql
-- Adiciona campo is_spa_framework para identificar páginas SPA/Next.js/React
-- e campo editable_html para armazenar versão sanitizada (sem scripts do framework)

ALTER TABLE public.cloned_pages
  ADD COLUMN IF NOT EXISTS is_spa_framework boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS editable_html text;

-- Comentários
COMMENT ON COLUMN public.cloned_pages.is_spa_framework IS 'Indica se a página usa frameworks SPA como Next.js/React';
COMMENT ON COLUMN public.cloned_pages.editable_html IS 'HTML sanitizado para edição (sem scripts do framework)';

-- Índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_cloned_pages_is_spa_framework ON public.cloned_pages(is_spa_framework);
```

## ✅ Após executar

- O sistema detectará automaticamente páginas Next.js/React
- Gerará versões estáticas editáveis (sem scripts do framework)
- Mostrará aviso no editor quando necessário

## 🔄 Fallback

O código já tem fallback: se a migration não foi executada, o sistema funciona normalmente, mas sem detecção de SPA. Execute a migration para habilitar o recurso completo.







