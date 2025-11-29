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

  const totalAtivos = stats.emAnalise + stats.aprovadas + stats.emProducao + stats.pausadas

  return (
    <div className={`${manrope.className} min-h-screen w-full max-w-full`}>
      {/* Container centralizado - header solto no fundo preto */}
      <div className="w-full px-6 pb-12 pt-8">
        {/* Header: título, badge, botão, busca, filtros - tudo solto no fundo preto */}
        <Hero onCreateClick={() => setCreateDialogOpen(true)} stats={stats} totalAtivos={totalAtivos} />

        {/* Toolbar: filtros em pills - também solto no fundo preto */}
        <Toolbar resultCount={offers.length} />

        {/* Board Kanban: apenas ele fica dentro de um container cinza */}
        <div className="mt-8 bg-[#0a0a0c] rounded-3xl border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-6">
          <section className="relative w-full max-w-full overflow-x-auto overscroll-x-contain">
            <KanbanBoard onCreateClick={() => setCreateDialogOpen(true)} />
          </section>
        </div>
      </div>

      {/* Modal de criação */}
      <CreateOfferDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  )
}
