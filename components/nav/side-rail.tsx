'use client'

import { motion, LayoutGroup, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import { useRouteTabs } from '@/hooks/use-route-tabs'
import { TabItem } from './tab-item'

/**
 * Side Rail colapsável para desktop
 */
export function SideRail() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const pathname = usePathname()
  const tabs = useRouteTabs()

  // Expand on hover com delay (se não estiver pinado)
  useEffect(() => {
    if (isPinned) {
      setIsExpanded(true)
      return
    }

    if (isHovered && !isExpanded) {
      const timer = setTimeout(() => {
        setIsExpanded(true)
      }, 200)
      return () => clearTimeout(timer)
    } else if (!isHovered && isExpanded && !isPinned) {
      const timer = setTimeout(() => {
        setIsExpanded(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isHovered, isExpanded, isPinned])

  // Atualizar padding do main quando PINADO (não no hover)
  useEffect(() => {
    const main = document.querySelector('main')
    if (!main) return

    // Só muda padding quando pinado
    if (isPinned && isExpanded) {
      main.style.paddingLeft = 'var(--rail-w-expanded)'
      main.style.transition = 'padding-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    } else {
      main.style.paddingLeft = 'var(--rail-w-collapsed)'
      main.style.transition = 'padding-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    }
  }, [isPinned, isExpanded])

  return (
    <LayoutGroup>
      <motion.aside
        role="navigation"
        aria-label="Navegação principal"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        initial={false}
        animate={{
          width: isExpanded ? 260 : 84,
        }}
        transition={{
          type: 'spring',
          stiffness: 320,
          damping: 30,
        }}
        className="fixed left-0 top-0 z-[40] h-[100dvh] bg-[var(--surface)]/85 backdrop-blur-xl border-r border-[var(--border-color)] flex flex-col overflow-hidden"
        style={{
          maxHeight: '100dvh',
        }}
      >
        {/* Gradient edge vertical removido - não usar mais */}

        {/* Header com logo e toggle */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)] relative z-20 shrink-0">
          <AnimatePresence mode="wait">
            {isExpanded ? (
              <motion.div
                key="logo"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-lg font-bold text-[var(--gold)]"
              >
                NoCry
              </motion.div>
            ) : (
              <motion.div
                key="monogram"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="text-lg font-bold text-[var(--gold)]"
              >
                N
              </motion.div>
            )}
          </AnimatePresence>
          <motion.button
            onClick={() => {
              setIsPinned(!isPinned)
              if (!isPinned) {
                setIsExpanded(true)
              }
            }}
            className="nc-focus-ring p-1.5 rounded-lg text-[var(--fg-dim)] hover:text-[var(--fg)] hover:bg-[var(--muted-bg)] transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label={isPinned ? 'Desafixar navegação' : 'Fixar navegação'}
          >
            {isExpanded ? (
              <ChevronsLeft className="h-4 w-4" />
            ) : (
              <ChevronsRight className="h-4 w-4" />
            )}
          </motion.button>
        </div>

        {/* Tabs */}
        <nav className="flex-1 py-4 px-2 overflow-y-auto overflow-x-hidden relative z-20 min-h-0">
          {tabs.map((tab) => {
            const isActive = pathname === tab.path || (tab.path !== '/' && pathname.startsWith(tab.path))
            return (
              <TabItem
                key={tab.path}
                tab={tab}
                isActive={isActive}
                variant="side"
                isExpanded={isExpanded}
              />
            )
          })}
        </nav>
      </motion.aside>
    </LayoutGroup>
  )
}
