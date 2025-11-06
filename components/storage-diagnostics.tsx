'use client'

import { useEffect } from 'react'
import { STORAGE_BUCKET } from '@/lib/constants'

/**
 * Componente para logar diagnóstico de storage no client
 */
export function StorageDiagnostics() {
  useEffect(() => {
    console.log('[StorageCheck] SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 32) + '...')
    console.log('[StorageCheck] Using bucket:', STORAGE_BUCKET)
  }, [])

  return null
}

