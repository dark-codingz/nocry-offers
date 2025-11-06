'use client'

import { useDroppable } from '@dnd-kit/core'
import type { OfferStatus } from '@/lib/types'

interface DroppableColumnProps {
  id: OfferStatus
  children: React.ReactNode
}

export function DroppableColumn({ id, children }: DroppableColumnProps) {
  const { setNodeRef } = useDroppable({
    id,
    data: { type: 'column', colId: id },
  })

  return <div ref={setNodeRef}>{children}</div>
}



