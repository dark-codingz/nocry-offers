'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useCopies, OfferCopy } from '@/hooks/use-copies'
import { ArrowLeft, MoreHorizontal, Copy, Trash2, CheckCircle2 } from 'lucide-react'
import { CopyEditor } from '@/components/ofertas/copys/copy-editor'
import { motion } from 'framer-motion'

export default function CopyEditorPage() {
  const params = useParams()
  const router = useRouter()
  const copyId = params.copyId as string
  const offerId = params.id as string
  
  const { copies, loading, updateCopy, duplicateCopy, deleteCopy } = useCopies(offerId)
  
  const [copy, setCopy] = useState<OfferCopy | null>(null)
  const [title, setTitle] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!loading && copies.length > 0) {
      const found = copies.find(c => c.id === copyId)
      if (found) {
        setCopy(found)
        setTitle(found.name)
      }
    }
  }, [loading, copies, copyId])

  // Auto-save do título com debounce
  useEffect(() => {
    if (!copy || title === copy.name) return
    setIsSaving(true)
    const timer = setTimeout(() => {
      updateCopy(copy.id, { name: title }).then(() => {
        setIsSaving(false)
      })
    }, 1500)
    return () => clearTimeout(timer)
  }, [title, copy, updateCopy])

  // Auto-save do conteúdo com debounce
  const [contentToSave, setContentToSave] = useState<string | null>(null)

  useEffect(() => {
    if (contentToSave === null || !copy) return
    
    setIsSaving(true)
    const timer = setTimeout(() => {
      updateCopy(copy.id, { content: contentToSave }).then(() => {
        setIsSaving(false)
        setContentToSave(null)
      })
    }, 2000) // 2 segundos de debounce para conteúdo pesado

    return () => clearTimeout(timer)
  }, [contentToSave, copy, updateCopy])

  const handleContentUpdate = (newContent: string) => {
    setContentToSave(newContent)
  }

  if (loading || !copy) {
    return (
      <div className="min-h-screen bg-[#171717] flex items-center justify-center">
        <div className="animate-pulse text-[#A1A1AA] text-sm font-medium">Carregando editor...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#171717] flex flex-col relative">
      {/* Top Header - Fixo e Transparente */}
      <header className="sticky top-0 h-[64px] z-10 hidden sm:flex items-center justify-between px-6 bg-[#171717]/90 backdrop-blur-md border-b border-[#2A2A2A]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/ofertas/${offerId}`)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#A1A1AA] hover:bg-[#2A2A2A] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <input 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-transparent text-[15px] font-medium text-white placeholder:text-[#71717A] focus:outline-none focus:border-b focus:border-[#D4AF37] min-w-[250px] transition-all py-1"
            placeholder="Nome do documento..."
          />
        </div>

        <div className="flex items-center gap-4">
          {/* Status Auto-save */}
          <div className="flex items-center gap-1.5 text-[12px] font-medium transition-colors text-[#71717A]">
            {isSaving ? (
              <span className="animate-pulse text-[#D4AF37]">Salvando...</span>
            ) : (
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Auto salvo</span>
            )}
          </div>

          <div className="relative">
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[#A1A1AA] hover:bg-[#2A2A2A] hover:text-white transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            )}
            
            {menuOpen && (
              <motion.div 
                initial={{ opacity: 0, y: -5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="absolute right-0 mt-2 w-[180px] bg-[#202020] border border-[#2A2A2A] text-white shadow-2xl overflow-hidden rounded-xl z-50 flex flex-col"
              >
                <button 
                  onClick={() => { setMenuOpen(false); duplicateCopy(copy.id).then(() => router.push(`/ofertas/${offerId}`)) }} 
                  className="flex items-center text-left gap-2 py-3 px-3 hover:bg-[#2A2A2A] border-b border-[#2A2A2A]/50 text-[13px] font-medium transition-colors"
                >
                  <Copy className="w-4 h-4 text-[#A1A1AA]" /> Duplicar
                </button>
                <button 
                  onClick={() => { setMenuOpen(false); deleteCopy(copy.id).then(() => router.push(`/ofertas/${offerId}`)) }} 
                  className="flex items-center text-left gap-2 py-3 px-3 text-red-500 hover:bg-red-500/10 hover:text-red-500 text-[13px] font-medium transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Excluir
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </header>

      {/* Área de Escrita (Editor Tiptap container master) */}
      <main className="flex-1 w-full flex flex-col">
          <CopyEditor 
            title={title}
            onTitleChange={setTitle}
            initialContent={copy.content} 
            onUpdate={handleContentUpdate} 
          />
      </main>
    </div>
  )
}
