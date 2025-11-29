'use client'

import { OfferCard } from './offer-card'
import type { Offer, OfferStatus } from '@/lib/types'

interface KanbanColumnProps {
  status: OfferStatus
  offers: Offer[]
}

export function KanbanColumn({ status, offers }: KanbanColumnProps) {
  return (
    <section className="min-h-[68vh] rounded-2xl bg-black/20 border border-white/5 p-4 shadow-[0_4px_16px_rgba(0,0,0,0.2)] overflow-hidden">
      {/* Header da coluna - suave, sem linhas fortes */}
      <header className="flex items-center justify-between mb-4 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-white">{status}</h3>
          <span className="text-xs text-white/50">
            {offers.length} oferta{offers.length !== 1 ? 's' : ''}
          </span>
        </div>
        {/* Badge circular discreto */}
        <div className="w-6 h-6 rounded-full bg-black/40 border border-white/5 flex items-center justify-center">
          <span className="text-xs font-medium text-white/60">{offers.length}</span>
        </div>
      </header>

      {/* Cards */}
      <div className="space-y-3 overflow-y-auto overflow-x-hidden" style={{ maxHeight: 'calc(68vh - 60px)' }}>
        {offers.map((offer) => (
          <OfferCard key={offer.id} offer={offer} />
        ))}
      </div>
    </section>
  )
}
