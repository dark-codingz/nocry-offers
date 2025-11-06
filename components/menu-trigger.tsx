'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion'
import { X, Menu } from 'lucide-react'
import { NoCryDrawer } from './nav/no-cry-drawer'

/**
 * Trigger hamburger premium com morph para X
 * Fixo no topo-esquerda, com animações suaves
 */
export function MenuTriggerOnly() {
  const [isOpen, setIsOpen] = useState(false)

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  // Lock body scroll quando menu aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Fechar com Esc
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen])

  return (
    <>
      {/* Trigger fixo - desaparece quando menu aberto */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            onClick={toggleMenu}
            className="fixed top-3 left-3 z-50 flex h-11 w-11 items-center justify-center rounded-lg bg-[#14141A]/90 backdrop-blur-md border border-white/10 text-[#FFD369] transition-colors hover:bg-[#14141A] hover:border-[#7DF9FF]/30 focus:outline-none focus:ring-2 focus:ring-[#7DF9FF]/50 focus:ring-offset-2 focus:ring-offset-[#14141A]"
            aria-label="Abrir menu"
            aria-expanded={isOpen}
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <motion.div
              className="flex flex-col items-center justify-center space-y-1.5"
              animate={{
                scale: [1, 0.98, 1, 0.98, 1],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <motion.span
                className="h-0.5 w-6 bg-current rounded-full"
                animate={{
                  opacity: [1, 0.8, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: 0,
                  ease: 'easeInOut',
                }}
              />
              <motion.span
                className="h-0.5 w-6 bg-current rounded-full"
                animate={{
                  opacity: [1, 0.8, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: 0.2,
                  ease: 'easeInOut',
                }}
              />
              <motion.span
                className="h-0.5 w-6 bg-current rounded-full"
                animate={{
                  opacity: [1, 0.8, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: 0.4,
                  ease: 'easeInOut',
                }}
              />
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Drawer */}
      <NoCryDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
