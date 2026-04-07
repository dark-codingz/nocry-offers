'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  OfferCopy, 
  CopyType, 
  CopyStatus, 
  COPY_TYPE_MAP, 
  REVERSE_COPY_TYPE_MAP, 
  COPY_STATUS_MAP, 
  REVERSE_COPY_STATUS_MAP 
} from '@/lib/types'

export type { OfferCopy, CopyType, CopyStatus }
import { toast } from 'sonner'

export function useCopies(offerId: string) {
  const [copies, setCopies] = useState<OfferCopy[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchCopies = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('offer_copies')
        .select('*')
        .eq('offer_id', offerId)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data) {
        const mappedCopies: OfferCopy[] = data.map(item => ({
          id: item.id,
          offer_id: item.offer_id,
          name: item.name,
          type: REVERSE_COPY_TYPE_MAP[item.copy_type] || 'Em Branco',
          status: REVERSE_COPY_STATUS_MAP[item.status] || 'Ideia',
          content: item.content,
          created_at: item.created_at,
          updated_at: item.updated_at
        }))
        setCopies(mappedCopies)
      }
    } catch (e: any) {
      console.error('Erro ao buscar copies:', e.message || e)
      toast.error('Erro ao carregar as copys: ' + (e.message || ''))
    } finally {
      setLoading(false)
    }
  }, [offerId, supabase])

  useEffect(() => {
    fetchCopies()
  }, [fetchCopies])

  const createCopy = async (data: { name: string; type: CopyType }) => {
    try {
      const newId = crypto.randomUUID()
      const dbPayload = {
        id: newId,
        offer_id: offerId,
        name: data.name,
        copy_type: COPY_TYPE_MAP[data.type as CopyType] || 'blank',
        status: 'idea',
        content: data.type === 'VSL' ? '<h1>Título da VSL</h1><p>Comece sua redline aqui...</p>' : '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('offer_copies')
        .insert([dbPayload])

      if (error) throw error

      const newCopy: OfferCopy = {
        id: newId,
        offer_id: offerId,
        name: data.name,
        type: data.type,
        status: 'Ideia',
        content: dbPayload.content,
        created_at: dbPayload.created_at,
        updated_at: dbPayload.updated_at
      }

      setCopies(prev => [newCopy, ...prev])
      toast.success('Copy enviada para o banco!')
      return newCopy
    } catch (e: any) {
      console.error('Erro ao criar copy:', e.message || e)
      toast.error(e.message || 'Não foi possível criar a copy no servidor.')
      throw e
    }
  }

  const updateCopy = async (id: string, updates: Partial<OfferCopy>) => {
    try {
      // Mapeia atualizações parciais se necessário
      const dbUpdates: any = {}
      if (updates.name) dbUpdates.name = updates.name
      if (updates.type) dbUpdates.copy_type = COPY_TYPE_MAP[updates.type as CopyType]
      if (updates.status) dbUpdates.status = COPY_STATUS_MAP[updates.status as CopyStatus]
      if (updates.content !== undefined) dbUpdates.content = updates.content
      
      dbUpdates.updated_at = new Date().toISOString()

      const { error } = await supabase
        .from('offer_copies')
        .update(dbUpdates)
        .eq('id', id)

      if (error) throw error

      setCopies(prev => prev.map(c => 
        c.id === id ? { ...c, ...updates, updated_at: dbUpdates.updated_at } : c
      ))
    } catch (e: any) {
      console.error('Erro ao atualizar copy:', e.message || e)
      toast.error('Erro ao sincronizar atualização: ' + (e.message || ''))
    }
  }

  const deleteCopy = async (id: string) => {
    try {
      const { error } = await supabase
        .from('offer_copies')
        .delete()
        .eq('id', id)

      if (error) throw error

      setCopies(prev => prev.filter(c => c.id !== id))
      toast.success('Copy removida.')
    } catch (e: any) {
      console.error('Erro ao deletar copy:', e.message || e)
      toast.error('Erro ao excluir no servidor: ' + (e.message || ''))
    }
  }

  const duplicateCopy = async (id: string) => {
    try {
      const copyToDuplicate = copies.find(c => c.id === id)
      if (!copyToDuplicate) return

      const newId = crypto.randomUUID()
      const dbPayload = {
        id: newId,
        offer_id: offerId,
        name: `${copyToDuplicate.name} (Cópia)`,
        copy_type: COPY_TYPE_MAP[copyToDuplicate.type as CopyType] || 'blank',
        status: COPY_STATUS_MAP[copyToDuplicate.status as CopyStatus] || 'idea',
        content: copyToDuplicate.content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('offer_copies')
        .insert([dbPayload])

      if (error) throw error

      const newCopy: OfferCopy = {
        ...copyToDuplicate,
        id: newId,
        name: dbPayload.name,
        created_at: dbPayload.created_at,
        updated_at: dbPayload.updated_at
      }

      setCopies(prev => [newCopy, ...prev])
      toast.success('Cópia duplicada no servidor!')
    } catch (e: any) {
      console.error('Erro ao duplicar copy:', e.message || e)
      toast.error('Houve um erro ao duplicar no banco: ' + (e.message || ''))
    }
  }

  return {
    copies,
    loading,
    createCopy,
    updateCopy,
    deleteCopy,
    duplicateCopy,
    refresh: fetchCopies
  }
}
