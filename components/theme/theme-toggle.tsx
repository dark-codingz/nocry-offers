'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const STORAGE_KEY = 'nocry-theme'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => 'light')

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as 'light' | 'dark' | null
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const initial = stored || (prefersDark ? 'dark' : 'light')
      setTheme(initial)
      document.documentElement.classList.toggle('dark', initial === 'dark')
      document.documentElement.setAttribute('data-theme', initial)
    } catch {}
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {}
    document.documentElement.classList.toggle('dark', next === 'dark')
    document.documentElement.setAttribute('data-theme', next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Alternar tema"
      className={`btn btn-ghost flex items-center gap-2 px-3 h-9 ${className}`}
      title={theme === 'dark' ? 'Tema: escuro' : 'Tema: claro'}
    >
      {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
      <span className="text-sm">{theme === 'dark' ? 'Escuro' : 'Claro'}</span>
    </button>
  )
}


