'use client'

import { useLayoutEffect } from 'react'

/**
 * Hook para carregar GSAP dinamicamente no cliente
 */
export function useGsapOnce(cb: (gsapModule: typeof import('gsap')) => (() => void) | void) {
  useLayoutEffect(() => {
    let mounted = true
    let cleanup: (() => void) | undefined

    ;(async () => {
      const gsapModule = await import('gsap')
      if (mounted) {
        const result = cb(gsapModule)
        cleanup = typeof result === 'function' ? result : undefined
      }
    })()

    return () => {
      mounted = false
      cleanup?.()
    }
  }, [cb])
}

