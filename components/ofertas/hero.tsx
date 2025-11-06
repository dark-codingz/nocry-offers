'use client'

import { motion, useSpring, useMotionValue, useTransform } from 'framer-motion'
import { Search, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { countUp } from '@/lib/gsap'

interface StatCardProps {
  label: string
  value: number
  delay?: number
}

function StatCard({ label, value, delay = 0 }: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const spring = useSpring(0, { stiffness: 100, damping: 20 })
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      spring.set(value)
    }, delay * 100)

    spring.on('change', (latest) => {
      setDisplayValue(Math.round(latest))
    })

    return () => {
      clearTimeout(timer)
      spring.destroy()
    }
  }, [value, delay, spring])

  return (
    <motion.div
      ref={elementRef}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
      className="nc-glass nc-card group relative rounded-2xl p-4"
      whileHover={{ y: -2 }}
    >
      <div className="text-xs font-medium text-[var(--nc-fg-dim)] mb-1">{label}</div>
      <div className="text-2xl font-bold text-[var(--nc-fg)]">{displayValue}</div>
      <motion.div
        className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-[var(--nc-cyan)] to-[var(--nc-gold)]"
        initial={{ width: 0 }}
        whileHover={{ width: '100%' }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  )
}

interface HeroProps {
  onCreateClick: () => void
  stats: {
    emAnalise: number
    aprovadas: number
    emProducao: number
    pausadas: number
  }
}

export function Hero({ onCreateClick, stats }: HeroProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const parallaxX = useTransform(mouseX, (val) => (val / (typeof window !== 'undefined' ? window.innerWidth : 1920)) * 10)
  const parallaxY = useTransform(mouseY, (val) => (val / (typeof window !== 'undefined' ? window.innerHeight : 1080)) * 10)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mouseX, mouseY])

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative mb-8 overflow-hidden rounded-3xl nc-glass p-8 w-full max-w-full"
      onMouseMove={(e) => {
        mouseX.set(e.clientX)
        mouseY.set(e.clientY)
      }}
    >
      {/* Background decorativo com parallax */}
      <motion.div
        style={{ 
          x: parallaxX, 
          y: parallaxY,
          maxWidth: '100%',
          maxHeight: '100%',
        }}
        className="absolute inset-0 opacity-5 pointer-events-none overflow-hidden"
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, var(--nc-cyan) 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />
      </motion.div>

      <div className="relative z-10">
        {/* Título e subtítulo */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="nc-title text-4xl font-bold text-[var(--nc-fg)]">
              NoCry // Ofertas
            </h1>
            <span className="nc-glass rounded-full px-3 py-1 text-sm font-medium text-[var(--nc-gold)]">
              {stats.emAnalise + stats.aprovadas + stats.emProducao + stats.pausadas} ativo(s)
            </span>
          </div>
          <p className="text-[var(--nc-fg-dim)] text-sm">
            Minere, modele e gerencie suas ofertas vencedoras.
          </p>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Em análise" value={stats.emAnalise} delay={0.1} />
          <StatCard label="Aprovadas" value={stats.aprovadas} delay={0.2} />
          <StatCard label="Em produção" value={stats.emProducao} delay={0.3} />
          <StatCard label="Pausadas" value={stats.pausadas} delay={0.4} />
        </div>

        {/* Busca + CTA */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--nc-fg-dim)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar ofertas... (⌘K)"
              className="nc-glass nc-focus-ring w-full rounded-2xl border border-white/10 bg-white/5 pl-11 pr-4 py-3 text-[var(--nc-fg)] placeholder:text-[var(--nc-fg-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--nc-cyan)]/50"
            />
          </div>
          <motion.button
            onClick={onCreateClick}
            whileHover={{ scale: 1.02, filter: 'brightness(1.01)' }}
            whileTap={{ scale: 0.98 }}
            className="nc-focus-ring rounded-2xl px-6 py-3 font-semibold text-[#101216] shadow-[0_14px_34px_-16px_rgba(212,175,55,0.55)] transition-all"
            style={{
              background: 'linear-gradient(90deg, #FFD36A 0%, #D4AF37 100%)',
            }}
          >
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>Nova Oferta</span>
            </div>
          </motion.button>
        </div>
      </div>
    </motion.section>
  )
}

