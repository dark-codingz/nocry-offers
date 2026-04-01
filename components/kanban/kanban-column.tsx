'use client'

import { OfferCard } from './offer-card'
import type { Offer, OfferStatus } from '@/lib/types'

interface KanbanColumnProps {
  title?: string
  status: OfferStatus
  offers: Offer[]
}

const getDotColor = (status: OfferStatus) => {
  switch(status) {
    case 'Descartada': return 'bg-[#6B7280]'
    case 'Em análise': return 'bg-[#6B7280]'
    case 'Modelando': return 'bg-[#F59E0B]'
    case 'Rodando': return 'bg-[#8B5CF6]'
    case 'Encerrada': return 'bg-[#22C55E]'
    default: return 'bg-[#6B7280]'
  }
}

export function KanbanColumn({ title, status, offers }: KanbanColumnProps) {
  const displayTitle = title || status
  const dotColor = getDotColor(status)

  return (
    <section className="min-h-[68vh] flex flex-col">
      {/* Header da coluna (Estilo Pílula / Caixa correspondente à imagem) */}
      <header className="flex items-center gap-2 mb-4 px-4 py-[13px] rounded-[10px] bg-[#202020] w-full shadow-sm">
        {/* Ponto Colorido respectivo ao Status */}
        <div className={`w-2 h-2 rounded-full ${dotColor}`}></div>
        
        {/* Número de itens em negrito branco */}
        <span className="text-[13px] font-semibold text-white ml-0.5">{offers.length}</span>
        
        {/* Nome da Coluna em cor secundária */}
        <h3 className="text-[13px] font-medium text-[#E5E5E5] ml-1 truncate tracking-wide">{displayTitle}</h3>
      </header>

      {/* Cards */}
      <div className="space-y-3 overflow-y-auto overflow-x-hidden flex-1 pb-4 no-scrollbar">
        {offers.map((offer) => (
          <OfferCard key={offer.id} offer={offer} />
        ))}
      </div>
    </section>
  )
}
