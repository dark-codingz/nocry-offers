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







