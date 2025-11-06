'use client'

import { useState, useEffect } from 'react'
import { getSignedUrl } from '@/lib/files'
import { Button } from './button'

interface FileDisplayProps {
  fileKey: string
  label?: string
}

export function FileDisplay({ fileKey, label = 'Baixar' }: FileDisplayProps) {
  const [url, setUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUrl() {
      try {
        const signedUrl = await getSignedUrl(fileKey)
        setUrl(signedUrl)
      } catch (error) {
        console.error('Error loading signed URL:', error)
      } finally {
        setLoading(false)
      }
    }

    if (fileKey) {
      loadUrl()
    } else {
      setLoading(false)
    }
  }, [fileKey])

  if (!fileKey) return null
  if (loading) return <span className="text-xs text-muted-foreground">Carregando...</span>

  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <Button type="button" variant="outline" size="sm">
        {label}
      </Button>
    </a>
  )
}




