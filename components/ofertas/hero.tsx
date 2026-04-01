'use client'

import { Plus, Download, RefreshCw } from 'lucide-react'

interface HeroProps {
  onCreateClick: () => void
}

export function Hero({ onCreateClick }: HeroProps) {
  return (
    <div className="flex flex-col mb-8 pt-2">
      {/* Title block */}

      {/* Linha principal: Ofertas + Botoes */}
      <div className="flex items-start justify-between w-full">
        {/* Esquerda: Título e sync */}
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[28px] font-semibold text-white tracking-tight leading-none">Ofertas</h1>
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#71717A]">
            <RefreshCw className="h-[10px] w-[10px]" />
            <span>Ultima Atualização: Agora</span>
            <span className="w-1 h-1 bg-[#22C55E] rounded-full ml-1"></span>
          </div>
        </div>

        {/* Direita: Botões */}
        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2 h-9 px-4 rounded-[8px] bg-transparent border border-[#2A2A2A] text-[13px] font-medium text-white hover:bg-[#202020] transition-colors duration-200"
          >
            <Download className="h-4 w-4" />
            <span>Import Oferta</span>
          </button>
          
          <button
            onClick={onCreateClick}
            className="flex items-center gap-2 h-9 px-4 rounded-[8px] bg-white text-black text-[13px] font-semibold hover:bg-[#E5E5E5] transition-colors duration-200 shadow-sm"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            <span>Add Oferta</span>
          </button>
        </div>
      </div>
    </div>
  )
}
