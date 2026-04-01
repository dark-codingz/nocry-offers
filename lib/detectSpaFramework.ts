/**
 * Detecta se o HTML é de uma página SPA/Next.js/React
 */
export function detectSpaFramework(html: string): boolean {
  const lower = html.toLowerCase()

  // Marcadores típicos de Next.js / React SPA
  if (lower.includes('id="__next"')) return true
  if (lower.includes('__next_data__')) return true
  if (lower.includes('/_next/static/')) return true
  if (lower.includes('data-reactroot')) return true
  if (lower.includes('react-dom')) return true
  if (lower.includes('__nextjs')) return true
  if (lower.includes('next.js')) return true
  if (lower.includes('nextjs')) return true

  // Verificar scripts do Next.js
  if (lower.includes('_next/static/chunks/')) return true
  if (lower.includes('_next/static/css/')) return true

  return false
}







