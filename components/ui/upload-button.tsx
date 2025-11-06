'use client'

import { useState, useRef } from 'react'
import { uploadOfferFile, getSignedUrl, type FileCategory } from '@/lib/files'
import { useToast } from '@/hooks/use-toast'
import { Button } from './button'

interface UploadButtonProps {
  offerId: string
  category: FileCategory
  onUploaded?: (key: string, signedUrl: string) => void
  accept?: string
  label?: string
  variant?: 'default' | 'outline' | 'secondary'
  size?: 'default' | 'sm' | 'lg'
}

export function UploadButton({
  offerId,
  category,
  onUploaded,
  accept = '*/*',
  label = 'Upload Arquivo',
  variant = 'outline',
  size = 'sm',
}: UploadButtonProps) {
  const [uploading, setUploading] = useState(false)
  const { showToast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)

    try {
      const { key } = await uploadOfferFile(offerId, category, file)
      const signedUrl = await getSignedUrl(key)

      showToast('Arquivo enviado com sucesso', 'success')
      onUploaded?.(key, signedUrl)

      // Reset input
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    } catch (error) {
      console.error('[UPLOAD_ERROR]', error)

      if (error instanceof Error) {
        if (error.message === 'BUCKET_NOT_FOUND') {
          showToast(
            'Crie o bucket "offers-files" no Supabase Storage (privado) antes de fazer upload',
            'error'
          )
        } else if (error.message === 'STORAGE_RLS_ERROR') {
          showToast(
            'Erro de permissão no Storage. Configure as políticas RLS do bucket "offers-files". Veja DIAGNOSTICO-UPLOAD-RLS.md',
            'error'
          )
        } else {
          showToast(
            `Erro ao enviar arquivo: ${error.message}`,
            'error'
          )
        }
      } else {
        showToast('Erro desconhecido ao enviar arquivo', 'error')
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? 'Enviando...' : label}
      </Button>
    </>
  )
}

