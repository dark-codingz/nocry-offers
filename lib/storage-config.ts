/**
 * Configuração global do Storage
 * @deprecated Use STORAGE_BUCKET from '@/lib/constants' instead
 */
import { STORAGE_BUCKET as CONST_STORAGE_BUCKET } from '@/lib/constants'

export const STORAGE_BUCKET = CONST_STORAGE_BUCKET

/**
 * Log de diagnóstico (executar uma vez no init)
 */
export function logStorageConfig() {
  if (typeof window === 'undefined') return

  console.log('[StorageCheck] SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 32))
  console.log('[StorageCheck] Using bucket:', CONST_STORAGE_BUCKET)
}


