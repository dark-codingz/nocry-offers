import { Home, LayoutGrid, Copy, LineChart, Settings, Search, BarChart3, type LucideIcon } from 'lucide-react'

export interface TabConfig {
  path: string
  label: string
  icon: LucideIcon
  badge: number | '•' | null
  isExternal?: boolean // Link externo
  externalUrl?: string // URL externa se isExternal = true
  isDev?: boolean // Mostrar aviso "em desenvolvimento"
}

export const TABS: TabConfig[] = [
  { path: '/', label: 'Home', icon: Home, badge: 0, isDev: true },
  { path: '/ofertas', label: 'Ofertas', icon: LayoutGrid, badge: '•' },
  { path: '/clone', label: 'Clone', icon: Copy, badge: 0 },
  { path: '/finance', label: 'Finance', icon: LineChart, badge: 0, isExternal: true, externalUrl: 'https://theresnocry.com/' },
  { path: '/funil-spy', label: 'Funil Spy', icon: Search, badge: 0, isDev: true },
  { path: '/tracking', label: 'NoCry Tracking', icon: BarChart3, badge: 0, isDev: true },
  { path: '/settings', label: 'Config', icon: Settings, badge: 0, isDev: true },
] as const

export function useRouteTabs() {
  return TABS
}

