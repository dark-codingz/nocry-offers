-- Adiciona coluna job_id para referenciar a pasta de assets
ALTER TABLE public.cloned_pages ADD COLUMN IF NOT EXISTS job_id text;

-- Índice para buscar por job_id
CREATE INDEX IF NOT EXISTS idx_cloned_pages_job_id ON public.cloned_pages(job_id);

-- Comentário
COMMENT ON COLUMN public.cloned_pages.job_id IS 'ID do job de clonagem (ex: clone-1234567890-abc123) que aponta para public/clone-jobs/<job_id>/';

