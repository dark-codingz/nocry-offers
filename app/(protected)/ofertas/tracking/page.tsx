'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { TrackedOfferCard } from '@/components/tracking/tracked-offer-card'
import { TrackedOfferForm } from '@/components/tracking/tracked-offer-form'
import { TrackedOfferDetailsModal } from '@/components/tracking/tracked-offer-details-modal'
import type { OfferTracked, OfferTrackedWithLatest, CreateOfferTrackedData, UpdateOfferTrackedData } from '@/lib/tracking/types'
import { calculateTrackingStatus } from '@/lib/tracking/status'
import { toast } from 'sonner'

export default function TrackingPage() {
  const [offers, setOffers] = useState<OfferTrackedWithLatest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingOffer, setEditingOffer] = useState<OfferTracked | null>(null)
  const [detailsOfferId, setDetailsOfferId] = useState<string | null>(null)

  // Carregar ofertas
  const fetchOffers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      if (statusFilter !== 'all') params.set('status', statusFilter)

      const response = await fetch(`/api/offers-tracked?${params.toString()}`)
      const result = await response.json()

      if (result.ok) {
        // Enriquecer com snapshots e calcular status
        const enriched = await Promise.all(
          (result.data as OfferTracked[]).map(async (offer) => {
            // Buscar snapshots
            const snapResponse = await fetch(`/api/offers-tracked/${offer.id}`)
            const snapResult = await snapResponse.json()
            const snapshots = snapResult.ok ? snapResult.data.snapshots || [] : []

            const latest = snapshots[0]
            const previous = snapshots[1]
            const delta = latest && previous ? latest.ads_count - previous.ads_count : null
            const status_calculado = calculateTrackingStatus(snapshots)

            return {
              ...offer,
              latest_snapshot: latest,
              delta,
              status_calculado,
            } as OfferTrackedWithLatest
          })
        )

        setOffers(enriched)
      } else {
        toast.error(result.error || 'Erro ao carregar ofertas')
      }
    } catch (error: any) {
      console.error('Erro ao carregar ofertas:', error)
      toast.error('Erro ao carregar ofertas rastreadas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOffers()
  }, [searchQuery, statusFilter])

  // Criar oferta
  const handleCreate = async (data: CreateOfferTrackedData | UpdateOfferTrackedData) => {
    try {
      // Garantir que campos obrigatórios estão presentes
      if (!('name' in data && data.name) || !('country' in data && data.country) || !('ads_library_url' in data && data.ads_library_url)) {
        toast.error('Nome, país e URL da Ads Library são obrigatórios')
        return
      }

      const response = await fetch('/api/offers-tracked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data as CreateOfferTrackedData),
      })

      const result = await response.json()

      if (result.ok) {
        toast.success('Oferta rastreada criada com sucesso')
        setShowCreateModal(false)
        await fetchOffers()

        // Opcional: fazer refresh automático inicial
        if (result.data?.id) {
          setTimeout(() => {
            handleRefresh(result.data.id)
          }, 1000)
        }
      } else {
        toast.error(result.error || 'Erro ao criar oferta')
      }
    } catch (error: any) {
      toast.error('Erro ao criar oferta rastreada')
    }
  }

  // Atualizar oferta
  const handleUpdate = async (data: UpdateOfferTrackedData) => {
    if (!editingOffer) return

    try {
      const response = await fetch(`/api/offers-tracked/${editingOffer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (result.ok) {
        toast.success('Oferta atualizada com sucesso')
        setEditingOffer(null)
        await fetchOffers()
      } else {
        toast.error(result.error || 'Erro ao atualizar oferta')
      }
    } catch (error: any) {
      toast.error('Erro ao atualizar oferta')
    }
  }

  // Refresh (buscar contagem)
  const handleRefresh = async (id: string) => {
    try {
      const response = await fetch(`/api/offers-tracked/${id}/refresh`, {
        method: 'POST',
      })

      const result = await response.json()

      if (result.ok) {
        // Atualizar oferta na lista
        await fetchOffers()
        return Promise.resolve()
      } else {
        // Mensagens específicas por tipo de erro
        let errorMessage = result.error || 'Erro ao atualizar'
        
        if (response.status === 422) {
          errorMessage = 'Não consegui encontrar o número de anúncios na página. A Meta pode ter mudado o layout.'
        } else if (response.status === 502) {
          errorMessage = 'Erro ao buscar página da Ads Library. Verifique a URL ou tente novamente.'
        } else if (response.status >= 400 && response.status < 500) {
          errorMessage = result.error || 'Erro ao atualizar. Verifique a página da Ads Library.'
        }

        throw new Error(errorMessage)
      }
    } catch (error: any) {
      // Se for erro de rede, mostrar mensagem genérica
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Erro de conexão. Verifique sua internet e tente novamente.')
      }
      throw error
    }
  }

  // Editar oferta
  const handleEdit = async (id: string) => {
    try {
      const response = await fetch(`/api/offers-tracked/${id}`)
      const result = await response.json()
      if (result.ok) {
        setEditingOffer(result.data.offer)
      } else {
        toast.error('Erro ao carregar oferta para edição')
      }
    } catch (error: any) {
      toast.error('Erro ao carregar oferta')
    }
  }

  // Arquivar oferta
  const handleArchive = async (id: string) => {
    if (!confirm('Tem certeza que deseja arquivar esta oferta?')) return

    try {
      const response = await fetch(`/api/offers-tracked/${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.ok) {
        toast.success('Oferta arquivada')
        await fetchOffers()
      } else {
        toast.error(result.error || 'Erro ao arquivar oferta')
      }
    } catch (error: any) {
      toast.error('Erro ao arquivar oferta')
    }
  }

  // Filtrar ofertas por status
  const filteredOffers = offers.filter((offer) => {
    if (statusFilter === 'all') return true
    return offer.status_calculado === statusFilter
  })

  return (
    <div className="min-h-screen w-full max-w-full">
      <div className="w-full max-w-7xl mx-auto px-6 pb-12 pt-8">
        {/* Header */}
        <div className="mb-8">
          <div className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
            RASTREAMENTO
          </div>
          <h1 className="text-4xl font-semibold text-white mb-2">
            Rastreamento de Ofertas
          </h1>
          <p className="text-sm text-white/60">
            Monitore o número de anúncios ativos de cada oferta ao longo dos dias.
          </p>
        </div>

        {/* Barra de busca e filtros */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome ou nicho..."
                className="pl-11"
              />
            </div>
            <Button
              variant="gold"
              onClick={() => setShowCreateModal(true)}
              className="sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar oferta rastreada
            </Button>
          </div>

          {/* Filtro de status */}
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-white/40" />
            <span className="text-xs font-medium text-white/40 uppercase tracking-wider mr-2">
              Status:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-full px-3 py-1.5 text-xs font-medium bg-transparent border border-white/10 text-white/60 hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
            >
              <option value="all">Todos</option>
              <option value="RECEM_LANCADA">Recém-lançada</option>
              <option value="COMECANDO_A_ESCALAR">Começando a escalar</option>
              <option value="ESCALANDO_FORTE">Escalando forte</option>
              <option value="POSSIVEL_PAUSA">Possível pausa</option>
              <option value="ESTAVEL">Estável</option>
            </select>
          </div>
        </div>

        {/* Grid de cards */}
        {loading ? (
          <div className="text-center py-12 text-white/60">Carregando...</div>
        ) : filteredOffers.length === 0 ? (
          <div className="text-center py-12 text-white/60">
            {searchQuery || statusFilter !== 'all'
              ? 'Nenhuma oferta encontrada com os filtros aplicados'
              : 'Nenhuma oferta rastreada ainda. Adicione uma para começar'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOffers.map((offer) => (
              <TrackedOfferCard
                key={offer.id}
                offer={offer}
                onRefresh={handleRefresh}
                onDetails={setDetailsOfferId}
                onEdit={handleEdit}
                onArchive={handleArchive}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de criar */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Oferta Rastreada</DialogTitle>
          </DialogHeader>
          <TrackedOfferForm
            onSubmit={handleCreate}
            onCancel={() => setShowCreateModal(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Modal de editar */}
      <Dialog open={!!editingOffer} onOpenChange={(open) => !open && setEditingOffer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Oferta Rastreada</DialogTitle>
          </DialogHeader>
          {editingOffer && (
            <TrackedOfferForm
              offer={editingOffer}
              onSubmit={handleUpdate}
              onCancel={() => setEditingOffer(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de detalhes */}
      <TrackedOfferDetailsModal
        open={!!detailsOfferId}
        onOpenChange={(open) => !open && setDetailsOfferId(null)}
        offerId={detailsOfferId}
      />
    </div>
  )
}

