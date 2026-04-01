import { load } from 'cheerio'

/**
 * Cria uma versão estática editável de HTML de SPA/Next.js
 * Remove scripts do framework para permitir edição visual estável
 */
export function createEditableStaticHtmlFromSpa(html: string): string {
  const $ = load(html)

  // 1) Remover scripts Next/React específicos no <head>
  $('head script').each((_, el) => {
    const $el = $(el)
    const src = $el.attr('src') || ''
    const id = $el.attr('id') || ''
    const text = $el.text() || ''

    const isNextScript =
      src.includes('/_next/') ||
      src.includes('__next') ||
      id.toLowerCase().includes('__next_data__') ||
      id.toLowerCase().includes('__next') ||
      text.includes('__next') ||
      text.includes('next.js') ||
      text.includes('react-dom') ||
      text.includes('__NEXT_DATA__')

    if (isNextScript) {
      $el.remove()
      return
    }
  })

  // 2) Remover TODOS os <script> dentro de <body> (scripts do framework)
  $('body script').each((_, el) => {
    const $el = $(el)
    const src = $el.attr('src') || ''
    const text = $el.text() || ''
    
    // Manter apenas scripts inline que não sejam do framework
    // Remover todos os scripts com src (geralmente são do framework)
    if (src) {
      $el.remove()
      return
    }
    
    // Remover scripts inline que contenham código do framework
    if (
      text.includes('__next') ||
      text.includes('next.js') ||
      text.includes('react-dom') ||
      text.includes('__NEXT_DATA__') ||
      text.includes('ReactDOM') ||
      text.includes('hydrate')
    ) {
      $el.remove()
    }
  })

  // 3) Remover pixels/analytics conhecidos que podem interferir
  $('script').each((_, el) => {
    const $el = $(el)
    const src = $el.attr('src') || ''
    const text = $el.text() || ''

    const isAnalytics =
      src.includes('connect.facebook.net') ||
      src.includes('google-analytics.com') ||
      src.includes('googletagmanager.com') ||
      src.includes('analytics') ||
      text.includes('fbq') ||
      text.includes('gtag') ||
      text.includes('ga(')

    if (isAnalytics) {
      $el.remove()
    }
  })

  return $.html()
}

