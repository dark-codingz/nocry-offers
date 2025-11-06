import { redirect } from 'next/navigation'
import { getServerClient } from './supabase/server'

export async function getSessionUserAndOrg() {
  const supabase = await getServerClient()

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr) throw new Error('Falha ao obter usuário.')
  if (!user) redirect('/login')

  let orgId: string | null = null

  // 1) Tentar via view core.user_orgs
  const { data: orgRow } = await supabase
    .schema('core')
    .from('user_orgs')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  orgId = orgRow?.org_id ?? null

  // 2) Fallback: se for owner de alguma org
  if (!orgId) {
    const { data: byOwner } = await supabase
      .schema('core')
      .from('orgs')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)
      .maybeSingle()
    orgId = byOwner?.id ?? orgId
  }

  // 3) Fallback: pegar qualquer org existente (se tiver só a NoCry, resolve)
  if (!orgId) {
    const { data: anyOrg } = await supabase
      .schema('core')
      .from('orgs')
      .select('id')
      .limit(1)
      .maybeSingle()
    orgId = anyOrg?.id ?? orgId
  }

  if (!orgId) {
    throw new Error('Nenhuma organização encontrada. Crie a org e adicione você a um squad.')
  }

  return { userId: user.id, orgId }
}
