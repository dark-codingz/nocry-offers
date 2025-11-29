-- Migration: Criar tabelas para rastreamento de ofertas (Ads Library)
-- Data: 20250115

-- 1. Tabela offers_tracked: cadastro de ofertas rastreadas
CREATE TABLE IF NOT EXISTS offers.offers_tracked (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Vínculo com org e usuário (mesmo padrão de offers.offers)
  org_id UUID NOT NULL REFERENCES core.orgs(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dados da oferta
  name TEXT NOT NULL,
  niche TEXT,
  country TEXT NOT NULL,
  ads_library_url TEXT NOT NULL,
  landing_page_url TEXT,
  notes TEXT,
  
  -- Controle
  is_archived BOOLEAN DEFAULT FALSE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_offers_tracked_org_id ON offers.offers_tracked(org_id);
CREATE INDEX IF NOT EXISTS idx_offers_tracked_owner ON offers.offers_tracked(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_offers_tracked_created_at ON offers.offers_tracked(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offers_tracked_archived ON offers.offers_tracked(is_archived) WHERE is_archived = FALSE;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION offers.update_offers_tracked_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_offers_tracked_updated_at
  BEFORE UPDATE ON offers.offers_tracked
  FOR EACH ROW
  EXECUTE FUNCTION offers.update_offers_tracked_updated_at();

-- 2. Tabela offer_ads_snapshots: histórico de snapshots
CREATE TABLE IF NOT EXISTS offers.offer_ads_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- FK para oferta rastreada
  offer_tracked_id UUID NOT NULL REFERENCES offers.offers_tracked(id) ON DELETE CASCADE,
  
  -- Dados do snapshot
  taken_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ads_count INTEGER NOT NULL,
  source TEXT DEFAULT 'manual', -- 'manual' | 'cron'
  raw_data JSONB,
  note TEXT
);

-- Índices para snapshots
CREATE INDEX IF NOT EXISTS idx_offer_ads_snapshots_offer_tracked_id ON offers.offer_ads_snapshots(offer_tracked_id);
CREATE INDEX IF NOT EXISTS idx_offer_ads_snapshots_taken_at ON offers.offer_ads_snapshots(offer_tracked_id, taken_at DESC);

-- 3. RLS para offers_tracked
ALTER TABLE offers.offers_tracked ENABLE ROW LEVEL SECURITY;

-- SELECT: dono pode ver; org pode ver se pertencer à org
DROP POLICY IF EXISTS "offers_tracked_select" ON offers.offers_tracked;
CREATE POLICY "offers_tracked_select" ON offers.offers_tracked
FOR SELECT
USING (
  owner_user_id = auth.uid()
  OR offers.fn_user_in_org(org_id)
);

-- INSERT: só quem pertence à org pode criar
DROP POLICY IF EXISTS "offers_tracked_insert" ON offers.offers_tracked;
CREATE POLICY "offers_tracked_insert" ON offers.offers_tracked
FOR INSERT
WITH CHECK (
  offers.fn_user_in_org(org_id)
  AND owner_user_id = auth.uid()
);

-- UPDATE: dono pode; membro da org pode
DROP POLICY IF EXISTS "offers_tracked_update" ON offers.offers_tracked;
CREATE POLICY "offers_tracked_update" ON offers.offers_tracked
FOR UPDATE
USING (
  owner_user_id = auth.uid()
  OR offers.fn_user_in_org(org_id)
)
WITH CHECK (
  org_id = org_id AND owner_user_id = owner_user_id
);

-- DELETE: apenas dono
DROP POLICY IF EXISTS "offers_tracked_delete" ON offers.offers_tracked;
CREATE POLICY "offers_tracked_delete" ON offers.offers_tracked
FOR DELETE
USING (
  owner_user_id = auth.uid()
);

-- 4. RLS para offer_ads_snapshots
ALTER TABLE offers.offer_ads_snapshots ENABLE ROW LEVEL SECURITY;

-- SELECT: pode ver snapshots de ofertas que pode ver
DROP POLICY IF EXISTS "offer_ads_snapshots_select" ON offers.offer_ads_snapshots;
CREATE POLICY "offer_ads_snapshots_select" ON offers.offer_ads_snapshots
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM offers.offers_tracked ot
    WHERE ot.id = offer_ads_snapshots.offer_tracked_id
      AND (
        ot.owner_user_id = auth.uid()
        OR offers.fn_user_in_org(ot.org_id)
      )
  )
);

-- INSERT: pode criar snapshot se pode ver a oferta
DROP POLICY IF EXISTS "offer_ads_snapshots_insert" ON offers.offer_ads_snapshots;
CREATE POLICY "offer_ads_snapshots_insert" ON offers.offer_ads_snapshots
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM offers.offers_tracked ot
    WHERE ot.id = offer_ads_snapshots.offer_tracked_id
      AND (
        ot.owner_user_id = auth.uid()
        OR offers.fn_user_in_org(ot.org_id)
      )
  )
);

-- UPDATE/DELETE: apenas dono da oferta
DROP POLICY IF EXISTS "offer_ads_snapshots_update" ON offers.offer_ads_snapshots;
CREATE POLICY "offer_ads_snapshots_update" ON offers.offer_ads_snapshots
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM offers.offers_tracked ot
    WHERE ot.id = offer_ads_snapshots.offer_tracked_id
      AND ot.owner_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "offer_ads_snapshots_delete" ON offers.offer_ads_snapshots;
CREATE POLICY "offer_ads_snapshots_delete" ON offers.offer_ads_snapshots
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM offers.offers_tracked ot
    WHERE ot.id = offer_ads_snapshots.offer_tracked_id
      AND ot.owner_user_id = auth.uid()
  )
);

