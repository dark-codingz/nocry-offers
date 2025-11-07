'use client'

import { OfferCard } from './offer-card'
import type { Offer, OfferStatus } from '@/lib/types'

interface KanbanColumnProps {
  status: OfferStatus
  offers: Offer[]
}

export function KanbanColumn({ status, offers }: KanbanColumnProps) {
  const styleByStatus: Record<OfferStatus, { border: string }> = {
    'Descartada': { border: 'border-white/10' },
    'Em análise': { border: 'border-yellow-300/25' },
    'Modelando': { border: 'border-sky-300/25' },
    'Rodando': { border: 'border-emerald-300/25' },
    'Encerrada': { border: 'border-rose-300/25' },
  }

  const { border } = styleByStatus[status]

  return (
    <section className={`min-h-[68vh] rounded-2xl border bg-white/12 p-3 shadow-xl backdrop-blur-xl overflow-hidden ${border}`}>
      {/* Header da coluna com glass mais forte */}
      <header className="flex items-center justify-between rounded-xl border-b border-white/25 bg-white/[0.15] px-2 py-2 shadow-md backdrop-blur-lg">
        <h3 className="font-semibold text-white/90 truncate min-w-0">{status}</h3>
        <span className="rounded-lg bg-white/20 px-2 py-0.5 text-sm font-medium text-white/80 shadow-sm backdrop-blur-sm shrink-0">
          {offers.length}
        </span>
      </header>

      {/* Cards */}
      <div className="mt-3 space-y-3 overflow-y-auto overflow-x-hidden">
        {offers.map((offer) => (
          <OfferCard key={offer.id} offer={offer} />
        ))}
      </div>
    </section>
  )
}
