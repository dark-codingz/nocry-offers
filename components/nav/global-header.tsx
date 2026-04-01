'use client'

import { Search, Bell, Plus } from 'lucide-react'
import { useState } from 'react'

export function GlobalHeader() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-[64px] h-[56px] z-40 bg-[#171717]/80 backdrop-blur-md flex items-center px-8 border-b border-[#2A2A2A]">
      
      {/* Esquerda: Search bar */}
      <div className="flex-1 flex items-center">
        <div className="relative w-full max-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-[14px] w-[14px] text-[#71717A]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search anything"
            className="w-full h-8 rounded-[8px] bg-[#202020] border border-[#2A2A2A] pl-8 pr-12 text-[13px] text-white placeholder:text-[#71717A] outline-none focus:border-[#3A3A3A] transition-colors"
          />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
            <span className="flex items-center justify-center h-[20px] px-1.5 rounded-[4px] bg-[#2A2A2A] text-[10px] text-white/50 font-medium">⌘K</span>
          </div>
        </div>
      </div>

      {/* Direita: Ações Globais */}
      <div className="flex-1 flex items-center justify-end gap-5">
        
        <button className="text-[#A1A1AA] hover:text-white transition-colors relative">
          <Bell className="h-[18px] w-[18px]" />
          {/* Ponto vermelho decorativo do sino */}
          <span className="absolute top-[2px] right-[2px] w-1 h-1 rounded-full bg-red-500 pointer-events-none"></span>
        </button>
        
        {/* Avatares Mockados */}
        <div className="flex items-center -space-x-1.5 cursor-pointer">
          <img src="https://i.pravatar.cc/100?img=11" alt="Avatar" className="w-[26px] h-[26px] rounded-full border-2 border-[#171717] z-30" />
          <img src="https://i.pravatar.cc/100?img=33" alt="Avatar" className="w-[26px] h-[26px] rounded-full border-2 border-[#171717] z-20" />
          <img src="https://i.pravatar.cc/100?img=15" alt="Avatar" className="w-[26px] h-[26px] rounded-full border-2 border-[#171717] z-10" />
          <div className="flex items-center justify-center w-[26px] h-[26px] rounded-full border-2 border-[#171717] bg-[#2A2A2A] text-[10px] font-medium text-white z-0">
            +10
          </div>
        </div>

        {/* Add Membro */}
        <button
          className="flex items-center gap-1.5 h-8 px-3 rounded-[8px] bg-transparent border border-[#2A2A2A] text-[13px] font-medium text-white hover:bg-[#202020] transition-colors duration-200"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Membro</span>
        </button>
      </div>
    </header>
  )
}
