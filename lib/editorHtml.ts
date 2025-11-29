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

