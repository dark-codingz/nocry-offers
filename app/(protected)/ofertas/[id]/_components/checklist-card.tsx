'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChecklistModal } from './checklist-modal'
import { toast } from 'sonner'
import { MoreVertical, CheckCircle2, Circle, Loader2 } from 'lucide-react'

interface ChecklistItem {
  id: string
  offer_id: string
  name: string
  description?: string | null
  status: 'Pendente' | 'Em Progresso' | 'Concluido'
  type: 'Criativos' | 'Estrutura' | 'Configuracoes' | 'Configurações'
  created_at: string
  updated_at: string
  author?: string | null
  status_sort: number
}

interface ChecklistCardProps {
  offerId: string
}

export function ChecklistCard({ offerId }: ChecklistCardProps) {
  const supabase = createClient()
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null)
  const [deleteMenuOpen, setDeleteMenuOpen] = useState<string | null>(null)

  const loadChecklists = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .schema('offers')
        .from('offer_checklists_view')
        .select('*')
        .eq('offer_id', offerId)
        .order('status_sort', { ascending: true })
        .order('updated_at', { ascending: false })

      if (error) throw error

      // Mapear Configuracoes → Configurações para exibição
      const mapped = (data || []).map((item) => ({
        ...item,
        type: item.type === 'Configuracoes' ? 'Configurações' : item.type,
      })) as ChecklistItem[]

      setItems(mapped)
    } catch (err) {
      console.error('[CHECKLIST_LOAD]', err)
      toast.error('Erro ao carregar checklist')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadChecklists()
  }, [offerId])

  const handleCreate = () => {
    setEditingItem(null)
    setModalOpen(true)
  }

  const handleEdit = (item: ChecklistItem) => {
    // Reverter mapeamento para salvar: Configurações → Configuracoes
    setEditingItem({
      ...item,
      type: item.type === 'Configurações' ? 'Configuracoes' : item.type,
    } as ChecklistItem)
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta tarefa?')) return

    try {
      const { error } = await supabase
        .schema('offers')
        .from('offer_checklists')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Tarefa excluída')
      loadChecklists()
    } catch (err) {
      console.error('[CHECKLIST_DELETE]', err)
      toast.error('Erro ao excluir tarefa')
    } finally {
      setDeleteMenuOpen(null)
    }
  }

  const handleModalSaved = () => {
    setModalOpen(false)
    setEditingItem(null)
    loadChecklists()
  }

  const truncateText = (text?: string | null, max = 120) => {
    if (!text) return ''
    if (text.length <= max) return text
    return text.slice(0, max).trimEnd() + '…'
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      Pendente: 'badge badge--warn',
      'Em Progresso': 'badge badge--ok',
      Concluido: 'badge badge--ok',
    }
    return styles[status as keyof typeof styles] || styles.Pendente
  }

  return (
    <div className="p-0 bg-transparent shadow-none">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="section-title">Tarefas / Checklist</h3>
        <button onClick={handleCreate} className="btn btn-primary">
          + Nova Tarefa
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin muted" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center">
          <p className="muted text-sm">Nenhuma tarefa cadastrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="card card--hover group grid grid-cols-[auto_1fr_auto] items-center gap-3 p-3 cursor-pointer"
              onClick={() => handleEdit(item)}
            >
              {/* Checkbox/Status Icon */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleEdit(item)
                }}
                className="shrink-0"
                aria-label="Editar tarefa"
              >
                {item.status === 'Concluido' ? (
                  <CheckCircle2 className="h-5 w-5" style={{ color: 'var(--success)' }} />
                ) : (
                  <Circle className="h-5 w-5 muted" />
                )}
              </button>

              {/* Conteúdo */}
              <div className="min-w-0 flex-1 cursor-pointer">
                <h4 className={`mb-1 font-medium ${item.status === 'Concluido' ? 'muted line-through' : ''}`}>
                  {item.name}
                </h4>
                {item.description && (
                  <p className="line-clamp-2 mb-2 muted text-sm">
                    {item.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={getStatusBadge(item.status)}>{item.status}</span>
                  <span className="badge">{item.type}</span>
                  {item.author && <span className="muted text-xs">por {item.author}</span>}
                  <span className="muted text-xs">
                    {new Date(item.updated_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Menu 3 pontinhos */}
              <div className="relative shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteMenuOpen(deleteMenuOpen === item.id ? null : item.id)
                  }}
                  className="rounded p-1 muted opacity-0 transition hover:bg-[var(--bg-hover)] group-hover:opacity-100"
                  aria-label="Mais opções"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {deleteMenuOpen === item.id && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setDeleteMenuOpen(null)}
                    />
                    <div className="modal absolute right-0 top-8 z-20 p-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(item.id)
                        }}
                        className="btn btn-danger w-full text-left text-sm"
                      >
                        Excluir
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <ChecklistModal
          mode={editingItem ? 'edit' : 'create'}
          offerId={offerId}
          initialData={editingItem || undefined}
          onClose={() => {
            setModalOpen(false)
            setEditingItem(null)
          }}
          onSaved={handleModalSaved}
        />
      )}
    </div>
  )
}

