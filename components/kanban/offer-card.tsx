'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Offer, OfferStatus } from '@/lib/types'
import { MoreVertical, Trash2, Clock, Flag, Bookmark } from 'lucide-react'
import { deleteOffer } from '@/app/(protected)/ofertas/actions'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface OfferCardProps {
  offer: Offer
}

const getProgressData = (status: OfferStatus) => {
  switch(status) {
    case 'Modelando': return { show: true, percent: '35%', color: 'bg-white' }
    case 'Rodando': return { show: true, percent: '80%', color: 'bg-white' }
    case 'Encerrada': return { show: true, percent: '100%', color: 'bg-[#22C55E]' }
    case 'Descartada': return { show: false, percent: '0%', color: 'bg-transparent' }
    case 'Em análise': return { show: false, percent: '0%', color: 'bg-transparent' }
    default: return { show: false, percent: '0%', color: 'bg-transparent' }
  }
}

export function OfferCard({ offer }: OfferCardProps) {
  const router = useRouter()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: offer.id,
  })

  // Garantir que drag interaja apenas na div e não nos botões filhos evitando conflitos
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'all 0.2s ease',
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

  const progress = getProgressData(offer.status)
  
  // Format data se existir (Mock do "Due" com data de criação)
  let dateText = 'Oct 2, 2025'
  if (offer.created_at) {
    try {
      const date = new Date(offer.created_at)
      dateText = new Intl.DateTimeFormat('en-US', { 
        month: 'short', day: 'numeric', year: 'numeric' 
      }).format(date)
    } catch(e) {}
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        onClick={() => router.push(`/ofertas/${offer.id}`)}
        className={`group relative flex flex-col gap-3 rounded-[12px] bg-[#222222] p-[16px] transition-all w-full cursor-pointer duration-200 ease-out border border-transparent hover:scale-[1.01] hover:bg-[#2A2A2A] shadow-sm ${
          isDragging ? 'opacity-90 scale-105 border-[#2A2A2A] shadow-2xl z-50' : ''
        }`}
      >
        <div {...listeners} className="cursor-grab active:cursor-grabbing pb-0">
          {/* 1. Data Superior */}
          <div className="flex items-center gap-[4px] text-[10px] text-[#A1A1AA] mb-4 font-medium uppercase tracking-wider">
            <Clock className="w-3 h-3 text-[#A1A1AA]" />
            Due: {dateText}
          </div>

          {/* 2. Título principal com Bookmark/Bandeira vermelha ao lado */}
          <div className="flex items-start gap-2 mb-1">
            <Bookmark className="w-[14px] h-[14px] text-red-500 fill-red-500 mt-[2px] shrink-0" />
            <h4 className="font-semibold text-white text-[14px] leading-snug tracking-wide group-hover:text-gray-200 transition-colors duration-200">
              {offer.name || "Draft Client Proposal"}
            </h4>
          </div>

          {/* 3. Subtítulo (Nicho e País simulando projeto) */}
          {(offer.country || offer.niche) ? (
            <div className="text-[12px] text-[#A1A1AA] line-clamp-1 ml-[22px]">
              {offer.country}
              {offer.niche && ` · ${offer.niche}`}
            </div>
          ) : (
            <div className="text-[12px] text-[#A1A1AA] line-clamp-1 ml-[22px]">
              Orion Mobile App
            </div>
          )}
        </div>

        {/* 4. Barra de progresso Lógica Condicional */}
        {progress.show && (
          <div className="mt-3 flex flex-col gap-1 w-full pl-0">
            <div className="flex items-center justify-between text-[10px] text-[#A1A1AA] font-medium tracking-wide">
              <span>Progress</span>
              <span>{progress.percent}</span>
            </div>
            <div className="h-[4px] w-full rounded-full bg-[#171717] overflow-hidden mt-0.5">
              <div 
                className={`h-full rounded-full transition-all duration-500 ease-out ${progress.color}`} 
                style={{ width: progress.percent }}
              />
            </div>
          </div>
        )}

        {/* 5. Footer do card (Avatar Oposto aos icones velhos) */}
        <div className={`flex items-center justify-between pt-1 border-t border-[#333333] ${progress.show ? 'mt-3' : 'mt-5'}`}>
          
          {/* Avatar à esquerda */}
          <div className="flex items-center gap-1.5 pt-2">
            <div className="h-[22px] w-[22px] rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shrink-0 border border-black group-hover:border-[#262626] transition-all">
              <span className="text-[8px] font-bold text-white">DM</span>
            </div>
          </div>

          {/* Ícones antigos à direita */}
          <div className="flex items-center gap-1 pt-2">
            {offer.ad_library_url && (
              <a
                href={offer.ad_library_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] hover:bg-[#333333] text-[#A1A1AA] hover:text-white transition-all duration-200"
                aria-label="Meta"
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="h-[13px] w-[13px]" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
            )}
            {offer.original_funnel_url && (
              <a
                href={offer.original_funnel_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] hover:bg-[#333333] text-[#A1A1AA] hover:text-white transition-all duration-200"
                aria-label="Funil"
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="h-[13px] w-[13px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(!showMenu)
                }}
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] hover:bg-[#333333] text-[#A1A1AA] hover:text-white transition-all duration-200"
                aria-label="Mais opções"
              >
                <MoreVertical className="h-[14px] w-[14px]" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setShowMenu(false) }} />
                  <div className="absolute right-0 top-full z-50 mt-1 rounded-lg border border-[#2A2A2A] bg-[#202020] shadow-xl overflow-hidden min-w-[120px]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowDeleteDialog(true)
                        setShowMenu(false)
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-[12px] font-medium text-red-400 hover:bg-white/5 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                      Excluir
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-[#202020] border-[#2A2A2A] text-white">
          <DialogHeader>
            <DialogTitle>Excluir oferta?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#A1A1AA]">
            Essa ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
              className="text-white hover:bg-white/5"
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
