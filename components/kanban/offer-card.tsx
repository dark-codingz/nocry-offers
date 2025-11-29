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

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        className={`group relative rounded-2xl border border-white/5 bg-black/30 p-4 transition-all hover:border-white/10 hover:bg-black/50 hover:shadow-lg hover:scale-[1.01] ${
          isDragging ? 'opacity-70 scale-105 border-[#D4AF37]/40 shadow-[0_8px_32px_rgba(212,175,55,0.3)] bg-black/60' : ''
        }`}
      >
        {/* Área draggable - listeners aplicados na área principal */}
        <div {...listeners} className="cursor-grab active:cursor-grabbing">
          {/* Linha 1: Apenas o nome da oferta (pode ocupar 1-2 linhas) */}
          <div className="mb-2">
            <Link href={`/ofertas/${offer.id}`} onClick={(e) => e.stopPropagation()} className="block">
              <h4 className="font-medium text-white text-sm line-clamp-2 leading-snug">{offer.name}</h4>
            </Link>
          </div>

          {/* Linha 2: País · Nicho */}
          {(offer.country || offer.niche) && (
            <div className="text-xs text-white/50 mb-3 line-clamp-1">
              {offer.country}
              {offer.niche && ` · ${offer.niche}`}
            </div>
          )}
        </div>

        {/* Ícones de ação - pequenos e discretos */}
        <div className="flex items-center justify-end gap-1 mt-3">
          {/* Menu context */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-black/40 border border-white/5 text-white/50 hover:text-white/70 hover:bg-white/5 transition-all"
              aria-label="Mais opções"
            >
              <MoreVertical className="h-3 w-3" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full z-50 mt-1 rounded-lg border border-white/10 bg-[#050508] shadow-lg">
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

          {/* Links externos */}
          {offer.ad_library_url && (
            <a
              href={offer.ad_library_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-black/40 border border-white/5 text-white/50 hover:text-white/70 hover:bg-white/5 transition-all"
              aria-label="Meta"
              onClick={(e) => e.stopPropagation()}
            >
              <svg
                className="h-3 w-3"
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
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-black/40 border border-white/5 text-white/50 hover:text-white/70 hover:bg-white/5 transition-all"
              aria-label="Funil"
              onClick={(e) => e.stopPropagation()}
            >
              <svg
                className="h-3 w-3"
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

      {/* Dialog de confirmação */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir oferta?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/60">
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
