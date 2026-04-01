'use client'

import { motion, LayoutGroup } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { Settings, HelpCircle, User, ChevronDown } from 'lucide-react'
import { useRouteTabs } from '@/hooks/use-route-tabs'
import Link from 'next/link'
import { toast } from 'sonner'

export function SideRail() {
  const pathname = usePathname()
  const tabs = useRouteTabs()

  return (
    <LayoutGroup>
      <aside
        role="navigation"
        aria-label="Navegação principal"
        className="group fixed left-0 top-0 z-50 h-[100dvh] w-[64px] hover:w-[240px] hover:shadow-[16px_0_32px_-12px_rgba(0,0,0,0.5)] bg-[#171717] border-r border-[#262626] flex flex-col overflow-hidden transition-[width] duration-300 ease-in-out"
        style={{
          maxHeight: '100dvh',
        }}
      >
        {/* Topo: Logo "N" */}
        <div className="flex items-center gap-3 p-[16px] shrink-0 h-[64px]">
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border border-[#D4AF37]/30 flex items-center justify-center">
              <span className="text-sm font-bold text-[#D4AF37]" style={{ textShadow: '0 0 8px rgba(212, 175, 55, 0.3)' }}>
                N
              </span>
            </div>
          </div>
          <span className="font-semibold text-white tracking-wide opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100 whitespace-nowrap">NoCry</span>
        </div>

        {/* Área central: Ícones e Textos */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto overflow-x-hidden relative z-20 min-h-0 flex flex-col gap-1 no-scrollbar">
          {tabs.map((tab) => {
            const hasMoreSpecificMatch = tabs.some(
              (otherTab) =>
                otherTab.path !== tab.path &&
                otherTab.path.length > tab.path.length &&
                otherTab.path.startsWith(tab.path + '/') &&
                (pathname === otherTab.path || pathname.startsWith(otherTab.path + '/'))
            )
            
            const isActive =
              pathname === tab.path ||
              (tab.path !== '/' &&
                pathname !== tab.path &&
                pathname.startsWith(tab.path + '/') &&
                !hasMoreSpecificMatch)
                
            const Icon = tab.icon

            const handleClick = (e: React.MouseEvent) => {
              if (tab.isExternal && tab.externalUrl) {
                e.preventDefault()
                window.open(tab.externalUrl, '_blank', 'noopener,noreferrer')
                return
              }
              if (tab.isDev) {
                e.preventDefault()
                toast.info('Em desenvolvimento', {
                  description: `${tab.label} estará disponível em breve.`,
                  duration: 3000,
                })
                return
              }
            }

            const content = (
              <div
                className={`relative flex items-center gap-3 w-full px-[11px] py-[10px] rounded-lg transition-colors duration-200 ease-out border ${
                  isActive
                    ? 'bg-[#202020] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border-white/5'
                    : 'text-[#A1A1AA] hover:bg-[#202020] hover:text-white border-transparent'
                }`}
                title={tab.label}
              >
                <Icon
                  className={`h-[18px] w-[18px] shrink-0 transition-colors duration-200 ${
                    isActive ? 'text-white' : 'text-[#A1A1AA] group-hover:text-white'
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className={`text-sm truncate opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100 whitespace-nowrap ${isActive ? 'font-medium' : 'font-normal'}`}>
                  {tab.label}
                </span>
                
                {tab.badge !== null && tab.badge !== 0 && (
                  <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100">
                    <div
                      className={`flex items-center justify-center ${
                        tab.badge === '•'
                          ? 'h-2 w-2 rounded-full bg-[#D4AF37]'
                          : 'h-5 px-1.5 min-w-[20px] rounded bg-[#2A2A2A] text-[11px] font-medium text-white'
                      }`}
                    >
                      {typeof tab.badge === 'number' && tab.badge}
                    </div>
                  </div>
                )}
                
                {tab.isDev && (tab.badge === null || tab.badge === 0) && (
                  <div
                    className="ml-auto flex h-4 px-1.5 items-center justify-center rounded bg-orange-500/10 text-[10px] font-medium text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100"
                  >
                    DEV
                  </div>
                )}
              </div>
            )

            if (tab.isExternal || tab.isDev) {
              return (
                <a
                  key={tab.path}
                  href={tab.isExternal ? tab.externalUrl : '#'}
                  onClick={handleClick}
                  className="block cursor-pointer outline-none mb-0.5 relative group/item"
                >
                  {content}
                  
                  {/* Tooltip p/ Sidebar Fechada apenas se houver necessidade (Fundo: #202020 texto branco) */}
                  <div className="hidden absolute left-14 top-1/2 -translate-y-1/2 px-2 py-1 bg-[#202020] text-white text-xs rounded border border-white/5 opacity-0 group-hover/item:opacity-100 group-hover:hidden whitespace-nowrap z-50 pointer-events-none transition-opacity">
                    {tab.label}
                  </div>
                </a>
              )
            }

            return (
              <Link key={tab.path} href={tab.path} className="block outline-none mb-0.5 relative group/item">
                {content}
                
                <div className="hidden absolute left-14 top-1/2 -translate-y-1/2 px-2 py-1 bg-[#202020] text-white text-xs rounded border border-white/5 opacity-0 group-hover/item:opacity-100 group-hover:hidden whitespace-nowrap z-50 pointer-events-none transition-opacity">
                  {tab.label}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Rodapé: Perfil de usuário */}
        <div className="p-3 shrink-0 border-t border-[#262626]">
          <div className="flex items-center gap-3 p-[7px] group-hover:p-2 rounded-xl group-hover:bg-[#202020] group-hover:hover:bg-[#2A2A2A] transition-all duration-200 cursor-pointer border border-transparent group-hover:hover:border-white/5 overflow-hidden">
            <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-inner">
              <span className="text-sm font-medium text-white">DM</span>
            </div>
            
            <div className="flex-1 min-w-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100 whitespace-nowrap">
              <p className="text-sm font-medium text-white truncate">Dark M</p>
              <p className="text-xs text-[#71717A] truncate">dark@nocry.io</p>
            </div>
            
            <ChevronDown className="h-4 w-4 text-[#71717A] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100" />
          </div>
        </div>
      </aside>
    </LayoutGroup>
  )
}
