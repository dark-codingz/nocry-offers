'use client'

import { usePathname } from 'next/navigation'
import { TabBar } from '@/components/nav/tab-bar'
import { useEffect } from 'react'

export default function AppNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const clean = (pathname ?? '').replace(/\/+$/, '') // remove barra final

  // Esconder sidebar apenas em páginas específicas:
  // - /ofertas/[id] (detalhes da oferta - formato UUID)
  // - /ofertas/editor/[id] (editor visual)
  // Mas mostrar em:
  // - /ofertas (lista principal)
  // - /ofertas/tracking (rastreamento)
  const isOfferDetailsPage = clean.match(/^\/ofertas\/[a-f0-9-]{36}$/) // UUID pattern
  const isEditorPage = clean.startsWith('/ofertas/editor/')
  const hideOnOfferDetails = isOfferDetailsPage || isEditorPage

  // Ajustar padding do main quando estiver na página de detalhes
  useEffect(() => {
    const main = document.querySelector('main')
    if (!main) return

    if (hideOnOfferDetails) {
      main.style.paddingLeft = '0'
    } else {
      main.style.paddingLeft = ''
    }
  }, [hideOnOfferDetails])

  return (
    <>
      {!hideOnOfferDetails && <TabBar />}
      {children}
    </>
  )
}

