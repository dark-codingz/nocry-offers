'use client'

import { useState } from 'react'
import { ExternalLink, RefreshCw, MoreVertical, Trash2, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getStatusLabel, getStatusColor, type TrackingStatus } from '@/lib/tracking/status'
import type { OfferTrackedWithLatest } from '@/lib/tracking/types'
import { toast } from 'sonner'

interface TrackedOfferCardProps {
  offer: OfferTrackedWithLatest
  onRefresh: (id: string) => Promise<void>
  onDetails: (id: string) => void
  onEdit: (id: string) => void
  onArchive: (id: string) => void
}

export function TrackedOfferCard({
  offer,
  onRefresh,
  onDetails,
  onEdit,
  onArchive,
}: TrackedOfferCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await onRefresh(offer.id)
      toast.success('Oferta atualizada com sucesso')
    } catch (error: any) {
      // Mensagem de erro já vem formatada do backend/frontend
      const message = error.message || 'Erro ao atualizar oferta'
      toast.error(message, {
        duration: 5000, // Mostrar por mais tempo para erros
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const status = (offer.status_calculado || 'ESTAVEL') as TrackingStatus
  const statusColors = getStatusColor(status)
  const statusLabel = getStatusLabel(status)
  const currentCount = offer.latest_snapshot?.ads_count || 0
  const delta = offer.delta ?? null

  return (
    <Card className="p-5 hover:border-white/30 transition-all">
      {/* Header: Nome + Menu */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-lg mb-1 line-clamp-2">{offer.name}</h3>
          <p className="text-sm text-white/50">
            {offer.country}
            {offer.niche && ` · ${offer.niche}`}
          </p>
        </div>

        {/* Menu de ações */}
        <div className="relative ml-2">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <MoreVertical className="h-4 w-4 text-white/60" />
          </button>
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-1 rounded-lg border border-white/10 bg-[#050508] shadow-lg min-w-[160px]">
                <button
                  onClick={() => {
                    onEdit(offer.id)
                    setShowMenu(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/5"
                >
                  <Edit2 className="h-4 w-4" />
                  Editar
                </button>
                <button
                  onClick={() => {
                    onArchive(offer.id)
                    setShowMenu(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-white/5"
                >
                  <Trash2 className="h-4 w-4" />
                  Arquivar
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Métrica principal */}
      <div className="mb-4">
        <div className="text-3xl font-bold text-white mb-1">{currentCount}</div>
        <div className="text-sm text-white/60">anúncios</div>
        {delta !== null && (
          <div className={`text-xs mt-1 ${delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {delta >= 0 ? '+' : ''}
            {delta} vs. último refresh
          </div>
        )}
      </div>

      {/* Status */}
      <div className={`mb-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
        {statusLabel}
      </div>

      {/* Rodapé de ações */}
      <div className="flex items-center gap-2 pt-4 border-t border-white/10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.open(offer.ads_library_url, '_blank')}
          className="flex-1"
        >
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
          Biblioteca
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex-1"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Atualizando...' : 'Refresh'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDetails(offer.id)}
          className="flex-1"
        >
          Detalhes
        </Button>
      </div>
    </Card>
  )
}

