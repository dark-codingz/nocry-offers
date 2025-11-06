'use client'

import { useCallback } from 'react'
import { normalizeUrl } from '@/lib/url'

export function useUrlNormalizer() {
  const onBlurNormalize = useCallback(
    (value: string, setValue: (v: string) => void) => {
      const n = normalizeUrl(value)
      if (n && n !== value) setValue(n)
    },
    []
  )
  return { onBlurNormalize }
}

