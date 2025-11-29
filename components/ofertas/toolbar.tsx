'use client'

import { motion } from 'framer-motion'
import { Filter, X } from 'lucide-react'
import { useState } from 'react'

type FilterType = 'country' | 'niche' | 'status'

interface ToolbarProps {
  onFilterChange?: (filters: { country?: string; niche?: string; status?: string }) => void
  resultCount: number
}

export function Toolbar({ onFilterChange, resultCount }: ToolbarProps) {
  const [selectedFilters, setSelectedFilters] = useState<{
    country?: string
    niche?: string
    status?: string
  }>({})

  const countries = ['Brasil', 'EUA', 'México', 'Argentina']
  const statuses = ['Em análise', 'Modelando', 'Rodando', 'Encerrada']

  const handleFilterToggle = (type: FilterType, value: string) => {
    const newFilters = { ...selectedFilters }
    if (newFilters[type] === value) {
      delete newFilters[type]
    } else {
      newFilters[type] = value
    }
    setSelectedFilters(newFilters)
    onFilterChange?.(newFilters)
  }

  const clearFilters = () => {
    setSelectedFilters({})
    onFilterChange?.({})
  }

  const hasFilters = Object.keys(selectedFilters).length > 0

  return (
    <div className="mb-6">
      {/* Label pequena */}
      <div className="flex items-center gap-3 mb-3">
        <Filter className="h-3.5 w-3.5 text-white/40" />
        <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
          Filtros
        </span>
      </div>

      {/* Chips/pills de filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Países */}
        {countries.map((country) => {
          const isActive = selectedFilters.country === country
          return (
            <motion.button
              key={country}
              onClick={() => handleFilterToggle('country', country)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37]'
                  : 'bg-transparent border border-white/10 text-white/60 hover:border-white/20 hover:text-white/80'
              }`}
            >
              {country}
            </motion.button>
          )
        })}

        {/* Status */}
        {statuses.map((status) => {
          const isActive = selectedFilters.status === status
          return (
            <motion.button
              key={status}
              onClick={() => handleFilterToggle('status', status)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37]'
                  : 'bg-transparent border border-white/10 text-white/60 hover:border-white/20 hover:text-white/80'
              }`}
            >
              {status}
            </motion.button>
          )
        })}

        {/* Contador e limpar à direita */}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-white/50">
            {resultCount} resultado{resultCount !== 1 ? 's' : ''}
          </span>
          {hasFilters && (
            <motion.button
              onClick={clearFilters}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white/80 hover:bg-white/5 transition-all"
            >
              <X className="h-3 w-3" />
              Limpar
            </motion.button>
          )}
        </div>
      </div>
    </div>
  )
}
