'use client'

import { usePathname } from 'next/navigation'
import { TabBar } from '@/components/nav/tab-bar'
import { useEffect } from 'react'

export default function AppNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const clean = (pathname ?? '').replace(/\/+$/, '') // remove barra final

  // Esconder se começa com /ofertas/ e não é exatamente /ofertas
  const hideOnOfferDetails = clean.startsWith('/ofertas/') && clean !== '/ofertas'

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

