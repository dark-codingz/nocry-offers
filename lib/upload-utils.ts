/**
 * Utilitários para upload de arquivos
 */

/**
 * Remove acentos e caracteres especiais, converte para slug
 */
export function slugifyBase(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .toLowerCase()
}

/**
 * Extrai extensão de um arquivo
 */
export function extFromFile(file: File): string {
  const nameParts = file.name.split('?')[0]?.split('#')[0]
  if (!nameParts) return ''
  const lastDot = nameParts.lastIndexOf('.')
  return lastDot >= 0 ? nameParts.substring(lastDot + 1).toLowerCase() : ''
}

/**
 * Deriva formato do arquivo baseado na extensão
 */
export function deriveFormatFromExt(name: string): string {
  const parts = name.split('.')
  const ext = parts.length > 0 ? (parts[parts.length - 1]?.toLowerCase() || '') : ''
  if (['mp4', 'mov', 'webm', 'm4v', 'avi', 'mkv'].includes(ext)) return 'Vídeo'
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'Imagem'
  if (ext === 'pdf') return 'PDF'
  if (['zip', 'rar', '7z'].includes(ext)) return 'ZIP'
  return 'Arquivo'
}



