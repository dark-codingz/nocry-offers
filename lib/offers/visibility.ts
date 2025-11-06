export type OfferRow = {
  id: string
  org_id: string
  owner_user_id: string
  visibility: 'org' | 'private' | string
}

export function isOfferVisibleTo(
  offer: OfferRow,
  userId: string,
  orgId: string
): boolean {
  if (!offer) return false
  if (offer.owner_user_id === userId) return true
  if (offer.visibility === 'org' && offer.org_id === orgId) return true
  return false
}

/** Filtro seguro para ser encadeado na query supabase (.or) */
export function offerVisibilityFilter(userId: string, orgId: string) {
  // PostgREST OR syntax: owner OR (visibility=org AND same org)
  return `owner_user_id.eq.${userId},and(visibility.eq.org,org_id.eq.${orgId})`
}
