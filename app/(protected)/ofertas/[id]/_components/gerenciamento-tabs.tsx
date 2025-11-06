'use client'

import { useState } from 'react'
import type { Offer } from '@/lib/types'
import { ShortcutsBar } from './shortcuts-bar'
import { ChecklistCard } from './checklist-card'
import { ProgressCard } from './progress-card'
import { DetalhesPaginasSection } from './detalhes-paginas-section'
import { DetalhesPixelSection } from './detalhes-pixel-section'
import { DetalhesCriativosSection } from './detalhes-criativos-section'
import { DetalhesEntregaveisSection } from './detalhes-entregaveis-section'
import { DetalhesUpsellsSection } from './detalhes-upsells-section'
import { motion, AnimatePresence } from 'framer-motion'
import { useGsapOnce } from '@/hooks/use-gsap-once'
import { useRef } from 'react'

interface GerenciamentoTabsProps {
  offer: Offer
}

export function GerenciamentoTabs({ offer }: GerenciamentoTabsProps) {
  const [activeTab, setActiveTab] = useState<'gerenciamento' | 'detalhes'>('gerenciamento')
  const underlineRef = useRef<HTMLDivElement>(null)

  // Animar underline com GSAP sheen
  useGsapOnce((gsapModule) => {
    if (!underlineRef.current) return
    const underline = underlineRef.current

    const gsap = (gsapModule as any).default || (gsapModule as any).gsap || gsapModule
    gsap.set(underline, {
      backgroundPosition: '200% 0',
    })

    const sheen = gsap.to(underline, {
      backgroundPosition: '-200% 0',
      duration: 0.6,
      ease: 'power2.inOut',
      repeat: -1,
      repeatDelay: 2,
    })

    return () => {
      sheen.kill()
    }
  })

  return (
    <>
      {/* Tabbar - Alinhada à direita, ~80% de largura */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05 }}
        className="nc-glass mb-6 w-full md:w-[80%] md:ml-auto md:mr-0 px-2 py-2 rounded-2xl"
      >
        <div className="relative flex">
          <button
            onClick={() => setActiveTab('gerenciamento')}
            className={`tab flex-1 relative px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'gerenciamento'
                ? 'text-[var(--fg)]'
                : 'text-[var(--fg-dim)] hover:text-[var(--fg)]'
            }`}
          >
            Gerenciamento
            {activeTab === 'gerenciamento' && (
              <motion.div
                ref={underlineRef}
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--gold)]"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.3 }}
                style={{
                  backgroundSize: '200% 100%',
                }}
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab('detalhes')}
            className={`tab flex-1 relative px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'detalhes'
                ? 'text-[var(--fg)]'
                : 'text-[var(--fg-dim)] hover:text-[var(--fg)]'
            }`}
          >
            Detalhes
            {activeTab === 'detalhes' && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--gold)]"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.3 }}
                style={{
                  backgroundSize: '200% 100%',
                }}
              />
            )}
          </button>
        </div>
      </motion.div>

      {/* Conteúdo baseado na tab ativa */}
      <AnimatePresence mode="wait">
        {activeTab === 'gerenciamento' ? (
          <motion.div
            key="gerenciamento"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 lg:space-y-8"
          >
            {/* Card de atalhos */}
            <ShortcutsBar offer={offer} />

            {/* Grid principal: Checklist (esquerda) + Progresso (direita) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px] lg:gap-8">
              {/* Checklist Card */}
              <ChecklistCard offerId={offer.id} />

              {/* Progress Card */}
              <ProgressCard offerId={offer.id} />
            </div>

            {/* Card Ideias e anotações (placeholder) */}
            <div className="nc-glass p-4 md:p-6 rounded-2xl">
              <h3 className="section-title mb-4 text-[var(--fg)]">Ideias e anotações</h3>
              <p className="text-sm text-[var(--fg-dim)]">Em breve...</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="detalhes"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Grid Páginas (esquerda) + Pixel (direita) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
              <DetalhesPaginasSection offerId={offer.id} />
              <DetalhesPixelSection offerId={offer.id} />
            </div>

            {/* Criativos */}
            <DetalhesCriativosSection offerId={offer.id} />

            {/* Entregáveis */}
            <DetalhesEntregaveisSection offerId={offer.id} />

            {/* Upsells */}
            <DetalhesUpsellsSection offerId={offer.id} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

