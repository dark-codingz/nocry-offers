/**
 * Detecta o tipo de arquivo a partir de URL, MIME ou formato
 */
export function detectFileType(
  url?: string | null,
  mimeOrFormat?: string | null
): 'video' | 'image' | 'pdf' | 'zip' | 'file' {
  const src = (url || '').toLowerCase()
  const hint = (mimeOrFormat || '').toLowerCase()
  const urlParts = src.split('?')[0]?.split('#')[0]?.split('.') || []
  const ext = urlParts.length > 0 ? (urlParts[urlParts.length - 1] || '') : ''

  if (hint.includes('video') || ['mp4', 'mov', 'webm', 'm4v', 'avi', 'mkv'].includes(ext))
    return 'video'
  if (hint.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext))
    return 'image'
  if (hint.includes('pdf') || ext === 'pdf') return 'pdf'
  if (['zip', 'rar', '7z'].includes(ext)) return 'zip'
  return 'file'
}

/**
 * Retorna ícone baseado no tipo de arquivo
 */
export function getFileIcon(type: string): string {
  const icons: Record<string, string> = {
    video: '🎥',
    image: '🖼️',
    pdf: '📄',
    zip: '📦',
    file: '📁',
  }
  return icons[type] || '📁'
}

/**
 * Retorna label formatado baseado no tipo
 */
export function getFileTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    video: 'VÍDEO',
    image: 'IMAGEM',
    pdf: 'PDF',
    zip: 'ZIP',
    file: 'ARQUIVO',
  }
  return labels[type] || 'ARQUIVO'
}

/**
 * Remove caracteres inválidos de nomes de arquivo
 */
export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

/**
 * Resolve URL para preview (garante que seja acessível, gerando signed se necessário)
 */
export async function resolvePreviewUrl(rawUrl: string): Promise<string> {
  if (!rawUrl) return ''
  
  const { ensureAccessibleUrl } = await import('./signed-url')
  return ensureAccessibleUrl(rawUrl)
}

/**
 * Baixa um arquivo de forma inteligente (funciona com pública, signed e externo)
 */
export async function downloadFileSmart(rawUrl: string, filename?: string) {
  const { ensureAccessibleUrl } = await import('./signed-url')
  const url = await ensureAccessibleUrl(rawUrl)
  
  const a = document.createElement('a')
  a.href = url
  a.download = filename ? sanitizeFileName(filename) : ''
  a.target = '_blank'
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

