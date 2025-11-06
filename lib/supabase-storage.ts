'use client'

import { createClient } from './supabase/client'
import { STORAGE_BUCKET } from './constants'

/**
 * Upload de arquivo para Supabase Storage e retorna URL pública
 * Helper centralizado conforme especificação
 */
export async function uploadToOffersFiles(
  pathPrefix: string,
  file: File
): Promise<{ url: string | null; fullPath: string; name: string }> {
  const supabase = createClient()

  // Sanitizar nome do arquivo
  const safeName = file.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w.\-]+/g, '_')

  // Garantir path relativo (sem / no início)
  const cleanPath = pathPrefix.startsWith('/') ? pathPrefix.slice(1) : pathPrefix
  const fullPath = `${cleanPath}/${safeName}`

  // Upload para Supabase Storage
  const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(fullPath, file, {
    upsert: true,
  })

  if (upErr) {
    if (upErr.message?.includes('Bucket not found')) {
      throw new Error('BUCKET_NOT_FOUND')
    }
    throw upErr
  }

  // Obter URL pública
  const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fullPath)

  return {
    url: pub?.publicUrl ?? null,
    fullPath,
    name: safeName,
  }
}
