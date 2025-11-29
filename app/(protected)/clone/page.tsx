'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ClonePage() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [cloneId, setCloneId] = useState<string | null>(null)
  const [clonedUrl, setClonedUrl] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClone = async () => {
    if (!url.trim()) {
      alert('Por favor, insira uma URL')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Chamar nova rota /api/clones
      const response = await fetch('/api/clones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Falha ao clonar página')
      }

      const { cloneId: newCloneId } = await response.json()
      setCloneId(newCloneId)
      setClonedUrl(url)
    } catch (error) {
      console.error('[CLONE] Error:', error)
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadZip = async () => {
    if (!cloneId) return

    try {
      setIsDownloading(true)
      setError(null)

      const response = await fetch(`/api/clones/${cloneId}/zip`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Falha ao gerar ZIP')
      }

      // Obter ZIP
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = 'nocry-clone.zip'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)
    } catch (error) {
      console.error('[CLONE] Download error:', error)
      setError(error instanceof Error ? error.message : 'Erro ao baixar ZIP')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleGoToEditor = () => {
    if (!cloneId) return
    router.push(`/ofertas/editor/${cloneId}`)
  }

  const handleNewClone = () => {
    setCloneId(null)
    setClonedUrl('')
    setUrl('')
    setError(null)
  }

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="w-full px-4 py-6 md:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="section-title text-3xl mb-2">NoCry Clone</h1>
          <p className="muted text-sm">Where originals fail, clones persist.</p>
        </div>

        {/* Control Panel */}
        {!cloneId && (
          <div className="card p-4 md:p-6 mb-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="subtitle block mb-2">URL da Landing Page</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="input w-full"
                  disabled={isLoading}
                />
              </div>
              <button
                onClick={handleClone}
                disabled={isLoading || !url.trim()}
                className="btn btn-primary"
              >
                {isLoading ? 'Clonando...' : 'Clonar'}
              </button>
            </div>
          </div>
        )}

        {/* Success Panel - Após clonagem */}
        {cloneId && (
          <div className="card p-4 md:p-6 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                <span className="text-green-500 text-lg">✓</span>
              </div>
              <div className="flex-1">
                <h3 className="subtitle text-base mb-1">Clonagem concluída!</h3>
                <p className="text-sm text-muted">
                  URL clonada: <span className="font-mono text-xs">{clonedUrl}</span>
                </p>
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleDownloadZip}
                disabled={isDownloading}
                className="btn btn-secondary"
              >
                {isDownloading ? 'Baixando...' : 'Baixar ZIP'}
              </button>
              <button
                onClick={handleGoToEditor}
                className="btn btn-primary"
              >
                Editar página
              </button>
              <button
                onClick={handleNewClone}
                className="btn btn-outline"
              >
                Nova clonagem
              </button>
            </div>
          </div>
        )}

        {/* Error Panel */}
        {error && (
          <div className="card p-4 bg-destructive/10 border-destructive/30">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
