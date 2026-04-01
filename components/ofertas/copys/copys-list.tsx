'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CopyType, CopyStatus, useCopies } from '@/hooks/use-copies'
import { FileText, MoreHorizontal, Plus, PenSquare, Copy, Trash2, Clock } from 'lucide-react'
import { CreateCopyDialog } from './create-copy-dialog'

function StatusBadge({ status }: { status: CopyStatus }) {
  const getStyle = () => {
    switch (status) {
      case 'Ideia': return 'border-[#A1A1AA]/30 text-[#A1A1AA] bg-[#A1A1AA]/10'
      case 'Em escrita': return 'border-amber-500/30 text-amber-500 bg-amber-500/10'
      case 'Pronto': return 'border-blue-500/30 text-blue-500 bg-blue-500/10'
      case 'Validado': return 'border-green-500/30 text-green-500 bg-green-500/10'
      default: return 'border-[#A1A1AA]/30 text-[#A1A1AA] bg-[#A1A1AA]/10'
    }
  }

  const getEmoji = () => {
    switch (status) {
      case 'Ideia': return '🧠'
      case 'Em escrita': return '✍️'
      case 'Pronto': return '🔥'
      case 'Validado': return '💸'
    }
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${getStyle()}`}>
      {getEmoji()} {status}
    </span>
  )
}

function timeAgo(dateString: string) {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const diffMins = Math.round(diffMs / 60000)
  if (diffMins < 60) return `Editado há ${diffMins} min`
  const diffHours = Math.round(diffMins / 60)
  if (diffHours < 24) return `Editado há ${diffHours}h`
  return `Editado há ${Math.round(diffHours / 24)} dias`
}

function ActionMenu({ onDuplicate, onDelete }: { onDuplicate: () => void, onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  
  return (
    <div className="relative">
      <button 
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className="p-2 text-[#71717A] hover:text-white rounded-md hover:bg-[#2A2A2A] transition-colors focus:outline-none"
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>

      {/* Backdrop invisível para fechar ao clicar fora */}
      {open && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={(e) => { e.stopPropagation(); setOpen(false) }} 
        />
      )}

      {open && (
        <motion.div 
          initial={{ opacity: 0, y: -5, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="absolute right-0 mt-2 w-[180px] bg-[#202020] border border-[#2A2A2A] text-white shadow-2xl overflow-hidden rounded-xl z-50 flex flex-col"
        >
          <button 
            onClick={(e) => { e.stopPropagation(); setOpen(false); onDuplicate() }} 
            className="flex items-center text-left gap-2 py-3 px-3 hover:bg-[#2A2A2A] border-b border-[#2A2A2A]/50 text-[13px] font-medium transition-colors"
          >
            <Copy className="w-4 h-4 text-[#A1A1AA]" /> Duplicar
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete() }} 
            className="flex items-center text-left gap-2 py-3 px-3 text-red-500 hover:bg-red-500/10 hover:text-red-500 text-[13px] font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Excluir
          </button>
        </motion.div>
      )}
    </div>
  )
}

export function CopysList({ offerId }: { offerId: string }) {
  const router = useRouter()
  const { copies, loading, createCopy, deleteCopy, duplicateCopy, updateCopy } = useCopies(offerId)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const handleCreate = async (data: { name: string; type: CopyType }) => {
    const copy = await createCopy(data)
    router.push(`/ofertas/${offerId}/copys/${copy.id}`)
  }

  if (loading) {
    return <div className="text-[#A1A1AA] text-sm animate-pulse p-4">Carregando copys...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white tracking-tight">Copys</h2>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#c9a02a] text-black px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-[0_0_15px_rgba(212,175,55,0.1)] hover:shadow-[0_0_20px_rgba(212,175,55,0.2)]"
        >
          <Plus className="w-4 h-4" strokeWidth={3} />
          Nova Copy
        </button>
      </div>

      <div className="space-y-3">
        {copies.length === 0 ? (
          <div className="text-center py-16 px-4 bg-[#202020] border border-[#2A2A2A] rounded-2xl">
            <div className="w-12 h-12 rounded-full bg-[#171717] mx-auto flex items-center justify-center mb-4 border border-[#2A2A2A]">
              <FileText className="w-5 h-5 text-[#A1A1AA]" />
            </div>
            <h3 className="text-white font-medium mb-1">Nenhuma copy criada</h3>
            <p className="text-[#71717A] text-sm mb-6">Mapeie seu script, VSL ou anúncio focado no copy.</p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="text-[#D4AF37] hover:text-[#c9a02a] text-sm font-medium transition-colors"
            >
              Começar a escrever →
            </button>
          </div>
        ) : (
          copies.map((copy) => (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              key={copy.id}
              className="group flex items-center justify-between p-4 bg-[#202020] border border-[#2A2A2A] hover:border-[#3A3A3A] rounded-xl cursor-pointer transition-all hover:bg-[#252525] shadow-sm"
              onClick={() => router.push(`/ofertas/${offerId}/copys/${copy.id}`)}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#171717] flex items-center justify-center border border-[#2A2A2A]">
                  <FileText className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <h4 className="text-[15px] font-semibold text-white mb-0.5 group-hover:text-[#D4AF37] transition-colors">
                    {copy.name}
                  </h4>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={copy.status} />
                    <span className="text-[12px] text-[#71717A] flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {timeAgo(copy.updated_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Menu de ações Custom */}
              <div onClick={(e) => e.stopPropagation()}>
                <ActionMenu 
                  onDuplicate={() => duplicateCopy(copy.id)}
                  onDelete={() => deleteCopy(copy.id)}
                />
              </div>
            </motion.div>
          ))
        )}
      </div>

      <CreateCopyDialog 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen} 
        onCreate={handleCreate} 
      />
    </div>
  )
}
