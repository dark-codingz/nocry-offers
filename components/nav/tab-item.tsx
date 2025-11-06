'use client'

import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useRef, useEffect } from 'react'
import Link from 'next/link'
import type { TabConfig } from '@/hooks/use-route-tabs'
import { prefersReducedMotion, createRipple } from '@/lib/gsap'
import { toast } from 'sonner'

interface TabItemProps {
  tab: TabConfig
  isActive: boolean
  variant: 'bottom' | 'side'
  isExpanded?: boolean
}

/**
 * Item de tab com micro-interações
 */
export function TabItem({ tab, isActive, variant, isExpanded = false }: TabItemProps) {
  const ref = useRef<HTMLAnchorElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  
  const x = useSpring(0, { stiffness: 300, damping: 30 })
  const y = useSpring(0, { stiffness: 300, damping: 30 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion() || variant === 'side') return
    
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return

    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    const deltaX = (e.clientX - centerX) * 0.1
    const deltaY = (e.clientY - centerY) * 0.1
    
    x.set(Math.max(-4, Math.min(4, deltaX)))
    y.set(Math.max(-4, Math.min(4, deltaY)))
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Link externo
    if (tab.isExternal && tab.externalUrl) {
      e.preventDefault()
      window.open(tab.externalUrl, '_blank', 'noopener,noreferrer')
      return
    }

    // Aviso "em desenvolvimento"
    if (tab.isDev) {
      e.preventDefault()
      toast.info('Em desenvolvimento', {
        description: `${tab.label} estará disponível em breve.`,
        duration: 3000,
      })
      return
    }

    if (!prefersReducedMotion() && ref.current) {
      createRipple(e.nativeEvent, ref.current)
    }
  }

  const Icon = tab.icon
  const showLabel = variant === 'bottom' || isExpanded

  // Se for dev ou externo, não usar Link do Next.js
  const content = (
    <>
      {/* Ícone */}
      <div className="relative">
        <motion.div
          animate={{
            opacity: isActive ? 1 : 0.8,
            y: isActive ? 0 : 0,
          }}
          whileHover={{
            y: -1,
          }}
          transition={{ duration: 0.2 }}
        >
          <Icon
            className={`${
              variant === 'bottom' ? 'h-5 w-5' : 'h-5 w-5'
            } transition-all ${
              isActive
                ? 'stroke-[2.5px]'
                : 'stroke-[2px]'
            }`}
          />
        </motion.div>

        {/* Badge */}
        {tab.badge !== null && tab.badge !== 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 210,
              damping: 18,
            }}
            className={`absolute -top-1 -right-1 ${
              tab.badge === '•'
                ? 'h-2 w-2 rounded-full bg-[var(--gold)]'
                : 'flex h-4 w-4 items-center justify-center rounded-full bg-[var(--gold)] text-[10px] font-bold text-[var(--primary-foreground)]'
            }`}
            style={{
              zIndex: 10,
            }}
          >
            {typeof tab.badge === 'number' && tab.badge}
          </motion.div>
        )}

        {/* Badge "DEV" para tabs em desenvolvimento (só se não tiver outro badge) */}
        {tab.isDev && (tab.badge === null || tab.badge === 0) && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 210,
              damping: 18,
            }}
            className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[8px] font-bold text-white"
            style={{
              zIndex: 10,
            }}
            title="Em desenvolvimento"
          >
            D
          </motion.div>
        )}
      </div>

      {/* Label */}
      <AnimatePresence>
        {showLabel && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: isActive ? 0.9 : 0.65, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className={`text-xs font-medium ${
              variant === 'bottom' ? 'mt-1' : ''
            }`}
          >
            {tab.label}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Pill ativa para mobile */}
      {isActive && variant === 'bottom' && (
        <motion.div
          layoutId="activePillBottom"
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-[var(--gold)] rounded-t-full"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.3 }}
          style={{
            zIndex: 1,
          }}
        />
      )}
    </>
  )

  // Se for link externo ou dev, usar button/a nativo
  if (tab.isExternal || tab.isDev) {
    return (
      <motion.div
        className={`relative flex-1 ${variant === 'side' ? 'mb-2' : ''}`}
        {...(variant === 'bottom' ? { style: { x, y } } : {})}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <a
          ref={ref as any}
          href={tab.isExternal ? tab.externalUrl : '#'}
          onClick={handleClick}
          role="button"
          className={`nc-focus-ring group relative flex ${
            variant === 'bottom'
              ? 'flex-col items-center justify-center h-full min-h-[44px]'
              : `flex-row items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-[var(--surface)] border border-[color-mix(in_srgb,var(--gold)_35%,var(--border))] text-[var(--fg)]'
                    : 'text-[var(--fg-dim)] hover:text-[var(--fg)]'
                }`
          } transition-colors ${
            variant === 'bottom' && isActive
              ? 'text-[var(--fg)]'
              : variant === 'bottom'
              ? 'text-[var(--fg-dim)] hover:text-[var(--fg)]'
              : ''
          }`}
          style={{
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {content}
        </a>
      </motion.div>
    )
  }

  // Link normal do Next.js
  return (
    <motion.div
      className={`relative flex-1 ${variant === 'side' ? 'mb-2' : ''}`}
      {...(variant === 'bottom' ? { style: { x, y } } : {})}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <Link
        ref={ref}
        href={tab.path}
        onClick={handleClick}
        role="link"
        aria-current={isActive ? 'page' : undefined}
        className={`nc-focus-ring group relative flex ${
          variant === 'bottom'
            ? 'flex-col items-center justify-center h-full min-h-[44px]'
            : `flex-row items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-[var(--surface)] border border-[color-mix(in_srgb,var(--gold)_35%,var(--border))] text-[var(--fg)]'
                  : 'text-[var(--fg-dim)] hover:text-[var(--fg)]'
              }`
        } transition-colors ${
          variant === 'bottom' && isActive
            ? 'text-[var(--fg)]'
            : variant === 'bottom'
            ? 'text-[var(--fg-dim)] hover:text-[var(--fg)]'
            : ''
        }`}
        style={{
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {content}
      </Link>
    </motion.div>
  )
}

