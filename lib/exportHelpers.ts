/**
 * Helpers para exportação de múltiplas páginas em ZIP
 */

export interface ExportPage {
  id: string
  originalUrl: string
  path: string
  filename: string
  html: string
}

/**
 * Converte um path em nome de arquivo para o ZIP
 * @param path - Path da página (ex: "/", "/produto", "/produto/detalhes")
 * @returns Nome do arquivo (ex: "index.html", "produto.html", "produto-detalhes.html")
 */
export function filenameForPath(path: string): string {
  if (!path || path === '/') {
    return 'index.html'
  }

  // Remove query/fragment se vierem grudados (só por segurança)
  const qIndex = path.indexOf('?')
  const hashIndex = path.indexOf('#')
  const validIndices = [qIndex, hashIndex].filter((i) => i > -1).sort((a, b) => a - b)
  
  if (validIndices.length > 0) {
    const cutIndex = validIndices[0]
    if (cutIndex !== undefined && cutIndex > -1) {
      path = path.slice(0, cutIndex)
    }
  }

  // Garantir que comece com "/"
  if (!path.startsWith('/')) {
    path = '/' + path
  }

  // Tira slash final (menos se for só "/")
  if (path !== '/' && path.endsWith('/')) {
    path = path.slice(0, -1)
  }

  // Quebra em segmentos e junta com "-"
  const segments = path.split('/').filter(Boolean) // ex: [ "shop", "cart" ]
  if (segments.length === 0) {
    return 'index.html'
  }

  const base = segments.join('-') // "shop-cart"

  return `${base}.html`
}

/**
 * Reescreve links internos no HTML para apontar para arquivos locais do ZIP
 * @param html - HTML da página
 * @param pages - Lista de todas as páginas do clone
 * @param origin - Origin da URL original (ex: "https://deepgram.online")
 * @returns HTML com links reescritos
 */
export function rewriteInternalLinks(
  html: string,
  pages: ExportPage[],
  origin: string
): string {
  let result = html

  // Para cada página, substituir links que apontam para ela
  for (const page of pages) {
    const path = page.path || '/'
    const filename = page.filename

    const patterns: string[] = []

    if (path === '/' || path === '') {
      // Root: só mexe em href="/" e href="origin[/]"
      patterns.push(`href="/"`)
      patterns.push(`href="${origin}/"`)
      patterns.push(`href="${origin}"`)
      patterns.push(`href='/'`)
      patterns.push(`href='${origin}/'`)
      patterns.push(`href='${origin}'`)
    } else {
      // Subpáginas: mexe em href="/produto", href="/produto/", href="origin/produto", href="origin/produto/"
      patterns.push(`href="${path}"`)
      patterns.push(`href="${path}/"`)
      patterns.push(`href="${origin}${path}"`)
      patterns.push(`href="${origin}${path}/"`)
      patterns.push(`href='${path}'`)
      patterns.push(`href='${path}/'`)
      patterns.push(`href='${origin}${path}'`)
      patterns.push(`href='${origin}${path}/'`)
      
      // Extrair primeiro segmento do path para capturar links com IDs
      // Ex: path="/shop/cart" -> slugBase="shop", lastSegment="cart"
      // Isso captura links como "/shop/681aaff4852ac923b1bcabfb/cart.html"
      const segments = path.split('/').filter(Boolean)
      if (segments.length > 0) {
        const slugBase = segments[0]!
        const lastSegment = segments[segments.length - 1]!
        const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const escapedOrigin = origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        
        // Padrão para links com query strings ou fragments no path exato
        // Ex: href="/shop/cart?utm=..." ou href="/shop/cart#section"
        const pathWithQueryRegex = new RegExp(
          `href=(["'])${escapedPath}(?:\\?|#)[^"']*\\1`,
          'gi'
        )
        const originPathWithQueryRegex = new RegExp(
          `href=(["'])${escapedOrigin}${escapedPath}(?:\\?|#)[^"']*\\1`,
          'gi'
        )
        
        // Padrão para links com IDs no path (ex: /shop/ID/cart.html)
        // Captura qualquer coisa entre o slugBase e o último segmento
        // Ex: /shop/681aaff4852ac923b1bcabfb/cart.html -> shop-681aaff4852ac923b1bcabfb-cart.html
        let lastSegmentClean = lastSegment
        if (lastSegmentClean.includes('.')) {
          lastSegmentClean = lastSegmentClean.split('.')[0]! // Remove extensão se houver
        }
        
        const pathWithIdRegex = new RegExp(
          `href=(["'])/?${slugBase}/[^"']*${lastSegmentClean}[^"']*\\.html[^"']*\\1`,
          'gi'
        )
        const originPathWithIdRegex = new RegExp(
          `href=(["'])${escapedOrigin}/?${slugBase}/[^"']*${lastSegmentClean}[^"']*\\.html[^"']*\\1`,
          'gi'
        )
        
        result = result.replace(pathWithQueryRegex, (match, quote) => {
          return `href=${quote}${filename}${quote}`
        })
        result = result.replace(originPathWithQueryRegex, (match, quote) => {
          return `href=${quote}${filename}${quote}`
        })
        result = result.replace(pathWithIdRegex, (match, quote) => {
          return `href=${quote}${filename}${quote}`
        })
        result = result.replace(originPathWithIdRegex, (match, quote) => {
          return `href=${quote}${filename}${quote}`
        })
      }
    }

    for (const pattern of patterns) {
      // Usar split().join() para substituir todas as ocorrências de forma segura
      result = result.split(pattern).join(`href="${filename}"`)
    }
  }

  return result
}

