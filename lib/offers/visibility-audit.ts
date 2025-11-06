import { isOfferVisibleTo, type OfferRow } from './visibility'

export function auditOfferList(
  list: OfferRow[],
  ctx: { userId: string; orgId: string; source: string }
) {
  if (process.env.NODE_ENV !== 'development') return
  const leaked = (list || []).filter((o) => !isOfferVisibleTo(o, ctx.userId, ctx.orgId))
  if (leaked.length) {
    // eslint-disable-next-line no-console
    console.warn(
      `[VISIBILITY LEAK] ${ctx.source} retornou ${leaked.length} item(ns) que não deveriam aparecer.`,
      leaked.map((o) => ({ id: o.id, owner: o.owner_user_id, org: o.org_id, vis: o.visibility }))
    )
  }
}
