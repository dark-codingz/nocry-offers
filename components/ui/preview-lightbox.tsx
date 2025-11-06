'use client'

import { useEffect, useCallback, useState } from 'react'
import { X, Download, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { resolvePreviewUrl } from '@/lib/file-types'

interface PreviewLightboxProps {
  fileUrl: string
  fileName: string
  fileType: 'image' | 'video' | 'pdf' | 'other'
  onClose: () => void
}

export function PreviewLightbox({ fileUrl: urlOrKey, fileName, fileType, onClose }: PreviewLightboxProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // Resolver URL assincronamente
  useEffect(() => {
    async function load() {
      try {
        const url = await resolvePreviewUrl(urlOrKey)
        setResolvedUrl(url)
      } catch (err) {
        console.error('[PREVIEW_RESOLVE_ERROR]', err)
        toast.error('Erro ao carregar preview')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [urlOrKey])

  // Fechar com ESC
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [handleEscape])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(resolvedUrl)
    toast.success('✅ Link copiado')
  }

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = resolvedUrl
    a.download = fileName
    a.click()
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white mx-auto" />
          <p className="mt-3 text-sm text-white/60">Carregando preview...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Container do conteúdo */}
      <div
        className="relative max-h-[90vh] max-w-[90vw] overflow-auto rounded-2xl border border-black/10 bg-white p-4 shadow-figma"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com ações */}
        <div className="mb-4 flex items-center justify-between gap-4 border-b border-gray-200 pb-3">
          <h3 className="truncate text-lg font-medium text-neutral-900">{fileName}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="rounded-lg border border-gray-300 bg-white p-2 text-neutral-700 transition hover:bg-gray-50"
              aria-label="Copiar link"
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              onClick={handleDownload}
              className="rounded-lg border border-gray-300 bg-white p-2 text-neutral-700 transition hover:bg-gray-50"
              aria-label="Baixar"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white p-2 text-neutral-700 transition hover:bg-gray-50"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Conteúdo do preview */}
        <div className="flex items-center justify-center">
          {fileType === 'image' && (
            <img
              src={resolvedUrl}
              alt={fileName}
              className="max-h-[75vh] rounded-xl object-contain"
              style={{ cursor: 'zoom-in' }}
            />
          )}

          {fileType === 'video' && (
            <video
              src={resolvedUrl}
              controls
              muted
              className="max-h-[75vh] rounded-xl"
              style={{ maxWidth: '100%' }}
            >
              <track kind="captions" />
            </video>
          )}

          {fileType === 'pdf' && (
            <iframe
              src={`${resolvedUrl}#toolbar=0`}
              title={fileName}
              className="h-[75vh] w-full rounded-xl border border-gray-300"
            />
          )}

          {fileType === 'other' && (
            <div className="space-y-4 py-12 text-center">
              <p className="text-sm text-neutral-600">
                Preview não disponível para este tipo de arquivo
              </p>
              <button
                onClick={handleDownload}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-neutral-700 transition hover:bg-gray-50"
              >
                <Download className="mr-2 inline-block h-4 w-4" />
                Baixar arquivo
              </button>
              <div className="mt-2">
                <a
                  href={resolvedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#D4AF37] hover:underline"
                >
                  Abrir em nova aba →
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

