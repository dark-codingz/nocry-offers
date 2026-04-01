/**
 * Funções para limpar HTML antes de exportar para ZIP
 */

/**
 * Remove todas as tags <base> do HTML
 */
export function stripBaseHref(html: string): string {
  return html.replace(/<base[^>]*>/gi, '')
}

/**
 * Remove o script do editor identificado por id="nocry-editor-script"
 */
export function stripEditorScript(html: string): string {
  return html.replace(
    /<script[^>]*id=["']nocry-editor-script["'][^>]*>[\s\S]*?<\/script>/gi,
    ''
  )
}

/**
 * Limpa HTML para exportação (remove <base> e script do editor)
 */
export function cleanHtmlForExport(html: string): string {
  let out = stripBaseHref(html)
  out = stripEditorScript(out)
  return out
}

/**
 * Corrige URLs de imagens Next.js (_next/image) para URLs diretas
 * Transforma src="/_next/image?url=..." em src="https://dominio.com/imagem.png"
 */
export function fixNextImageUrls(html: string, originalUrl: string): string {
  try {
    const origin = new URL(originalUrl).origin

    // 1) Corrigir src="/_next/image?..."
    html = html.replace(
      /src="\/_next\/image\?([^"]+)"/g,
      (match, qs) => {
        try {
          // Normalizar &amp; -> &
          const normalizedQs = qs.replace(/&amp;/g, '&')

          const params = new URLSearchParams(normalizedQs)
          const encoded = params.get('url')
          if (!encoded) return match

          let real = decodeURIComponent(encoded) // ex: "/logo.png" ou "https://.../logo.png"
          if (real.startsWith('/')) {
            real = origin + real
          }

          return `src="${real}"`
        } catch {
          return match
        }
      }
    )

    // 2) Corrigir srcset="/_next/image?..." (substitui por src simples)
    html = html.replace(
      /srcset="\/_next\/image\?([^"]+)"/g,
      (match, qs) => {
        try {
          // Normalizar &amp; -> &
          const normalizedQs = qs.replace(/&amp;/g, '&')

          const params = new URLSearchParams(normalizedQs)
          const encoded = params.get('url')
          if (!encoded) return match

          let real = decodeURIComponent(encoded)
          if (real.startsWith('/')) {
            real = origin + real
          }

          // Substitui o srcset inteiro por um src simples (mais seguro)
          return `src="${real}"`
        } catch {
          return match
        }
      }
    )

    return html
  } catch {
    // Se der erro ao processar, retorna HTML original
    return html
  }
}



