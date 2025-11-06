export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { getServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { GerenciamentoTabs } from './_components/gerenciamento-tabs'
import { OfferHeroClient } from '@/components/ofertas/offer-hero-client'
import { OfferVisibilityToggle } from '@/components/ofertas/offer-visibility-toggle'
import { getSessionUserAndOrg } from '@/lib/auth'
import { offerVisibilityFilter, isOfferVisibleTo } from '@/lib/offers/visibility'

export default async function OfferDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await getServerClient()
  const { userId, orgId } = await getSessionUserAndOrg()

  const { data: offer, error } = await supabase
    .schema('offers')
    .from('offers')
    .select('*')
    .eq('id', id)
    .or(offerVisibilityFilter(userId, orgId))
    .single()

  if (error || !offer) {
    notFound()
  }

  // Guard extra
  const ok = isOfferVisibleTo(
    { id: offer.id, org_id: offer.org_id, owner_user_id: offer.owner_user_id, visibility: offer.visibility },
    userId,
    orgId
  )
  if (!ok) notFound()

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="w-full px-4 py-6 md:px-6 lg:px-8">
        {/* Header minimalista: apenas título, badges e botão voltar */}
        <OfferHeroClient
          title={offer.name}
          status={offer.status}
          visibility={offer.visibility}
        />

        {/* Toggle de visibilidade (apenas para dono) */}
        <div className="mb-6">
          <OfferVisibilityToggle
            offerId={offer.id}
            current={offer.visibility as 'org' | 'private'}
            ownerUserId={offer.owner_user_id}
          />
        </div>

        {/* Nova estrutura com tabbar Gerenciamento/Detalhes */}
        <GerenciamentoTabs offer={offer} />
      </div>
    </div>
  )
}
