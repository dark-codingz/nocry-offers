'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { useRouteTabs } from '@/hooks/use-route-tabs'
import { BottomBar } from './bottom-bar'
import { SideRail } from './side-rail'
import { useEffect, useState } from 'react'

/**
 * TabBar híbrida: mobile bottom, desktop lateral colapsável
 */
export function TabBar() {
  const [isMobile, setIsMobile] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (isMobile) {
    return <BottomBar />
  }

  return <SideRail />
}

