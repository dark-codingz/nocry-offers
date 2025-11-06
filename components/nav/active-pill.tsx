'use client'

import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { useRouteTabs } from '@/hooks/use-route-tabs'
import { gsap } from 'gsap'
import { prefersReducedMotion } from '@/lib/gsap'

interface ActivePillProps {
  variant: 'bottom' | 'side'
  activePath: string
}

/**
 * Indicador ativo animado (pill mobile, barra desktop)
 */
export function ActivePill({ variant, activePath }: ActivePillProps) {
  const tabs = useRouteTabs()
  const activeIndex = tabs.findIndex(
    (tab) => activePath === tab.path || (tab.path !== '/' && activePath.startsWith(tab.path))
  )
  const pillRef = useRef<HTMLDivElement>(null)

  // Sheen effect com GSAP
  useEffect(() => {
    if (prefersReducedMotion() || !pillRef.current || activeIndex < 0) return

    const pill = pillRef.current
    
    // Reset position
    gsap.set(pill, {
      backgroundPosition: '200% 0',
    })

    // Animar sheen
    const sheen = gsap.to(pill, {
      backgroundPosition: '-200% 0',
      duration: 0.6,
      ease: 'power2.inOut',
    })

    return () => {
      sheen.kill()
    }
  }, [activePath, activeIndex])

  if (variant === 'bottom') {
    return (
      <motion.div
        ref={pillRef}
        layoutId="activePill"
        className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-[var(--nc-cyan)] to-[var(--nc-gold)] rounded-t-full"
        initial={false}
        animate={{
          x: activeIndex >= 0 ? `${(100 / tabs.length) * activeIndex}%` : 0,
          width: `${100 / tabs.length}%`,
        }}
        transition={{
          type: 'spring',
          stiffness: 380,
          damping: 28,
        }}
        style={{
          backgroundSize: '200% 100%',
          maxWidth: '100%',
          zIndex: 0,
        }}
      />
    )
  }

  // Side variant: barra vertical
  return (
    <motion.div
      ref={pillRef}
      layoutId="activePillSide"
      className="absolute left-0 w-1 bg-gradient-to-b from-[var(--nc-cyan)] to-[var(--nc-gold)] rounded-r-full"
      initial={false}
      animate={{
        y: activeIndex >= 0 ? `${activeIndex * 56 + 16}px` : 0,
        height: '40px',
      }}
      transition={{
        type: 'spring',
        stiffness: 380,
        damping: 28,
      }}
      style={{
        backgroundSize: '100% 200%',
        maxHeight: '100%',
        zIndex: 0,
      }}
    />
  )
}

