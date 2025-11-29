'use client'

import { useState, useEffect } from 'react'
import { ExternalLink } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AdsCountChart } from './ads-count-chart'
import { getStatusLabel, getStatusColor, calculateTrackingStatus, type TrackingStatus } from '@/lib/tracking/status'
import type { OfferTracked, OfferAdsSnapshot } from '@/lib/tracking/types'

interface TrackedOfferDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  offerId: string | null
}

export function TrackedOfferDetailsModal({
  open,
  onOpenChange,
  offerId,
}: TrackedOfferDetailsModalProps) {
  const [loading, setLoading] = useState(false)
  const [offer, setOffer] = useState<OfferTracked | null>(null)
  const [snapshots, setSnapshots] = useState<OfferAdsSnapshot[]>([])

  useEffect(() => {
    if (!open || !offerId) return

    const fetchDetails = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/offers-tracked/${offerId}`)
        const result = await response.json()
        if (result.ok) {
          setOffer(result.data.offer)
          setSnapshots(result.data.snapshots || [])
        }
      } catch (error) {
        console.error('Erro ao buscar detalhes:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [open, offerId])

  if (!offer) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="py-8 text-center text-white/60">
            {loading ? 'Carregando...' : 'Oferta não encontrada'}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Calcular status a partir dos snapshots
  const status = snapshots.length > 0
    ? calculateTrackingStatus(snapshots.map(s => ({ ads_count: s.ads_count, taken_at: s.taken_at })))
    : 'RECEM_LANCADA'
  const statusColors = getStatusColor(status)
  const statusLabel = getStatusLabel(status)
  const currentCount = snapshots[0]?.ads_count || 0

  // Calcular deltas
  const snapshotsWithDelta = snapshots.map((snapshot, index) => {
    const prev = snapshots[index + 1]
    const delta = prev ? snapshot.ads_count - prev.ads_count : null
    return { ...snapshot, delta }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{offer.name}</DialogTitle>
          <p className="text-sm text-white/60 mt-1">
            {offer.country}
            {offer.niche && ` · ${offer.niche}`}
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Status e métricas */}
          <div className="flex items-center gap-4">
            <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
              {statusLabel}
            </div>
            <div className="text-sm text-white/60">
              <span className="font-semibold text-white">{currentCount}</span> anúncios ativos agora
            </div>
          </div>

          {/* Links */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(offer.ads_library_url, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir Biblioteca
            </Button>
            {offer.landing_page_url && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(offer.landing_page_url, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir LP
              </Button>
            )}
          </div>

          {/* Notas */}
          {offer.notes && (
            <div>
              <h4 className="text-sm font-medium text-white/80 mb-2">Notas</h4>
              <p className="text-sm text-white/60">{offer.notes}</p>
            </div>
          )}

          {/* Gráfico */}
          <div>
            <h4 className="text-sm font-medium text-white/80 mb-4">Evolução de anúncios</h4>
            <AdsCountChart snapshots={snapshots} />
          </div>

          {/* Histórico */}
          <div>
            <h4 className="text-sm font-medium text-white/80 mb-4">Histórico de snapshots</h4>
            <div className="border border-white/10 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-black/20">
                  <tr>
                    <th className="px-4 py-2 text-left text-white/60 font-medium">Data/Hora</th>
                    <th className="px-4 py-2 text-left text-white/60 font-medium">Anúncios</th>
                    <th className="px-4 py-2 text-left text-white/60 font-medium">Delta</th>
                    <th className="px-4 py-2 text-left text-white/60 font-medium">Fonte</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshotsWithDelta.map((snapshot) => (
                    <tr key={snapshot.id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="px-4 py-2 text-white/80">
                        {new Date(snapshot.taken_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-2 text-white font-medium">{snapshot.ads_count}</td>
                      <td className="px-4 py-2">
                        {snapshot.delta !== null && (
                          <span className={snapshot.delta >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {snapshot.delta >= 0 ? '+' : ''}
                            {snapshot.delta}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-white/60">{snapshot.source}</td>
                    </tr>
                  ))}
                  {snapshots.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-white/50">
                        Nenhum snapshot ainda
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

