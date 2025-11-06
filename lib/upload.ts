'use client'

import { createClient } from '@/lib/supabase/client'
import { slugifyBase, extFromFile } from './upload-utils'

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface UploadResult {
  success: boolean
  fileKey?: string
  publicUrl?: string
  error?: string
}

/**
 * Faz upload de arquivo para Supabase Storage com callback de progresso
 */
export async function uploadFile(
  file: File,
  offerId: string,
  category: 'creatives_original' | 'creatives_modeled' | 'bonuses' | 'attachments' | 'pages',
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  try {
    const supabase = createClient()

    // Gerar nome único do arquivo
    const timestamp = Date.now()
    const ext = extFromFile(file) || 'bin'
    const base = slugifyBase(file.name.replace(/\.[^.]+$/, '')) || 'arquivo'
    const fileKey = `${offerId}/${category}/${timestamp}_${base}.${ext}`

    // Simular progresso inicial
    onProgress?.({ loaded: 0, total: file.size, percentage: 0 })

    // Upload para Supabase Storage
    const { data, error } = await supabase.storage
      .from('offers-files')
      .upload(fileKey, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      })

    if (error) {
      console.error('[UPLOAD_ERROR]', error)
      return { success: false, error: error.message }
    }

    // Progresso 100%
    onProgress?.({ loaded: file.size, total: file.size, percentage: 100 })

    // Obter URL pública completa
    const { data: publicData } = supabase.storage.from('offers-files').getPublicUrl(data.path)

    // Retornar URL pública completa para salvar no banco
    return {
      success: true,
      fileKey: data.path,
      publicUrl: publicData.publicUrl,
    }
  } catch (err) {
    console.error('[UPLOAD_EXCEPTION]', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro desconhecido',
    }
  }
}

/**
 * Extrai metadados de um arquivo (tamanho, dimensões, duração)
 */
export async function extractFileMetadata(file: File): Promise<{
  type: 'image' | 'video' | 'pdf' | 'file'
  sizeBytes: number
  sizeMB: string
  width?: number
  height?: number
  durationSec?: number
  durationFormatted?: string
}> {
  const sizeBytes = file.size
  const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(1)

  let type: 'image' | 'video' | 'pdf' | 'file' = 'file'
  if (file.type.startsWith('image/')) type = 'image'
  else if (file.type.startsWith('video/')) type = 'video'
  else if (file.type === 'application/pdf') type = 'pdf'

  const metadata: any = { type, sizeBytes, sizeMB: `${sizeMB} MB` }

  // Extrair dimensões de imagem
  if (type === 'image') {
    try {
      const dimensions = await getImageDimensions(file)
      metadata.width = dimensions.width
      metadata.height = dimensions.height
    } catch (err) {
      console.warn('[IMAGE_DIMENSIONS_FAIL]', err)
    }
  }

  // Extrair duração de vídeo
  if (type === 'video') {
    try {
      const duration = await getVideoDuration(file)
      metadata.durationSec = duration
      metadata.durationFormatted = formatDuration(duration)
    } catch (err) {
      console.warn('[VIDEO_DURATION_FAIL]', err)
    }
  }

  return metadata
}

/**
 * Obtém dimensões de uma imagem
 */
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.width, height: img.height })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

/**
 * Obtém duração de um vídeo
 */
function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(Math.round(video.duration))
    }

    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load video'))
    }

    video.src = url
  })
}

/**
 * Formata duração em segundos para mm:ss
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Gera URL de download forçado (Content-Disposition: attachment)
 */
export function getDownloadUrl(fileKey: string, fileName: string): string {
  const supabase = createClient()
  const { data } = supabase.storage.from('offers-files').getPublicUrl(fileKey, {
    download: fileName,
  })
  return data.publicUrl
}

