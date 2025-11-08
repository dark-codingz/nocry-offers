'use client'

import { useState } from 'react'

export default function ClonePage() {
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClone = async () => {
    if (!url.trim()) {
      alert('Por favor, insira uma URL')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Falha ao clonar página')
      }

      // Obter ZIP
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = 'cloned-page.zip'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)

      alert('Página clonada com sucesso!')
      setUrl('')
    } catch (error) {
      console.error('[CLONE] Error:', error)
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
      alert(error instanceof Error ? error.message : 'Falha ao clonar página')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="w-full px-4 py-6 md:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="section-title text-3xl mb-2">NoCry Clone</h1>
          <p className="muted text-sm">Where originals fail, clones persist.</p>
        </div>

        {/* Control Panel */}
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

        {error && (
          <div className="card p-4 bg-destructive/10 border-destructive/30">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
