'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FileText, MonitorPlay, Sparkles, HelpCircle } from 'lucide-react'
import type { CopyType } from '@/hooks/use-copies'

interface CreateCopyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (data: { name: string; type: CopyType }) => void
}

const COPY_TYPES: { id: CopyType; title: string; desc: string; icon: React.FC<any> }[] = [
  { id: 'Em Branco', title: 'Em Branco', desc: 'Comece do zero', icon: FileText },
  { id: 'VSL', title: 'VSL', desc: 'Script de vídeo de vendas', icon: MonitorPlay },
  { id: 'Criativo', title: 'Criativo', desc: 'Anúncios curtos', icon: Sparkles },
  { id: 'Quizz', title: 'Quizz', desc: 'Páginas de advertorial', icon: HelpCircle },
]

export function CreateCopyDialog({ open, onOpenChange, onCreate }: CreateCopyDialogProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<CopyType>('Em Branco')

  const handleCreate = () => {
    if (!name.trim()) return
    onCreate({ name, type })
    setName('')
    setType('Em Branco')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-[#202020] border-[#2A2A2A] text-white p-6 shadow-2xl">
        <DialogHeader>
          <div className="mb-4">
            <DialogTitle className="text-xl font-semibold tracking-tight text-white mb-2">Nova Copy</DialogTitle>
            <p className="text-sm text-[#A1A1AA]">Comece a rascunhar um novo elemento de conversão.</p>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Input Name */}
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-[#A1A1AA]">Nome do documento</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: VSL Secundária"
              className="w-full h-11 rounded-lg bg-[#171717] border border-[#2A2A2A] px-3 py-2 text-sm text-white placeholder:text-[#71717A] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all"
              autoFocus
            />
          </div>

          {/* Grid de Tipos */}
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-[#A1A1AA]">Tipo de Copy</label>
            <div className="grid grid-cols-2 gap-3">
              {COPY_TYPES.map((t) => {
                const isSelected = type === t.id
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    onClick={() => setType(t.id)}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                      isSelected 
                        ? 'bg-[#D4AF37]/10 border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.05)]' 
                        : 'bg-[#171717] border-[#2A2A2A] hover:border-[#3A3A3A] hover:bg-[#1A1A1A]'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-[#D4AF37]' : 'text-[#71717A]'}`} strokeWidth={2} />
                    <span className={`text-[13px] font-semibold mb-0.5 ${isSelected ? 'text-[#D4AF37]' : 'text-white'}`}>
                      {t.title}
                    </span>
                    <span className="text-[11px] text-[#A1A1AA] line-clamp-1">{t.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-end gap-3">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-[#A1A1AA] hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="px-6 py-2 rounded-lg bg-[#D4AF37] text-black text-sm font-bold shadow-md hover:bg-[#c9a02a] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Criar Copy
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
