'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'
import { toast } from 'sonner'

interface ChecklistItem {
  id: string
  offer_id: string
  name: string
  description?: string | null
  status: 'Pendente' | 'Em Progresso' | 'Concluido'
  type: 'Criativos' | 'Estrutura' | 'Configuracoes' | 'Configurações'
}

interface ChecklistModalProps {
  mode: 'create' | 'edit'
  offerId: string
  initialData?: ChecklistItem
  onClose: () => void
  onSaved: () => void
}

export function ChecklistModal({
  mode,
  offerId,
  initialData,
  onClose,
  onSaved,
}: ChecklistModalProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    status: initialData?.status || ('Pendente' as const),
    type: initialData?.type === 'Configuracoes' ? 'Configurações' : (initialData?.type || 'Criativos'),
  })

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name,
        description: initialData.description || '',
        status: initialData.status,
        type: initialData.type === 'Configuracoes' ? 'Configurações' : initialData.type,
      })
    }
  }, [initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.name.trim()) {
      toast.error('Nome da tarefa é obrigatório')
      return
    }

    try {
      setLoading(true)

      // Mapear UI → DB: Configurações → Configuracoes
      const dbType = form.type === 'Configurações' ? 'Configuracoes' : form.type

      if (mode === 'create') {
        const payload = {
          offer_id: offerId,
          name: form.name.trim(),
          description: form.description?.trim() || null,
          status: form.status,
          type: dbType,
        }

        const { error } = await supabase
          .schema('offers')
          .from('offer_checklists')
          .insert(payload)

        if (error) throw error

        toast.success('Tarefa criada com sucesso')
      } else {
        const payload = {
          name: form.name.trim(),
          description: form.description?.trim() || null,
          status: form.status,
          type: dbType,
        }

        const { error } = await supabase
          .schema('offers')
          .from('offer_checklists')
          .update(payload)
          .eq('id', initialData!.id)

        if (error) throw error

        toast.success('Tarefa atualizada com sucesso')
      }

      onSaved()
    } catch (err) {
      console.error('[CHECKLIST_SAVE]', err)
      toast.error('Erro ao salvar tarefa')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="modal w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between border-b sep p-4">
          <h2 className="section-title">{mode === 'create' ? 'Nova Tarefa' : 'Editar Tarefa'}</h2>
          <button
            onClick={onClose}
            className="btn btn-ghost p-1"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4">
          <div className="space-y-4">
            {/* Nome */}
            <div>
              <label className="subtitle mb-1 block">
                Nome <span className="text-[var(--danger)]">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input w-full"
                placeholder="Ex: Criar thumbnails para vídeos"
                required
                disabled={loading}
              />
            </div>

            {/* Descrição */}
            <div>
              <label className="subtitle mb-1 block">Descrição</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="textarea w-full"
                placeholder="Detalhes adicionais..."
                rows={3}
                disabled={loading}
              />
            </div>

            {/* Status */}
            <div>
              <label className="subtitle mb-1 block">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                className="select w-full"
                disabled={loading}
              >
                <option value="Pendente">Pendente</option>
                <option value="Em Progresso">Em Progresso</option>
                <option value="Concluido">Concluído</option>
              </select>
            </div>

            {/* Tipo */}
            <div>
              <label className="subtitle mb-1 block">Tipo</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as 'Criativos' | 'Estrutura' | 'Configurações' })}
                className="select w-full"
                disabled={loading}
              >
                <option value="Criativos">Criativos</option>
                <option value="Estrutura">Estrutura</option>
                <option value="Configurações">Configurações</option>
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn btn-ghost" disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

