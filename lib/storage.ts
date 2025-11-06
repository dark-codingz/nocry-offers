'use client'

import { createClient } from './supabase/client'
import { STORAGE_BUCKET } from './constants'

/**
 * Upload de arquivo para Supabase Storage e retorna apenas o path
 */
export async function uploadToOffersFiles(destPath: string, file: File): Promise<{ path: string; name: string }> {
  const supabase = createClient()

  // Sanitizar nome do arquivo
  const safeName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.\-]+/g, '_')

  // Garantir path relativo (sem / no início)
  const cleanPath = destPath.startsWith('/') ? destPath.slice(1) : destPath
  const path = `${cleanPath}/${safeName}`

  // Upload para Supabase Storage
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: true })

  if (error) {
    if (error.message?.includes('Bucket not found')) {
      throw new Error('BUCKET_NOT_FOUND')
    }
    throw error
  }

  return { path, name: safeName }
}

/**
 * Gera signed URL para um path no bucket privado
 */
export async function getSignedUrl(path: string, expiresIn = 60 * 60): Promise<string> {
  // 1h padrão
  const supabase = createClient()
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, expiresIn)

  if (error) throw error
  if (!data?.signedUrl) throw new Error('Falha ao gerar signed URL')

  return data.signedUrl
}


