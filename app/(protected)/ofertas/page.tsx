'use client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { CreateOfferDialog } from '@/components/ofertas/create-offer-dialog'
import { Manrope } from 'next/font/google'
import { useOffers } from '@/hooks/use-offers'
import { Hero } from '@/components/ofertas/hero'
import { GlobalHeader } from '@/components/nav/global-header'

const manrope = Manrope({ subsets: ['latin'], weight: ['500', '600', '700'] })

export default function OfertasPage() {
  const searchParams = useSearchParams()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const { offers, loading } = useOffers()

  // Detectar ?new=1 e abrir modal automaticamente
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setCreateDialogOpen(true)
    }
  }, [searchParams])

  return (
    <div className={`${manrope.className} min-h-screen w-full max-w-full pt-[80px]`}>
      <GlobalHeader />
      {/* Container centralizado */}
      <div className="w-full px-8 pb-12 pt-4">
        <Hero onCreateClick={() => setCreateDialogOpen(true)} />


        {/* Board Kanban: solto no background principal */}
        <div className="mt-8">
          <section className="relative w-full max-w-full overflow-x-auto overscroll-x-contain no-scrollbar pb-8">
            <KanbanBoard onCreateClick={() => setCreateDialogOpen(true)} />
          </section>
        </div>
      </div>

      {/* Modal de criação */}
      <CreateOfferDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  )
}
