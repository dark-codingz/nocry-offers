'use client'

import { parseStorageRef, type StorageRef } from './storage-url'
import { createClient } from './supabase/client'

// TTL padrão: 7 dias (em segundos)
const DEFAULT_TTL = 7 * 24 * 60 * 60

/**
 * Garante que uma URL seja acessível, gerando signed URL se necessário
 */
export async function ensureAccessibleUrl(rawUrl: string, ttl = DEFAULT_TTL): Promise<string> {
  const ref = parseStorageRef(rawUrl)

  // 1) Signed URL já é usável
  if (ref.kind === 'signed') return ref.url

  // 2) Public URL (inclui bucket::path): para bucket privado, sempre gerar signed
  if (ref.kind === 'public') {
    // Se a URL original não contém /storage/v1/object/, é um path simples (bucket::path)
    const isPathOnly = !ref.url.includes('/storage/v1/object/')
    
    if (isPathOnly) {
      // Path simples: gerar signed diretamente sem testar
      try {
        const supabase = createClient()
        const { data, error } = await supabase.storage.from(ref.bucket).createSignedUrl(ref.path, ttl)

        if (error || !data?.signedUrl) {
          console.error('[SIGNED_URL_ERROR]', error)
          throw error || new Error('Falha ao gerar signed URL')
        }

        return data.signedUrl
      } catch (err) {
        console.error('[ENSURE_ACCESSIBLE_URL_ERROR]', err)
        throw err
      }
    }
    
    // URL pública completa: testar primeiro
    try {
      const headResponse = await fetch(ref.url, { method: 'HEAD', cache: 'no-store' })
      if (headResponse.ok) return ref.url // Público e acessível
    } catch {
      // Fallthrough para gerar signed
    }

    // Se público não abrir, gera uma signed a partir do bucket+path
    try {
      const supabase = createClient()
      const { data, error } = await supabase.storage.from(ref.bucket).createSignedUrl(ref.path, ttl)

      if (error || !data?.signedUrl) {
        console.error('[SIGNED_URL_ERROR]', error)
        throw error || new Error('Falha ao gerar signed URL')
      }

      return data.signedUrl
    } catch (err) {
      console.error('[ENSURE_ACCESSIBLE_URL_ERROR]', err)
      // Fallback: retorna a URL pública mesmo se falhou
      return ref.url
    }
  }

  // 3) External: usa como veio
  return ref.url
}

/**
 * Gera signed URLs em lote (otimização para listas grandes)
 */
export async function createSignedUrlsBatch(
  rawUrls: string[],
  ttl = DEFAULT_TTL
): Promise<Map<string, string>> {
  const supabase = createClient()
  const urlMap = new Map<string, string>()

  // Agrupar por bucket
  const byBucket = new Map<string, string[]>()

  for (const url of rawUrls) {
    const ref = parseStorageRef(url)
    if (ref.kind === 'public') {
      const paths = byBucket.get(ref.bucket) || []
      paths.push(ref.path)
      byBucket.set(ref.bucket, paths)
    } else if (ref.kind === 'signed') {
      urlMap.set(url, url) // Já é signed, mantém
    } else {
      urlMap.set(url, url) // External, mantém
    }
  }

  // Gerar signed URLs em lote por bucket
  for (const [bucket, paths] of byBucket.entries()) {
    try {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, ttl)

      if (error) {
        console.error(`[BATCH_SIGNED_URL_ERROR_${bucket}]`, error)
        continue
      }

      if (data) {
        for (const signed of data) {
          if (signed.path && signed.signedUrl) {
            const originalUrl = rawUrls.find((url) => {
              const ref = parseStorageRef(url)
              return ref.kind === 'public' && ref.bucket === bucket && ref.path === signed.path
            })
            if (originalUrl) {
              urlMap.set(originalUrl, signed.signedUrl)
            }
          }
        }
      }
    } catch (err) {
      console.error(`[BATCH_SIGNED_URL_EXCEPTION_${bucket}]`, err)
    }
  }

  return urlMap
}

