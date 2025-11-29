-- Tabela para armazenar clones editáveis de páginas
-- Usado pelo fluxo de edição visual (diferente do /api/clone que gera ZIP direto)

CREATE TABLE IF NOT EXISTS public.cloned_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_url text NOT NULL,
  html text NOT NULL,
  css text,
  js text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cloned_pages_user_id ON public.cloned_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_cloned_pages_created_at ON public.cloned_pages(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE public.cloned_pages ENABLE ROW LEVEL SECURITY;

-- Política: usuários só veem seus próprios clones
CREATE POLICY "Users can view their own clones"
  ON public.cloned_pages
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: usuários podem criar seus próprios clones
CREATE POLICY "Users can create their own clones"
  ON public.cloned_pages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: usuários podem atualizar seus próprios clones
CREATE POLICY "Users can update their own clones"
  ON public.cloned_pages
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política: usuários podem deletar seus próprios clones
CREATE POLICY "Users can delete their own clones"
  ON public.cloned_pages
  FOR DELETE
  USING (auth.uid() = user_id);

-- Comentários
COMMENT ON TABLE public.cloned_pages IS 'Armazena clones de páginas para edição visual';
COMMENT ON COLUMN public.cloned_pages.original_url IS 'URL original da página clonada';
COMMENT ON COLUMN public.cloned_pages.html IS 'HTML da página (editável)';
COMMENT ON COLUMN public.cloned_pages.css IS 'CSS customizado (futuro)';
COMMENT ON COLUMN public.cloned_pages.js IS 'JavaScript customizado (futuro)';

