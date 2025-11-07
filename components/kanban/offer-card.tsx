'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Offer } from '@/lib/types'
import Link from 'next/link'
import { MoreVertical, Trash2 } from 'lucide-react'
import { deleteOffer } from '@/app/(protected)/ofertas/actions'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface OfferCardProps {
  offer: Offer
}

export function OfferCard({ offer }: OfferCardProps) {
  const router = useRouter()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: offer.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties

  const handleDelete = async () => {
    setDeleting(true)
    const result = await deleteOffer(offer.id)
    setDeleting(false)
    setShowDeleteDialog(false)
    setShowMenu(false)

    if (result.ok) {
      toast.success('Oferta excluída')
      router.refresh()
    } else {
      toast.error(result.error || 'Erro ao excluir oferta')
    }
  }

  // Tint por status
  const tintByStatus: Record<string, string> = {
    'Descartada': 'before:bg-white/30',
    'Em análise': 'before:bg-yellow-300/50',
    'Modelando': 'before:bg-sky-300/50',
    'Rodando': 'before:bg-emerald-300/50',
    'Encerrada': 'before:bg-rose-300/50',
  }

  const tint = tintByStatus[offer.status] || 'before:bg-white/30'

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        className={`group relative cursor-grab rounded-2xl border border-white/20 bg-white/12 p-3 shadow-lg backdrop-blur-xl transition hover:border-white/30 hover:bg-white/[0.15] hover:shadow-[0_8px_30px_-12px_rgba(245,196,66,0.25)] active:cursor-grabbing before:absolute before:bottom-3 before:left-0 before:top-3 before:w-[3px] before:rounded-full before:content-[''] overflow-hidden ${tint} ${
          isDragging ? 'opacity-50' : ''
        }`}
        title={`${offer.country}${offer.niche ? ` · ${offer.niche}` : ''}`}
      >
        {/* Header: título + ícones */}
        <div className="flex items-start gap-2">
          {/* Conteúdo */}
          <Link href={`/ofertas/${offer.id}`} className="min-w-0 flex-1" {...listeners}>
            <h4 className="font-medium text-white/90 truncate">{offer.name}</h4>
            {/* Subtitle */}
            {(offer.country || offer.niche) && (
              <div className="text-sm text-white/55 truncate">
                {offer.country}
                {offer.niche && ` · ${offer.niche}`}
              </div>
            )}
          </Link>

          {/* Ações */}
          <div className="ml-auto flex shrink-0 items-center gap-1">
            {/* Menu context */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(!showMenu)
                }}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10"
                aria-label="Mais opções"
              >
                <MoreVertical className="h-3 w-3 text-white/70" />
              </button>
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-full z-50 mt-1 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] shadow-lg">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowDeleteDialog(true)
                        setShowMenu(false)
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-white/5"
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </button>
                  </div>
                </>
              )}
            </div>

            {offer.ad_library_url && (
              <a
                href={offer.ad_library_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10"
                aria-label="Meta"
                onClick={(e) => e.stopPropagation()}
              >
                <svg
                  className="h-3 w-3 text-white/70"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
            )}
            {offer.original_funnel_url && (
              <a
                href={offer.original_funnel_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10"
                aria-label="Funil"
                onClick={(e) => e.stopPropagation()}
              >
                <svg
                  className="h-3 w-3 text-white/70"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Dialog de confirmação */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir oferta?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--fg-dim)]">
            Essa ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