/**
 * Reescreve links legados que apontam para caminhos com IDs e index.htm
 * Ex: href="product/687ea04cfcc65d99d7010c56/687ea04cfcc65d99d7010c5a/index.htm?utm=..."
 *     → href="product.html"
 * @param html - HTML da página
 * @param pages - Lista de todas as páginas do clone
 * @returns HTML com links legados reescritos
 */
export function rewriteLegacyHtmlAssetLinks(html: string, pages: ExportPage[]): string {
  let result = html

  for (const p of pages) {
    const path = p.path || '/'
    const filename = p.filename

    if (path === '/' || path === '') {
      // Root normalmente não gera esses caminhos de pasta/id, pode pular
      continue
    }

    // Exemplo: path "/product" -> slugBase "product"
    // path "/shop/cart" -> slugBase "shop", lastSegment "cart"
    // path "/shop/681aaff4852ac923b1bcabfb/cart.html" -> slugBase "shop", lastSegment "cart"
    const segments = path.split('/').filter(Boolean)
    if (segments.length === 0) continue
    const slugBase = segments[0]! // "product", "shop", etc.
    // Pegar o último segmento sem extensão (ex: "cart" de "cart.html" ou "cart")
    let lastSegment = segments[segments.length - 1]!
    if (lastSegment.includes('.')) {
      lastSegment = lastSegment.split('.')[0]! // Remove extensão
    }

    // Regex para detectar vários padrões de links legados:
    // - href="product/.../index.htm" (com ou sem slash inicial)
    // - href="/product/.../index.htm"
    // - href="product/.../index.htm?qualquer_coisa"
    // - href='product/.../index.htm' (aspas simples)
    // - href="product-...-index.htm.html" (com IDs no nome)
    // - href="product-687ea04cfcc65d99d7010c56-687ea04cfcc65d99d7010c5a-index.htm.html"
    // - href="file:///C:/shop/.../cart.html" (caminhos absolutos)
    // - href="/shop/681aaff4852ac923b1bcabfb/cart.html" (path com IDs no meio)
    // Captura o tipo de aspas usado para manter consistência
    const patterns = [
      // Padrão 1: product/.../index.htm (com ou sem slash inicial)
      new RegExp(`href=(["'])/?${slugBase}/[^"']*?index\\.htm[^"']*\\1`, 'gi'),
      // Padrão 2: product-...-index.htm.html (com IDs no nome, com ou sem slash inicial)
      new RegExp(`href=(["'])/?${slugBase}-[^"']*?-index\\.htm\\.html[^"']*\\1`, 'gi'),
      // Padrão 3: product-...-index.htm (sem .html no final, com IDs)
      new RegExp(`href=(["'])/?${slugBase}-[^"']*?-index\\.htm[^"']*\\1`, 'gi'),
      // Padrão 4: /shop/ID/cart.html ou /shop/ID/ID/cart.html (path com IDs no meio)
      // Captura qualquer coisa entre slugBase e lastSegment, terminando com .html
      // Também captura sem extensão explícita (ex: /shop/ID/cart)
      new RegExp(`href=(["'])/?${slugBase}/[^"']*${lastSegment}(?:\\.html)?[^"']*\\1`, 'gi'),
      // Padrão 5: file:///C:/shop/.../cart.html (caminhos absolutos do sistema)
      new RegExp(`href=(["'])file:///[^"']*?/${slugBase}[^"']*${lastSegment}[^"']*\\.html[^"']*\\1`, 'gi'),
      // Padrão 6: file:///C:/shop/.../cart.html (sem barra antes do slugBase)
      new RegExp(`href=(["'])file:///[^"']*?${slugBase}[^"']*${lastSegment}[^"']*\\.html[^"']*\\1`, 'gi'),
      // Padrão 7: file:///shop/.../cart.html (sem drive)
      new RegExp(`href=(["'])file:///${slugBase}[^"']*${lastSegment}[^"']*\\.html[^"']*\\1`, 'gi'),
    ]

    for (const regex of patterns) {
      result = result.replace(regex, (match, quote) => {
        // match é algo tipo: href="product/ids/ids/index.htm?utm=..." ou href='product/...'
        // quote é o tipo de aspas capturado pelo grupo 1 (" ou ')
        return `href=${quote}${filename}${quote}`
      })
    }
  }

  return result
}

