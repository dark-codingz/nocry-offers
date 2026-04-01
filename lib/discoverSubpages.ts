import { load } from 'cheerio'

export interface SubpageLink {
  originalUrl: string
  path: string
}

/**
 * Normaliza a estrutura do path removendo IDs e mantendo apenas a estrutura base
 * Ex: /product/687ea04cfcc65d99d7010c56/687ea04cfcc65d99d7010c5a/687ea04cfcc65d99d7010c64/index.htm -> /product
 * Ex: /shop/681aaff4852ac923b1bcabfb/cart.html -> /shop/cart
 * Ex: /shop/681aaff4852ac923b1bcabfb/681aaff4852ac923b1bcabfc/cart.html -> /shop/cart
 */
function normalizePathStructure(pathname: string): string {
  if (!pathname || pathname === '/') return '/'

  // Remover extensões comuns (.html, .htm, .php, etc)
  pathname = pathname.replace(/\.(html|htm|php|aspx|jsp)$/i, '')

  // Remover index no final
  if (pathname.endsWith('/index')) {
    pathname = pathname.slice(0, -6) // Remove '/index'
  }

  // Quebrar em segmentos
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return '/'

  // IDs geralmente são strings hexadecimais longas (24+ caracteres)
  // ou UUIDs (32 caracteres com hífens)
  const isLikelyId = (segment: string): boolean => {
    // UUID format: 8-4-4-4-12 (32 chars total)
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
      return true
    }
    // Hex string longo (24+ caracteres)
    if (/^[0-9a-f]{24,}$/i.test(segment)) {
      return true
    }
    // String alfanumérica muito longa (20+ caracteres) provavelmente é ID
    if (/^[0-9a-zA-Z]{20,}$/.test(segment)) {
      return true
    }
    return false
  }

  // Filtrar segmentos que são IDs
  const filteredSegments = segments.filter(seg => !isLikelyId(seg))

  // Se sobrou apenas 1 segmento, retornar /segmento
  if (filteredSegments.length === 1) {
    return `/${filteredSegments[0]}`
  }

  // Se sobrou 2+ segmentos, pegar primeiro e último (ex: /shop/cart)
  if (filteredSegments.length >= 2) {
    return `/${filteredSegments[0]}/${filteredSegments[filteredSegments.length - 1]}`
  }

  // Fallback: retornar path original se não conseguir normalizar
  return pathname
}

/**
 * Descobre links internos em uma página HTML que podem ser clonados como subpáginas
 * @param html - HTML da página principal
 * @param baseUrl - URL base da página principal
 * @param max - Número máximo de subpáginas a retornar (padrão: 15)
 * @returns Lista de links internos encontrados
 */
export function discoverSubpageLinks(
  html: string,
  baseUrl: string,
  max: number = 15
): SubpageLink[] {
  try {
    const base = new URL(baseUrl)
    const origin = base.origin
    let basePathname = base.pathname || '/'
    
    // Normalizar basePathname de forma consistente
    if (basePathname !== '/' && basePathname.endsWith('/')) {
      basePathname = basePathname.slice(0, -1)
    }
    if (!basePathname) {
      basePathname = '/'
    }

    // Parse HTML
    const $ = load(html)

    // Set para evitar duplicatas
    const foundPaths = new Set<string>()
    const links: SubpageLink[] = []

    // Protocolos/prefixos a ignorar
    const ignoredProtocols = [
      'mailto:',
      'tel:',
      'javascript:',
      '#',
      'whatsapp:',
      'sms:',
      'ftp:',
      'data:',
    ]

    // Selecionar todos os links <a> com href
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href')
      if (!href) return

      const trimmed = href.trim()
      if (!trimmed) return

      // Ignorar protocolos especiais
      if (ignoredProtocols.some((proto) => trimmed.toLowerCase().startsWith(proto))) {
        return
      }

      try {
        // Resolver URL (cuida de path relativo)
        const resolved = new URL(trimmed, base)

        // Só mesmo domínio
        if (resolved.origin !== origin) {
          return
        }

        // Normalizar pathname de forma consistente
        let pathname = resolved.pathname || '/'
        
        // Remover trailing slash (exceto se for só "/")
        if (pathname !== '/' && pathname.endsWith('/')) {
          pathname = pathname.slice(0, -1)
        }

        // Se pathname vazio, normalizar para "/"
        if (!pathname) {
          pathname = '/'
        }

        // Normalizar path removendo IDs e mantendo apenas estrutura base
        // Ex: /product/ID/ID/index.htm -> /product
        // Ex: /shop/ID/cart.html -> /shop/cart
        // Ex: /shop/ID/ID/cart.html -> /shop/cart
        pathname = normalizePathStructure(pathname)

        // Normalizar basePathname também para comparação consistente (também remover IDs)
        let normalizedBasePath = normalizePathStructure(basePathname || '/')

        // Ignorar a própria página atual (não apenas root)
        if (pathname === normalizedBasePath || (pathname === '/' && normalizedBasePath === '/')) {
          return
        }

        // Ignorar se já foi encontrado
        if (foundPaths.has(pathname)) {
          return
        }

        // Adicionar à lista
        foundPaths.add(pathname)
        links.push({
          originalUrl: resolved.toString(),
          path: pathname,
        })
      } catch {
        // Ignorar URLs inválidas
        return
      }
    })

    // Ordenar por ordem de aparição (já está na ordem do DOM)
    // Limitar a max itens
    return links.slice(0, max)
  } catch (error) {
    console.error('[DISCOVER_SUBPAGES] Error:', error)
    return []
  }
}

