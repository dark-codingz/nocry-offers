'use client'

import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { X, Package, Copy } from 'lucide-react'
import { useEffect, useRef } from 'react'

interface NoCryDrawerProps {
  isOpen: boolean
  onClose: () => void
}

const menuItems = [
  { name: 'Ofertas', path: '/ofertas', icon: Package },
  { name: 'Clone Tool', path: '/clone', icon: Copy },
]

/**
 * Drawer premium com glassmorphism + neon
 */
export function NoCryDrawer({ isOpen, onClose }: NoCryDrawerProps) {
  const pathname = usePathname()
  const drawerRef = useRef<HTMLDivElement>(null)
  
  // Parallax para background decorativo
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  
  const parallaxX = useTransform(mouseX, (val) => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1920
    return ((val / width) * 12) - 6
  })
  const parallaxY = useTransform(mouseY, (val) => {
    const height = typeof window !== 'undefined' ? window.innerHeight : 1080
    return ((val / height) * 12) - 6
  })

  useEffect(() => {
    if (!isOpen) return

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [isOpen, mouseX, mouseY])

  // Fechar ao clicar no overlay
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Lock body scroll quando drawer aberto
  useEffect(() => {
    if (isOpen) {
      document.documentElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'
    } else {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Fechar com Esc
  useEffect(() => {
    if (!isOpen) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay com blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleOverlayClick}
            className="fixed inset-0 z-[50] bg-[rgba(8,10,14,0.55)] backdrop-blur-xl"
            aria-hidden="true"
            style={{
              pointerEvents: 'auto',
            }}
          />

          {/* Drawer */}
          <motion.aside
            ref={drawerRef}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{
              type: 'spring',
              stiffness: 180,
              damping: 22,
            }}
            className="fixed left-0 top-0 z-[50] h-[100dvh] w-[82vw] max-w-[360px] border-r border-white/10 bg-white/6 backdrop-blur-xl shadow-[0_0_60px_rgba(125,249,255,0.15)] overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navegação"
            style={{
              maxHeight: '100dvh',
              pointerEvents: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Gradient edge sutil */}
            <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-[#7DF9FF22] to-transparent pointer-events-none" />

            {/* Background decorativo com parallax */}
            <motion.div
              style={{ x: parallaxX, y: parallaxY }}
              className="absolute inset-0 opacity-5 pointer-events-none"
            >
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, #7DF9FF 1px, transparent 0)`,
                backgroundSize: '24px 24px',
              }} />
            </motion.div>

            {/* Conteúdo */}
            <div className="relative z-10 flex h-full flex-col">
              {/* Header com botão fechar */}
              <div className="flex items-center justify-between border-b border-white/10 p-4">
                <Link
                  href="/"
                  className="text-xl font-bold text-[#FFD369] transition-colors hover:text-[#7DF9FF]"
                  onClick={onClose}
                >
                  NoCry Offers
                </Link>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-[#FFD369] transition-colors hover:bg-white/10 hover:text-[#7DF9FF] focus:outline-none focus:ring-2 focus:ring-[#7DF9FF]/50"
                  aria-label="Fechar menu"
                >
                  <X className="h-5 w-5" />
                </motion.button>
              </div>

              {/* Navegação */}
              <nav className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {menuItems.map((item, index) => {
                    const Icon = item.icon
                    const isActive = pathname.startsWith(item.path)

                    return (
                      <motion.div
                        key={item.path}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.08 }}
                      >
                        <Link
                          href={item.path}
                          onClick={onClose}
                          className={`group relative flex items-center gap-3 rounded-lg px-4 py-3 transition-all ${
                            isActive
                              ? 'bg-white/10 text-[#FFD369] border border-transparent bg-gradient-to-r from-[#7DF9FF22] to-[#D4AF3722]'
                              : 'text-[#A1A1A8] hover:bg-white/5 hover:text-[#FFD369]'
                          }`}
                        >
                          {/* Border gradient para item ativo */}
                          {isActive && (
                            <div className="absolute inset-0 rounded-lg border border-transparent bg-gradient-to-r from-[#7DF9FF] via-[#D4AF37] to-[#7DF9FF] opacity-30 -z-10" />
                          )}

                          <Icon className="h-5 w-5 flex-shrink-0" />
                          <span className="font-medium">{item.name}</span>

                          {/* Underline animado no hover */}
                          {!isActive && (
                            <motion.div
                              className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-[#7DF9FF] to-[#D4AF37]"
                              initial={{ width: 0 }}
                              whileHover={{ width: '100%' }}
                              transition={{ duration: 0.3 }}
                            />
                          )}
                        </Link>
                      </motion.div>
                    )
                  })}
                </div>
              </nav>

              {/* Footer */}
              <div className="border-t border-white/10 p-4">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="text-center"
                >
                  <div className="text-xs text-[#A1A1A8]">NoCry // v1.0</div>
                </motion.div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

