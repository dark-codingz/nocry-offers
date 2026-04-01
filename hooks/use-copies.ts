'use client'

import { useState, useEffect } from 'react'

export type CopyType = 'Em Branco' | 'VSL' | 'Criativo' | 'Quizz'
export type CopyStatus = 'Ideia' | 'Em escrita' | 'Pronto' | 'Validado'

export interface OfferCopy {
  id: string
  offer_id: string
  name: string
  type: CopyType
  status: CopyStatus
  content: string // Conteúdo HTML do Tiptap
  created_at: string
  updated_at: string
}

const MOCK_STORAGE_KEY = 'nocry_offer_copies'

export function useCopies(offerId: string) {
  const [copies, setCopies] = useState<OfferCopy[]>([])
  const [loading, setLoading] = useState(true)

  // Carrega copys do LocalStorage apenas para ambiente de protótipo sem backend
  useEffect(() => {
    const load = () => {
      try {
        const stored = localStorage.getItem(MOCK_STORAGE_KEY)
        if (stored) {
          const allCopies = JSON.parse(stored) as OfferCopy[]
          // Filtra pela oferta atual
          setCopies(allCopies.filter(c => c.offer_id === offerId))
        }
      } catch (e) {
        console.error('Erro ao ler copies locais', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [offerId])

  const saveToStorage = (newCopies: OfferCopy[]) => {
    try {
      const stored = localStorage.getItem(MOCK_STORAGE_KEY)
      let allCopies: OfferCopy[] = stored ? JSON.parse(stored) : []
      
      // Remove as antigas dessa oferta e substitui pelas novas
      allCopies = allCopies.filter(c => c.offer_id !== offerId).concat(newCopies)
      
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(allCopies))
    } catch (e) {
      console.error('Erro ao salvar no storage', e)
    }
  }

  const createCopy = async (data: { name: string; type: CopyType }) => {
    const newCopy: OfferCopy = {
      id: crypto.randomUUID(),
      offer_id: offerId,
      name: data.name,
      type: data.type,
      status: 'Ideia',
      content: data.type === 'VSL' ? '<h1>Título da VSL</h1><p>Comece sua redline aqui...</p>' : '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const updated = [newCopy, ...copies]
    setCopies(updated)
    saveToStorage(updated)
    return newCopy
  }

  const updateCopy = async (id: string, updates: Partial<OfferCopy>) => {
    const updated = copies.map(c => 
      c.id === id 
        ? { ...c, ...updates, updated_at: new Date().toISOString() } 
        : c
    )
    setCopies(updated)
    saveToStorage(updated)
  }

  const deleteCopy = async (id: string) => {
    const updated = copies.filter(c => c.id !== id)
    setCopies(updated)
    saveToStorage(updated)
  }

  const duplicateCopy = async (id: string) => {
    const copyToDuplicate = copies.find(c => c.id === id)
    if (!copyToDuplicate) return

    const newCopy: OfferCopy = {
      ...copyToDuplicate,
      id: crypto.randomUUID(),
      name: `${copyToDuplicate.name} (Cópia)`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const updated = [newCopy, ...copies]
    setCopies(updated)
    saveToStorage(updated)
  }

  return {
    copies,
    loading,
    createCopy,
    updateCopy,
    deleteCopy,
    duplicateCopy
  }
}
