'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

interface ChecklistItem {
  status: 'Pendente' | 'Em Progresso' | 'Concluido'
  type: 'Criativos' | 'Estrutura' | 'Configuracoes' | 'Configurações'
}

interface ProgressCardProps {
  offerId: string
}

function calculateProgress(items: ChecklistItem[]) {
  const total = items.length
  const done = items.filter((i) => i.status === 'Concluido').length
  const totalPct = total > 0 ? Math.round((done / total) * 100) : 0

  const byType = (t: 'Criativos' | 'Estrutura' | 'Configuracoes' | 'Configurações') => {
    // Aceitar ambos 'Configuracoes' e 'Configurações'
    const all = items.filter((i) => 
      i.type === t || 
      (t === 'Configuracoes' && i.type === 'Configurações') ||
      (t === 'Configurações' && i.type === 'Configuracoes')
    )
    const fin = all.filter((i) => i.status === 'Concluido')
    return all.length > 0 ? Math.round((fin.length / all.length) * 100) : 0
  }

  return {
    total: totalPct,
    criativos: byType('Criativos'),
    estrutura: byType('Estrutura'),
    configuracoes: byType('Configuracoes'),
  }
}

export function ProgressCard({ offerId }: ProgressCardProps) {
  const supabase = createClient()
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadChecklists = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .schema('offers')
          .from('offer_checklists_view')
          .select('status, type')
          .eq('offer_id', offerId)

        if (error) throw error

        setItems((data || []) as ChecklistItem[])
      } catch (err) {
        console.error('[PROGRESS_LOAD]', err)
      } finally {
        setLoading(false)
      }
    }

    loadChecklists()

    // Refetch quando houver mudanças (via polling ou realtime se configurado)
    const interval = setInterval(loadChecklists, 5000)
    return () => clearInterval(interval)
  }, [offerId])

  const progress = calculateProgress(items)

  if (loading) {
    return (
      <div className="card p-4 md:p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin muted" />
        </div>
      </div>
    )
  }

  return (
    <div className="card p-4 md:p-6">
      <h3 className="section-title mb-4">Progresso</h3>

      {/* Progresso Total */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="subtitle">Total</span>
          <span className="text-sm font-semibold">{progress.total}%</span>
        </div>
        <div className="progress progress--gold">
          <span style={{ width: `${progress.total}%` }} />
        </div>
      </div>

      {/* Progresso por Tipo */}
      <div className="space-y-4">
        {/* Criativos */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="subtitle">Criativos</span>
            <span className="text-sm font-semibold">{progress.criativos}%</span>
          </div>
          <div className="progress progress--blue">
            <span style={{ width: `${progress.criativos}%` }} />
          </div>
        </div>

        {/* Estrutura */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="subtitle">Estrutura</span>
            <span className="text-sm font-semibold">{progress.estrutura}%</span>
          </div>
          <div className="progress progress--blue">
            <span style={{ width: `${progress.estrutura}%` }} />
          </div>
        </div>

        {/* Configurações */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="subtitle">Configurações</span>
            <span className="text-sm font-semibold">{progress.configuracoes}%</span>
          </div>
          <div className="progress progress--gray">
            <span style={{ width: `${progress.configuracoes}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}

