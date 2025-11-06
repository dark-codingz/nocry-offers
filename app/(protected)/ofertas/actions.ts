'use server'

import { revalidatePath } from 'next/cache'
import { getServerClient } from '@/lib/supabase/server'

export async function updateOfferVisibility(offerId: string, visibility: 'org' | 'private') {
  const supabase = await getServerClient()

  const { data, error } = await supabase
    .schema('offers')
    .from('offers')
    .update({ visibility, updated_at: new Date().toISOString() })
    .eq('id', offerId)
    .select('id, visibility')
    .single()

  if (error) {
    return { ok: false, error: error.message }
  }
  revalidatePath(`/ofertas/${offerId}`)
  revalidatePath(`/ofertas`)
  return { ok: true, data }
}

export async function deleteOffer(offerId: string) {
  const supabase = await getServerClient()
  const { error } = await supabase
    .schema('offers')
    .from('offers')
    .delete()
    .eq('id', offerId)

  if (error) {
    return { ok: false, error: error.message }
  }
  revalidatePath('/ofertas')
  return { ok: true }
}

