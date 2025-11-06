'use client'

import { getBrowserClient } from './supabase/client'

const BUCKET = 'offers-files'

export type FileCategory =
  | 'creatives_original'
  | 'creatives_modeled'
  | 'bonuses'
  | 'attachments'
  | 'upsells'

function generateUniqueKey(offerId: string, category: FileCategory, fileName: string): string {
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 15)
  const uniqueId = `${timestamp}-${randomStr}`
  return `${offerId}/${category}/${uniqueId}-${fileName}`
}

export async function uploadOfferFile(
  offerId: string,
  category: FileCategory,
  file: File
): Promise<{ key: string; path: string }> {
  const supabase = getBrowserClient()
  const key = generateUniqueKey(offerId, category, file.name)

  console.log('[UPLOAD_FILE_START]', { offerId, category, fileName: file.name, key })

  const { data, error } = await supabase.storage.from(BUCKET).upload(key, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) {
    console.error('[UPLOAD_FILE_ERROR]', { 
      offerId, 
      category, 
      fileName: file.name,
      error: {
        message: error.message,
        name: error.name,
        statusCode: (error as any).statusCode,
      }
    })

    // Check if bucket doesn't exist
    if (error.message.includes('Bucket not found') || error.message.includes('not found')) {
      throw new Error('BUCKET_NOT_FOUND')
    }

    // Check for RLS policy violation
    if (
      error.message.includes('row-level security') || 
      error.message.includes('RLS') ||
      error.message.includes('policy')
    ) {
      throw new Error('STORAGE_RLS_ERROR')
    }

    throw new Error(error.message)
  }

  console.log('[UPLOAD_FILE_SUCCESS]', { offerId, category, key })
  return { key, path: data.path }
}

export async function getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
  if (!key) return ''
  
  // If already a full URL, return as is
  if (key.startsWith('http://') || key.startsWith('https://')) {
    return key
  }

  const supabase = getBrowserClient()
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(key, expiresIn)

  if (error) {
    console.error('Error creating signed URL:', error)
    throw new Error(error.message)
  }

  return data.signedUrl
}

export async function deleteOfferFile(key: string): Promise<void> {
  if (!key || key.startsWith('http')) return

  const supabase = getBrowserClient()
  const { error } = await supabase.storage.from(BUCKET).remove([key])

  if (error) {
    console.error('Error deleting file:', error)
    throw new Error(error.message)
  }
}

export const ALLOWED_FILE_TYPES = {
  creatives: 'video/*,image/*,.zip,.pdf',
  bonuses: '.zip,.pdf,video/*,image/*,.txt,.csv',
  attachments: '*/*',
  default: '.zip,.pdf,.mp4,.mov,.png,.jpg,.jpeg,.txt,.csv',
}

