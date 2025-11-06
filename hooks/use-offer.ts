'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Offer } from '@/lib/types'
import { offerVisibilityFilter, isOfferVisibleTo } from '@/lib/offers/visibility'
import { auditOfferList } from '@/lib/offers/visibility-audit'

export function useOffer(offerId: string) {
  const [offer, setOffer] = useState<Offer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const loadOffer = async () => {
    try {
      setLoading(true)
      setError(null)

      // Obter user/org
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')
      const userId = user.id
      const { data: orgRow } = await supabase
        .schema('core')
        .from('user_orgs')
        .select('org_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()
      const orgId = orgRow?.org_id
      if (!orgId) throw new Error('Org não encontrada')

      const { data, error: fetchError } = await supabase
        .schema('offers')
        .from('offers')
        .select('*')
        .eq('id', offerId)
        .or(offerVisibilityFilter(userId, orgId))
        .maybeSingle()

      if (fetchError) throw fetchError

      const row = (data as Offer | null)
      // Auditoria dev (se houver row)
      if (row) {
        auditOfferList([row] as any, { userId, orgId, source: 'hooks/use-offer.ts' })
        // Guard extra
        const ok = isOfferVisibleTo(
          { id: row.id, org_id: row.org_id, owner_user_id: row.owner_user_id!, visibility: row.visibility },
          userId,
          orgId
        )
        if (!ok) {
          setOffer(null)
          setError('Oferta não visível')
          return
        }
      }

      setOffer(row)
    } catch (err) {
      console.error('Erro ao carregar oferta:', err)
      setError('Erro ao carregar oferta')
      setOffer(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (offerId) {
      loadOffer()
    }
  }, [offerId])

  const updateOffer = async (updates: Partial<Offer>) => {
    try {
      const { error: updateError } = await supabase
        .schema('offers')
        .from('offers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', offerId)

      if (updateError) throw updateError

      await loadOffer()
      return { success: true }
    } catch (err) {
      console.error('Erro ao atualizar oferta:', err)
      return { success: false, error: 'Erro ao salvar alterações' }
    }
  }

  return {
    offer,
    loading,
    error,
    loadOffer,
    updateOffer,
  }
}




