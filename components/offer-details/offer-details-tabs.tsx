'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ResumoTab } from './tabs/resumo-tab'
import { CriativosTab } from './tabs/criativos-tab'
import { PaginasTab } from './tabs/paginas-tab'
import { EntregaveisTab } from './tabs/entregaveis-tab'
import { UpsellTab } from './tabs/upsell-tab'
import { PixelTab } from './tabs/pixel-tab'
import { AnexosComentariosTab } from './tabs/anexos-comentarios-tab'
import type { Offer } from '@/lib/types'

interface OfferDetailsTabsProps {
  offer: Offer
}

export function OfferDetailsTabs({ offer }: OfferDetailsTabsProps) {
  return (
    <Tabs defaultValue="resumo" className="w-full">
      <TabsList className="grid w-full grid-cols-7">
        <TabsTrigger value="resumo">Resumo</TabsTrigger>
        <TabsTrigger value="criativos">Criativos</TabsTrigger>
        <TabsTrigger value="paginas">Páginas</TabsTrigger>
        <TabsTrigger value="entregaveis">Entregáveis</TabsTrigger>
        <TabsTrigger value="upsell">Upsell</TabsTrigger>
        <TabsTrigger value="pixel">Pixel</TabsTrigger>
        <TabsTrigger value="anexos">Anexos</TabsTrigger>
      </TabsList>

      <TabsContent value="resumo">
        <ResumoTab offer={offer} />
      </TabsContent>

      <TabsContent value="criativos">
        <CriativosTab offerId={offer.id} />
      </TabsContent>

      <TabsContent value="paginas">
        <PaginasTab offerId={offer.id} />
      </TabsContent>

      <TabsContent value="entregaveis">
        <EntregaveisTab offerId={offer.id} />
      </TabsContent>

      <TabsContent value="upsell">
        <UpsellTab offerId={offer.id} />
      </TabsContent>

      <TabsContent value="pixel">
        <PixelTab offerId={offer.id} />
      </TabsContent>

      <TabsContent value="anexos">
        <AnexosComentariosTab offerId={offer.id} />
      </TabsContent>
    </Tabs>
  )
}




