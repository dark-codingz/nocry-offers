'use client'

import { motion, LayoutGroup } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { Settings, HelpCircle, User } from 'lucide-react'
import { useRouteTabs } from '@/hooks/use-route-tabs'
import Link from 'next/link'
import { toast } from 'sonner'

/**
 * Sidebar minimalista estilo AI dashboard - ícones em círculos, fundo preto profundo
 */
export function SideRail() {
  const pathname = usePathname()
  const tabs = useRouteTabs()

  return (
    <LayoutGroup>
      <aside
        role="navigation"
        aria-label="Navegação principal"
        className="fixed left-0 top-0 z-[40] h-[100dvh] w-20 bg-[#020204] border-r border-white/5 flex flex-col overflow-hidden"
        style={{
          maxHeight: '100dvh',
        }}
      >
        {/* Topo: Logo "N" com glow sutil */}
        <div className="flex items-center justify-center p-4 shrink-0">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border border-[#D4AF37]/30 flex items-center justify-center">
              <span className="text-lg font-bold text-[#D4AF37]" style={{ textShadow: '0 0 8px rgba(212, 175, 55, 0.3)' }}>
                N
              </span>
            </div>
          </div>
        </div>

        {/* Área central: Ícones principais em círculos */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto overflow-x-hidden relative z-20 min-h-0 flex flex-col items-center gap-2">
          {tabs.map((tab) => {
            // Verificar se há um tab mais específico que corresponde ao pathname atual
            // Um tab é "mais específico" se seu path é mais longo e também corresponde ao pathname
            const hasMoreSpecificMatch = tabs.some(
              (otherTab) =>
                otherTab.path !== tab.path &&
                otherTab.path.length > tab.path.length &&
                otherTab.path.startsWith(tab.path + '/') &&
                (pathname === otherTab.path || pathname.startsWith(otherTab.path + '/'))
            )
            
            // Item está ativo se:
            // 1. Pathname é exatamente igual ao path do tab, OU
            // 2. Pathname começa com o path do tab (mas não é exatamente igual) E não há um tab mais específico que também corresponde
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
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-gradient-to-br from-[#D4AF37]/30 to-[#D4AF37]/10 border border-[#D4AF37]/40'
                    : 'bg-black/40 border border-white/5 hover:bg-white/5 hover:border-white/10'
                }`}
                title={tab.label}
              >
                <Icon
                  className={`h-5 w-5 ${
                    isActive ? 'text-[#D4AF37]' : 'text-white/60'
                  } transition-colors`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {tab.badge !== null && tab.badge !== 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`absolute -top-1 -right-1 ${
                      tab.badge === '•'
                        ? 'h-2 w-2 rounded-full bg-[#D4AF37]'
                        : 'flex h-4 w-4 items-center justify-center rounded-full bg-[#D4AF37] text-[10px] font-bold text-black'
                    }`}
                  >
                    {typeof tab.badge === 'number' && tab.badge}
                  </motion.div>
                )}
                {tab.isDev && (tab.badge === null || tab.badge === 0) && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[8px] font-bold text-white"
                    title="Em desenvolvimento"
                  >
                    D
                  </motion.div>
                )}
              </motion.div>
            )

            if (tab.isExternal || tab.isDev) {
              return (
                <a
                  key={tab.path}
                  href={tab.isExternal ? tab.externalUrl : '#'}
                  onClick={handleClick}
                  className="block"
                >
                  {content}
                </a>
              )
            }

            return (
              <Link key={tab.path} href={tab.path} className="block">
                {content}
              </Link>
            )
          })}
        </nav>

        {/* Rodapé: Configurações, ajuda, perfil */}
        <div className="py-4 px-3 shrink-0 flex flex-col items-center gap-2 border-t border-white/5">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-12 h-12 rounded-full bg-black/40 border border-white/5 hover:bg-white/5 hover:border-white/10 flex items-center justify-center transition-all"
            title="Configurações"
          >
            <Settings className="h-5 w-5 text-white/60" strokeWidth={2} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-12 h-12 rounded-full bg-black/40 border border-white/5 hover:bg-white/5 hover:border-white/10 flex items-center justify-center transition-all"
            title="Ajuda"
          >
            <HelpCircle className="h-5 w-5 text-white/60" strokeWidth={2} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-12 h-12 rounded-full bg-black/40 border border-white/5 hover:bg-white/5 hover:border-white/10 flex items-center justify-center transition-all"
            title="Perfil"
          >
            <User className="h-5 w-5 text-white/60" strokeWidth={2} />
          </motion.button>
        </div>
      </aside>
    </LayoutGroup>
  )
}
