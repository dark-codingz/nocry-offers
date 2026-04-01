/**
 * Detecção de scripts de tracking (Pixels) em HTML
 * 
 * Detecta:
 * - Meta Pixel (Facebook)
 * - UTMify Pixel
 */

export interface DetectedPixels {
  metaPixelId: string | null // Apenas o ID (ex: 1367698035025270)
  utmifyScript: string | null // O bloco <script> inteiro completo
}

/**
 * Detecta scripts de tracking no HTML da página
 * 
 * @param htmlContent HTML bruto da página (string)
 * @returns Objeto com os resultados encontrados
 */
export function detectTrackingScripts(htmlContent: string): DetectedPixels {
  const result: DetectedPixels = {
    metaPixelId: null,
    utmifyScript: null,
  }

  // ==========================================
  // 1. DETECÇÃO DO META PIXEL (Facebook)
  // ==========================================
  // Regex robusta para capturar o ID após fbq('init', ou fbq("init",
  // Suporta:
  // - fbq('init', 'ID')
  // - fbq("init", "ID")
  // - fbq('init', "ID")
  // - fbq("init", 'ID')
  // - fbq('init','ID') (sem espaços, código minificado)
  // - Com ou sem espaços
  // - ID geralmente é numérico (10+ dígitos), mas pode ser alfanumérico
  
  // Padrão principal: captura fbq('init', 'ID') ou fbq("init", "ID")
  // Aceita espaços opcionais e diferentes tipos de aspas
  // O ID é capturado no grupo 1
  const metaPixelPattern = /fbq\s*\(\s*['"]init['"]\s*,\s*['"]([^'"]+)['"]\s*\)/gi

  // Tenta encontrar o match
  let metaMatch: RegExpMatchArray | null = null
  const matches = htmlContent.matchAll(metaPixelPattern)
  
  for (const match of matches) {
    if (match && match[1]) {
      const pixelId = match[1].trim()
      // Valida se o ID parece válido (geralmente 10+ dígitos numéricos)
      // Mas aceita também IDs alfanuméricos se tiverem pelo menos 10 caracteres
      if (pixelId.length >= 10 && /^[a-zA-Z0-9]+$/.test(pixelId)) {
        metaMatch = match
        break
      }
    }
  }

  if (metaMatch && metaMatch[1]) {
    result.metaPixelId = metaMatch[1].trim()
  }

  // ==========================================
  // 2. DETECÇÃO DO UTMIFY PIXEL
  // ==========================================
  // Precisamos capturar o bloco <script> completo que contém:
  // - window.pixelId = "..."
  // - E/ou referência a cdn.utmify.com.br/scripts/pixel/pixel.js
  // 
  // O script pode estar formatado de várias formas:
  // - Com quebras de linha
  // - Minificado
  // - Com espaços variados
  
  // Regex para encontrar o bloco <script> completo (não-greedy para pegar cada script separadamente)
  // Captura a tag de abertura completa com todos os atributos e o conteúdo até a tag de fechamento
  // Usa [\s\S]*? para capturar qualquer conteúdo incluindo quebras de linha
  const scriptTagPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi
  
  const allScripts = htmlContent.matchAll(scriptTagPattern)
  
  for (const scriptMatch of allScripts) {
    if (!scriptMatch || !scriptMatch[0]) continue
    
    const fullScriptTag = scriptMatch[0] // Tag completa <script>...</script>
    const scriptContent = scriptMatch[1] || '' // Conteúdo interno do script
    
    // Verifica se contém window.pixelId ou referência ao pixel.js da utmify
    const hasPixelId = /window\.pixelId\s*=\s*["'][^"']+["']/i.test(scriptContent)
    const hasUtmifyPixel = /cdn\.utmify\.com\.br\/scripts\/pixel\/pixel\.js/i.test(scriptContent)
    
    if (hasPixelId || hasUtmifyPixel) {
      // Retorna o bloco <script> completo, preservando exatamente como estava no HTML original
      result.utmifyScript = fullScriptTag
      break // Pega o primeiro que encontrar
    }
  }

  return result
}

