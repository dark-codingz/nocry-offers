'use client'

import { motion } from 'framer-motion'
import { Search, Plus } from 'lucide-react'
import { useState } from 'react'

interface HeroProps {
  onCreateClick: () => void
  stats: {
    emAnalise: number
    aprovadas: number
    emProducao: number
    pausadas: number
  }
  totalAtivos: number
}

export function Hero({ onCreateClick, stats, totalAtivos }: HeroProps) {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <>
      {/* Primeira linha: Título à esquerda, badge + botão à direita */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-6">
        {/* Esquerda: Stack vertical com título e subtítulo */}
        <div className="flex-1">
          {/* Label pequena uppercase */}
          <div className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
            OFERTAS
          </div>
          {/* Título grande */}
          <h1 className="text-4xl font-semibold text-white mb-2">
            NoCry <span className="text-white/40 font-light">//</span> Ofertas
          </h1>
          {/* Descrição */}
          <p className="text-sm text-white/60">
            Minere, organize e acompanhe o fluxo das suas ofertas.
          </p>
        </div>

        {/* Direita: Badge e botão alinhados à direita */}
        <div className="flex flex-col items-end gap-3 lg:items-end">
          {/* Badge "X ativos" */}
          <div className="flex items-center gap-2 bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full px-4 py-2">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
            <span className="text-sm font-medium text-[#D4AF37]">
              {totalAtivos} ativo{totalAtivos !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Botão "Nova Oferta" */}
          <motion.button
            onClick={onCreateClick}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="rounded-full px-6 py-3 font-semibold text-black shadow-[0_8px_24px_-8px_rgba(212,175,55,0.4)] transition-all"
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

      {/* Linha da busca: ocupando largura total */}
      <div className="mb-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar ofertas… (⌘K)"
            className="w-full rounded-full bg-black/30 border border-white/5 pl-11 pr-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 focus:border-[#D4AF37]/30 transition-all"
          />
        </div>
      </div>

      {/* Linha de resumo de contagens: texto simples */}
      <div className="text-xs text-white/40 mb-4">
        Em análise: {stats.emAnalise} · Aprovadas: {stats.aprovadas} · Em produção: {stats.emProducao} · Pausadas: {stats.pausadas}
      </div>
    </>
  )
}
