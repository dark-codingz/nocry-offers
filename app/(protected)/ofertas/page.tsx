'use client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { CreateOfferDialog } from '@/components/ofertas/create-offer-dialog'
import { Hero } from '@/components/ofertas/hero'
import { Toolbar } from '@/components/ofertas/toolbar'
import { Manrope } from 'next/font/google'
import { useOffers } from '@/hooks/use-offers'

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

  // Calcular estatísticas
  const stats = useMemo(() => {
    return {
      emAnalise: offers.filter((o) => o.status === 'Em análise').length,
      aprovadas: offers.filter((o) => o.status === 'Modelando').length,
      emProducao: offers.filter((o) => o.status === 'Rodando').length,
      pausadas: offers.filter((o) => o.status === 'Encerrada').length,
    }
  }, [offers])

  return (
    <div className={`${manrope.className} min-h-screen w-full max-w-full`}>
      {/* Safe area: conteúdo não fica coberto pelo trigger */}
      <div className="px-6 pb-8 pt-6 mt-[64px] sm:mt-8 w-full max-w-full">
        {/* Hero funcional */}
        <Hero onCreateClick={() => setCreateDialogOpen(true)} stats={stats} />

        {/* Toolbar avançada */}
        <Toolbar resultCount={offers.length} />

        {/* Board wrapper */}
        <section className="relative w-full max-w-full overflow-x-auto overscroll-x-contain">
          <KanbanBoard onCreateClick={() => setCreateDialogOpen(true)} />
        </section>
      </div>

      {/* Modal de criação */}
      <CreateOfferDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  )
}
