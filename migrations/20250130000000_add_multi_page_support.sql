-- Migration: Adicionar suporte a múltiplas páginas por clone
-- Data: 20250130
-- 
-- Adiciona campos para agrupar páginas do mesmo clone e identificar páginas root/subpáginas

-- 1. Adicionar colunas para multi-página
ALTER TABLE public.cloned_pages
  ADD COLUMN IF NOT EXISTS clone_group_id uuid,
  ADD COLUMN IF NOT EXISTS path text,
  ADD COLUMN IF NOT EXISTS is_root boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;

-- 2. Criar índice para buscar páginas do mesmo grupo
CREATE INDEX IF NOT EXISTS idx_cloned_pages_clone_group_id 
  ON public.cloned_pages(clone_group_id);

-- 3. Criar índice composto para ordenação
CREATE INDEX IF NOT EXISTS idx_cloned_pages_group_order 
  ON public.cloned_pages(clone_group_id, order_index);

-- 4. Comentários
COMMENT ON COLUMN public.cloned_pages.clone_group_id IS 'ID do grupo de clone (todas as páginas do mesmo clone têm o mesmo clone_group_id)';
COMMENT ON COLUMN public.cloned_pages.path IS 'Path relativo da página (ex: "/", "/produto", "/checkout")';
COMMENT ON COLUMN public.cloned_pages.is_root IS 'Indica se é a página principal (root) do clone';
COMMENT ON COLUMN public.cloned_pages.order_index IS 'Índice de ordem: 0 para root, 1-3 para subpáginas';

-- 5. Atualizar registros existentes para serem root
-- Para clones existentes sem clone_group_id, criar um grupo único para cada um
UPDATE public.cloned_pages
SET 
  clone_group_id = id,
  path = '/',
  is_root = true,
  order_index = 0
WHERE clone_group_id IS NULL;






