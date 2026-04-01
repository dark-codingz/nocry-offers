/**
 * Configuração global do Storage
 * @deprecated Use STORAGE_BUCKET from '@/lib/constants' instead
 */
export { STORAGE_BUCKET } from './constants'

/**
 * Log de diagnóstico (executar uma vez no init)
 */
export function logStorageConfig() {
  if (typeof window === 'undefined') return

  console.log('[StorageCheck] SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 32))
  console.log('[StorageCheck] Using bucket:', STORAGE_BUCKET)
}


