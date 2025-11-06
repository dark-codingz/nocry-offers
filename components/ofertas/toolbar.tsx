'use client'

import { motion } from 'framer-motion'
import { Filter, X, LayoutGrid, List } from 'lucide-react'
import { useState } from 'react'

type FilterType = 'country' | 'niche' | 'status'
type ViewType = 'kanban' | 'list'

interface ToolbarProps {
  onFilterChange?: (filters: { country?: string; niche?: string; status?: string }) => void
  onViewChange?: (view: ViewType) => void
  resultCount: number
}

export function Toolbar({ onFilterChange, onViewChange, resultCount }: ToolbarProps) {
  const [selectedFilters, setSelectedFilters] = useState<{
    country?: string
    niche?: string
    status?: string
  }>({})
  const [view, setView] = useState<ViewType>('kanban')

  const countries = ['Brasil', 'EUA', 'México', 'Argentina']
  const niches = ['Saúde', 'Finanças', 'E-commerce', 'Educação']
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

  const handleViewToggle = (newView: ViewType) => {
    setView(newView)
    onViewChange?.(newView)
  }

  const clearFilters = () => {
    setSelectedFilters({})
    onFilterChange?.({})
  }

  const hasFilters = Object.keys(selectedFilters).length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      className="nc-glass mb-6 rounded-2xl p-4"
    >
      <div className="flex flex-wrap items-center gap-4">
        {/* Filtros */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-[var(--nc-fg-dim)]" />
          <span className="text-sm text-[var(--nc-fg-dim)]">Filtros:</span>

          {/* País */}
          <div className="flex gap-2 flex-wrap">
            {countries.map((country, idx) => (
              <motion.button
                key={country}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => handleFilterToggle('country', country)}
                className={`nc-focus-ring rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  selectedFilters.country === country
                    ? 'bg-gradient-to-r from-[var(--nc-cyan)]/20 to-[var(--nc-gold)]/20 border border-[var(--nc-cyan)]/50 text-[var(--nc-fg)]'
                    : 'nc-glass text-[var(--nc-fg-dim)] hover:text-[var(--nc-fg)] hover:bg-white/10'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {country}
              </motion.button>
            ))}
          </div>

          {/* Status */}
          <div className="flex gap-2 flex-wrap">
            {statuses.map((status, idx) => (
              <motion.button
                key={status}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: (countries.length + idx) * 0.03 }}
                onClick={() => handleFilterToggle('status', status)}
                className={`nc-focus-ring rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  selectedFilters.status === status
                    ? 'bg-gradient-to-r from-[var(--nc-cyan)]/20 to-[var(--nc-gold)]/20 border border-[var(--nc-cyan)]/50 text-[var(--nc-fg)]'
                    : 'nc-glass text-[var(--nc-fg-dim)] hover:text-[var(--nc-fg)] hover:bg-white/10'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {status}
              </motion.button>
            ))}
          </div>
        </div>

        {/* View Switch */}
        <div className="ml-auto flex items-center gap-2">
          <motion.button
            onClick={() => handleViewToggle('kanban')}
            className={`nc-focus-ring p-2 rounded-lg transition-colors ${
              view === 'kanban'
                ? 'bg-white/10 text-[var(--nc-gold)]'
                : 'text-[var(--nc-fg-dim)] hover:text-[var(--nc-fg)] hover:bg-white/5'
            }`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Visualização Kanban"
          >
            <LayoutGrid className="h-4 w-4" />
          </motion.button>
          <motion.button
            onClick={() => handleViewToggle('list')}
            className={`nc-focus-ring p-2 rounded-lg transition-colors ${
              view === 'list'
                ? 'bg-white/10 text-[var(--nc-gold)]'
                : 'text-[var(--nc-fg-dim)] hover:text-[var(--nc-fg)] hover:bg-white/5'
            }`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Visualização Lista"
          >
            <List className="h-4 w-4" />
          </motion.button>
        </div>

        {/* Contador e Clear */}
        <div className="flex items-center gap-2">
          <span className="nc-glass rounded-full px-3 py-1 text-xs font-medium text-[var(--nc-fg-dim)]">
            {resultCount} resultado{resultCount !== 1 ? 's' : ''}
          </span>
          {hasFilters && (
            <motion.button
              onClick={clearFilters}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="nc-focus-ring flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-[var(--nc-fg-dim)] hover:text-[var(--nc-fg)] hover:bg-white/10 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <X className="h-3 w-3" />
              Limpar
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

