'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Offer } from '@/lib/types'
import { offerVisibilityFilter, isOfferVisibleTo } from '@/lib/offers/visibility'
import { auditOfferList } from '@/lib/offers/visibility-audit'

export function useOffers() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const loadOffers = async () => {
    try {
      setLoading(true)
      setError(null)

      // Obter usuário e org no cliente
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')
      const userId = user.id

      // Buscar orgId pela view core.user_orgs
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
        .or(offerVisibilityFilter(userId, orgId))
        .order('updated_at', { ascending: false })

      if (fetchError) throw fetchError

      const list = (data as Offer[]) || []
      // Auditoria dev
      auditOfferList(list as any, { userId, orgId, source: 'hooks/use-offers.ts' })
      // Proteção extra no client render
      const safe = list.filter((o) => isOfferVisibleTo(
        { id: o.id, org_id: o.org_id, owner_user_id: o.owner_user_id!, visibility: o.visibility },
        userId,
        orgId
      ))
      setOffers(safe)
    } catch (err) {
      console.error('Erro ao carregar ofertas:', err)
      setError('Erro ao carregar ofertas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOffers()
  }, [])

  const updateOfferStatus = async (offerId: string, newStatus: Offer['status']) => {
    try {
      // Optimistic update
      setOffers((prev) =>
        prev.map((o) => (o.id === offerId ? { ...o, status: newStatus } : o))
      )

      const { error: updateError } = await supabase
        .schema('offers')
        .from('offers')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', offerId)

      if (updateError) throw updateError

      return { success: true }
    } catch (err) {
      console.error('Erro ao atualizar status:', err)
      // Reverter otimista
      await loadOffers()
      return { success: false, error: 'Falha ao atualizar status' }
    }
  }

  return {
    offers,
    loading,
    error,
    loadOffers,
    updateOfferStatus,
  }
}




