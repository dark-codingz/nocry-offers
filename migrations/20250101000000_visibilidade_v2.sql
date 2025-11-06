-- Migration: Atualizar visibilidade para org/private e configurar RLS
-- Data: 20250101

-- 0.1) Criar/ajustar ENUM
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'offer_visibility') THEN
    CREATE TYPE offer_visibility AS ENUM ('org', 'private');
  END IF;
END$$;

-- 0.2) Alterar coluna visibility para usar novos valores
ALTER TABLE offers.offers
  ALTER COLUMN visibility TYPE offer_visibility
  USING (
    CASE
      WHEN visibility::text IN ('org','NoCry','geral','Geral','public') THEN 'org'::offer_visibility
      ELSE 'private'::offer_visibility
    END
  );

-- 0.3) Índices úteis
CREATE INDEX IF NOT EXISTS idx_offers_org_id ON offers.offers (org_id);
CREATE INDEX IF NOT EXISTS idx_offers_owner ON offers.offers (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_offers_visibility ON offers.offers (visibility);

-- 0.4) Função helper: checar se usuário pertence à org
-- Usando core.user_orgs (view) conforme estrutura existente
CREATE OR REPLACE FUNCTION offers.fn_user_in_org(p_org uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public, offers, core
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM core.user_orgs m
    WHERE m.org_id = p_org
      AND m.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM core.orgs o
    WHERE o.id = p_org
      AND o.owner_id = auth.uid()
  );
$$;

-- 0.5) RLS: garantir leitura/escrita de acordo com a visibilidade
ALTER TABLE offers.offers ENABLE ROW LEVEL SECURITY;

-- SELECT: dono pode ver; org pode ver se visibility='org'
DROP POLICY IF EXISTS "offers_select" ON offers.offers;
CREATE POLICY "offers_select" ON offers.offers
FOR SELECT
USING (
  owner_user_id = auth.uid()
  OR (visibility = 'org' AND offers.fn_user_in_org(org_id))
);

-- INSERT: só quem pertence à org pode criar na org setada; owner = uid()
DROP POLICY IF EXISTS "offers_insert" ON offers.offers;
CREATE POLICY "offers_insert" ON offers.offers
FOR INSERT
WITH CHECK (
  offers.fn_user_in_org(org_id)
  AND owner_user_id = auth.uid()
  AND (visibility IN ('org','private'))
);

-- UPDATE: dono pode; admin da org pode (se você tiver flag admin, ajuste aqui)
DROP POLICY IF EXISTS "offers_update" ON offers.offers;
CREATE POLICY "offers_update" ON offers.offers
FOR UPDATE
USING (
  owner_user_id = auth.uid()
  OR (offers.fn_user_in_org(org_id) AND visibility = 'org')
)
WITH CHECK (
  -- Não permitir trocar org_id/owner pra outra org/owner; visibilidade só 'org'|'private'
  org_id = org_id AND owner_user_id = owner_user_id AND visibility IN ('org','private')
);

-- DELETE: apenas dono
DROP POLICY IF EXISTS "offers_delete" ON offers.offers;
CREATE POLICY "offers_delete" ON offers.offers
FOR DELETE
USING (
  owner_user_id = auth.uid()
);

