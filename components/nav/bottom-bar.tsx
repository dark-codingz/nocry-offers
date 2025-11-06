'use client'

import { motion, LayoutGroup } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { useRouteTabs } from '@/hooks/use-route-tabs'
import { TabItem } from './tab-item'

/**
 * Bottom TabBar para mobile
 */
export function BottomBar() {
  const pathname = usePathname()
  const tabs = useRouteTabs()

  return (
    <LayoutGroup>
      <nav
        role="navigation"
        aria-label="Navegação principal"
        className="fixed bottom-0 left-0 right-0 z-[40] bg-[var(--surface)]/85 backdrop-blur-xl border-t border-[var(--border-color)] h-16 overflow-hidden"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          width: '100%',
          maxWidth: '100%',
        }}
      >
        <div className="flex h-full items-center justify-around px-2 relative">
          {tabs.map((tab) => {
            const isActive = pathname === tab.path || (tab.path !== '/' && pathname.startsWith(tab.path))
            return (
              <TabItem
                key={tab.path}
                tab={tab}
                isActive={isActive}
                variant="bottom"
              />
            )
          })}
        </div>
      </nav>
    </LayoutGroup>
  )
}