/**
 * Remove links com file:// e caminhos absolutos do sistema de arquivos
 * Converte para caminhos relativos corretos
 */
export function rewriteFileProtocolLinks(html: string, pages: ExportPage[]): string {
  let result = html

  // Remover todos os links file:// que apontam para páginas do clone
  for (const p of pages) {
    const path = p.path || '/'
    const filename = p.filename

    if (path === '/' || path === '') {
      continue
    }

    const segments = path.split('/').filter(Boolean)
    if (segments.length === 0) continue
    const slugBase = segments[0]!
    let lastSegment = segments[segments.length - 1]!
    // Remover extensão se houver (ex: "cart.html" -> "cart")
    if (lastSegment.includes('.')) {
      lastSegment = lastSegment.split('.')[0]!
    }

    // Padrões para file://:
    // - file:///C:/.../shop/.../cart.html
    // - file:///C:/shop/.../cart.html
    // - file:///shop/.../cart.html
    const patterns = [
      // Padrão 1: file:///C:/.../shop/.../cart.html (com barra antes do slugBase)
      new RegExp(
        `href=(["'])file:///[^"']*?/${slugBase}[^"']*${lastSegment}[^"']*\\.html[^"']*\\1`,
        'gi'
      ),
      // Padrão 2: file:///C:/shop/.../cart.html (sem barra extra, slugBase direto)
      new RegExp(
        `href=(["'])file:///[^"']*?${slugBase}[^"']*${lastSegment}[^"']*\\.html[^"']*\\1`,
        'gi'
      ),
      // Padrão 3: file:///shop/.../cart.html (sem drive)
      new RegExp(
        `href=(["'])file:///${slugBase}[^"']*${lastSegment}[^"']*\\.html[^"']*\\1`,
        'gi'
      ),
    ]

    for (const regex of patterns) {
      result = result.replace(regex, (match, quote) => {
        return `href=${quote}${filename}${quote}`
      })
    }
  }

  return result
}

