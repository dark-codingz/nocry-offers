'use client'

import { useState, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { KanbanColumn } from './kanban-column'
import { DroppableColumn } from './droppable-column'
import { OfferCard } from './offer-card'
import type { Offer, OfferStatus } from '@/lib/types'
import { useOffers } from '@/hooks/use-offers'
import { useToast } from '@/hooks/use-toast'
import { KanbanSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'

const STATUSES: OfferStatus[] = [
  'Descartada',
  'Em análise',
  'Modelando',
  'Rodando',
  'Encerrada',
]

type BoardState = Record<OfferStatus, {
  id: OfferStatus
  title: string
  items: Offer[]
}>

interface KanbanBoardProps {
  initialOffers?: Offer[]
  onCreateClick?: () => void
}

export function KanbanBoard({ initialOffers = [], onCreateClick }: KanbanBoardProps) {
  const { offers, loading, error, updateOfferStatus } = useOffers()
  const { showToast } = useToast()
  const [activeOffer, setActiveOffer] = useState<Offer | null>(null)
  const [board, setBoard] = useState<BoardState>(() => {
    const initial: BoardState = {
      'Descartada': { id: 'Descartada', title: 'Descartada', items: [] },
      'Em análise': { id: 'Em análise', title: 'Em análise', items: [] },
      'Modelando': { id: 'Modelando', title: 'Modelando', items: [] },
      'Rodando': { id: 'Rodando', title: 'Rodando', items: [] },
      'Encerrada': { id: 'Encerrada', title: 'Encerrada', items: [] },
    }
    
    initialOffers.forEach(offer => {
      if (initial[offer.status]) {
        initial[offer.status].items.push(offer)
      }
    })
    
    return initial
  })

  useEffect(() => {
    if (offers.length > 0) {
      const newBoard: BoardState = {
        'Descartada': { id: 'Descartada', title: 'Descartada', items: [] },
        'Em análise': { id: 'Em análise', title: 'Em análise', items: [] },
        'Modelando': { id: 'Modelando', title: 'Modelando', items: [] },
        'Rodando': { id: 'Rodando', title: 'Rodando', items: [] },
        'Encerrada': { id: 'Encerrada', title: 'Encerrada', items: [] },
      }
      
      offers.forEach(offer => {
        if (newBoard[offer.status]) {
          newBoard[offer.status].items.push(offer)
        }
      })
      
      setBoard(newBoard)
    }
  }, [offers])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const activeId = String(active.id)
    
    // Encontrar o offer ativo
    for (const col of Object.values(board)) {
      const offer = col.items.find(o => o.id === activeId)
      if (offer) {
        setActiveOffer(offer)
        break
      }
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveOffer(null)

    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    // Coluna de origem
    const fromCol = (Object.keys(board) as OfferStatus[]).find(k =>
      board[k].items.some(i => i.id === activeId)
    )
    if (!fromCol) return

    // Destino: se soltou na coluna, vai para essa coluna; se soltou em card, destino é a coluna desse card
    const overIsColumn = (over.data?.current as any)?.type === 'column'
    const toCol = overIsColumn
      ? (over.data?.current as any)?.colId as OfferStatus
      : (Object.keys(board) as OfferStatus[]).find(k => board[k].items.some(i => i.id === overId)) ?? fromCol

    if (!toCol) return
    if (fromCol === toCol && activeId === overId) return

    // Remover do array origem
    const fromItems = [...board[fromCol].items]
    const movingIndex = fromItems.findIndex(i => i.id === activeId)
    if (movingIndex < 0) return
    const moving = fromItems[movingIndex]
    if (!moving) return
    fromItems.splice(movingIndex, 1)

    // Inserir no destino na posição correta
    const toItems = [...board[toCol].items]
    let insertIndex = toItems.length

    if (!overIsColumn) {
      const overIndex = toItems.findIndex(i => i.id === overId)
      insertIndex = overIndex < 0 ? toItems.length : overIndex
    }
    toItems.splice(insertIndex, 0, { ...moving, status: toCol })

    // Commit otimista
    setBoard(prev => ({
      ...prev,
      [fromCol]: { ...prev[fromCol], items: fromItems },
      [toCol]: { ...prev[toCol], items: toItems },
    }))

    // Persistência
    const result = await updateOfferStatus(moving.id, toCol)
    
    if (result.success) {
      showToast('Status atualizado com sucesso', 'success')
    } else {
      showToast(result.error || 'Falha ao atualizar status', 'error')
      // Rollback
      setBoard(prev => ({
        ...prev,
        [fromCol]: { ...prev[fromCol], items: [...fromItems, moving] },
        [toCol]: { ...prev[toCol], items: toItems.filter(i => i.id !== moving.id) },
      }))
    }
  }

  if (loading) {
    return <KanbanSkeleton />
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-center">
        <p className="text-sm text-destructive-foreground">{error}</p>
      </div>
    )
  }

  const totalOffers = Object.values(board).reduce((sum, col) => sum + col.items.length, 0)

  if (totalOffers === 0) {
    return (
      <EmptyState
        title="Nenhuma oferta ainda"
        description="Comece criando sua primeira oferta para acompanhar no Kanban"
        action={{ 
          label: 'Nova Oferta', 
          href: onCreateClick ? '#' : '/ofertas/new',
          ...(onCreateClick ? { onClick: onCreateClick } : {}),
        }}
      />
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Grid full-width sem scrollbar */}
      <div className="no-scrollbar grid grid-cols-1 gap-5 md:grid-cols-3 lg:grid-cols-5 w-full max-w-full">
        {Object.values(board).map((col) => (
          <DroppableColumn key={col.id} id={col.id}>
            <SortableContext items={col.items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <KanbanColumn status={col.id} offers={col.items} />
            </SortableContext>
          </DroppableColumn>
        ))}
      </div>
      <DragOverlay>{activeOffer ? <OfferCard offer={activeOffer} /> : null}</DragOverlay>
    </DndContext>
  )
}
