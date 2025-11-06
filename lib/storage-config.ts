/**
 * Configuração global do Storage
 */
export const STORAGE_BUCKET = 'offers-files'

/**
 * Log de diagnóstico (executar uma vez no init)
 */
export function logStorageConfig() {
  if (typeof window === 'undefined') return

  console.log('[StorageCheck] SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 32))
  console.log('[StorageCheck] Using bucket:', STORAGE_BUCKET)
}


