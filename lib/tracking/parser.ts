/**
 * Parser para extrair número de anúncios da página da Meta Ads Library
 */

import type { TrackingScraperResponse } from './types'

/**
 * Extrai o número de anúncios do HTML da página da Ads Library
 * Procura por padrões como "~15 resultados", "~15 results", ">15 anúncios", etc.
 * Retorna null se não encontrar (não retorna 0 como fallback)
 */
export function extractAdsCount(html: string): number | null {
  // Padrões para buscar o número de anúncios (ordem de prioridade)
  const patterns = [
    // "~15 resultados" ou "~15 results" (mais comum)
    /~?\s*([\d,\.]+)\s+(?:resultados?|results?)/i,
    // "15 anúncios" ou "15 ads"
    /([\d,\.]+)\s+(?:anúncios?|anuncios?|ads?)\b/i,
    // ">15 anúncios" ou ">15 ads"
    />\s*([\d,\.]+)\s+(?:anúncios?|ads?)/i,
    // "15 resultados encontrados"
    /([\d,\.]+)\s+resultados?\s+encontrados?/i,
    // "Showing 15 results"
    /showing\s+([\d,\.]+)\s+results?/i,
    // "About 15 results" ou "Aproximadamente 15 resultados"
    /(?:about|aproximadamente|aprox\.?)\s+([\d,\.]+)\s+(?:results?|resultados?)/i,
    // Padrão numérico seguido de "ads" ou "anúncios" em qualquer lugar
    /\b([\d,\.]+)\s+(?:ads?|anúncios?|anuncios?)\b/i,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match && match[1]) {
      // Remove separadores de milhar (vírgulas e pontos)
      const raw = match[1].replace(/[,\.]/g, '').trim()
      const count = parseInt(raw, 10)
      
      if (!isNaN(count) && count >= 0 && count <= 10000) {
        // Limite razoável: máximo 10.000 anúncios
        return count
      }
    }
  }

  return null
}

/**
 * Faz fetch da URL da Ads Library e extrai o número de anúncios
 * Retorna null em ads_count se não conseguir extrair (não retorna 0)
 */
export async function fetchAdsCount(url: string): Promise<{
  success: true
  ads_count: number
  raw_html?: string
} | {
  success: false
  error: string
  status?: number
}> {
  try {
    // Validar URL
    if (!url || (!url.includes('facebook.com') && !url.includes('meta.com'))) {
      return {
        success: false,
        error: 'URL inválida. Deve ser uma URL da Meta Ads Library.',
      }
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return {
        success: false,
        error: 'URL da Ads Library inválida',
      }
    }

    console.log('[tracking] Iniciando fetch da Ads Library', {
      url: parsedUrl.toString(),
    })

    // Fazer fetch com headers adequados para parecer um browser real
    const response = await fetch(parsedUrl.toString(), {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        Referer: 'https://www.facebook.com/',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
      },
      // Timeout de 15 segundos
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      // Tentar ler o body para debug (mas não bloquear se falhar)
      let bodySnippet = ''
      try {
        const text = await response.text()
        bodySnippet = text.slice(0, 500)
      } catch {
        // Ignora erro ao ler body
      }

      console.error('[tracking] Erro ao buscar Ads Library', {
        url: parsedUrl.toString(),
        status: response.status,
        statusText: response.statusText,
        bodySnippet,
      })

      return {
        success: false,
        error: `Erro ao buscar página da Ads Library (status ${response.status})`,
        status: response.status,
      }
    }

    const html = await response.text()
    
    // Log do tamanho do HTML recebido
    console.log('[tracking] HTML recebido', {
      url: parsedUrl.toString(),
      htmlLength: html.length,
    })

    const adsCount = extractAdsCount(html)

    if (adsCount === null) {
      // Salvar um trecho do HTML para debug
      const excerpt = html.substring(0, 5000)
      
      // Tentar encontrar padrões numéricos próximos a palavras-chave
      const numberMatches = html.match(/\b(\d+)\b/g)?.slice(0, 10) || []
      
      console.warn('[tracking] Parser não encontrou ads_count', {
        url: parsedUrl.toString(),
        htmlLength: html.length,
        excerpt: excerpt.substring(0, 500),
        numbersFound: numberMatches,
      })

      return {
        success: false,
        error: 'Não foi possível encontrar o número de anúncios na página. A Meta pode ter mudado o layout.',
        status: 422,
      }
    }

    console.log('[tracking] Ads count extraído com sucesso', {
      url: parsedUrl.toString(),
      adsCount,
    })

    return {
      success: true,
      ads_count: adsCount,
      raw_html: html.substring(0, 10000), // Salvar primeiros 10KB para debug
    }
  } catch (error: any) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      console.error('[tracking] Timeout ao buscar Ads Library', {
        url,
      })
      return {
        success: false,
        error: 'Timeout ao buscar página. Tente novamente.',
      }
    }

    console.error('[tracking] Erro desconhecido ao buscar Ads Library', {
      url,
      error: error.message,
      errorName: error.name,
    })

    return {
      success: false,
      error: error.message || 'Erro desconhecido ao buscar página.',
    }
  }
}

/**
 * Chama a API externa de scraping para obter o número de anúncios
 * 
 * Requer a variável de ambiente TRACKING_SCRAPER_URL configurada no .env.local:
 * TRACKING_SCRAPER_URL=http://198.1.195.57:8000/scrape/url
 * 
 * @param url URL da Ads Library
 * @returns Resultado com ads_count ou erro
 */
export async function fetchAdsCountFromScraper(url: string): Promise<{
  success: true
  ads_count: number
  raw_total_resultados: string
  timestamp: string
} | {
  success: false
  error: string
  status?: number
}> {
  try {
    const scraperUrl = process.env.TRACKING_SCRAPER_URL

    if (!scraperUrl) {
      return {
        success: false,
        error: 'TRACKING_SCRAPER_URL não configurada',
        status: 500,
      }
    }

    // Validar URL
    if (!url || (!url.includes('facebook.com') && !url.includes('meta.com'))) {
      return {
        success: false,
        error: 'URL inválida. Deve ser uma URL da Meta Ads Library.',
        status: 400,
      }
    }

    console.log('[tracking] Chamando API externa de scraping', {
      scraperUrl,
      adsLibraryUrl: url,
    })

    // Chamar API externa
    const response = await fetch(scraperUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
      // Timeout de 30 segundos
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      let errorMessage = `Erro ao chamar scraper (status ${response.status})`
      
      try {
        const errorBody = await response.text()
        if (errorBody) {
          errorMessage = `Erro ao chamar scraper: ${errorBody.substring(0, 200)}`
        }
      } catch {
        // Ignora erro ao ler body
      }

      console.error('[tracking] Erro na resposta do scraper', {
        status: response.status,
        statusText: response.statusText,
        url,
      })

      return {
        success: false,
        error: errorMessage,
        status: response.status >= 400 && response.status < 500 ? response.status : 502,
      }
    }

    // Parsear resposta JSON
    let data: TrackingScraperResponse
    try {
      data = await response.json()
    } catch (parseError) {
      console.error('[tracking] Erro ao parsear JSON do scraper', {
        error: parseError,
        url,
      })
      return {
        success: false,
        error: 'Resposta inválida do scraper (não é JSON)',
        status: 502,
      }
    }

    // Validar campos obrigatórios
    if (!data.total_resultados) {
      console.error('[tracking] Resposta do scraper sem total_resultados', {
        data,
        url,
      })
      return {
        success: false,
        error: 'Resposta do scraper sem campo total_resultados',
        status: 422,
      }
    }

    // Extrair número de anúncios de total_resultados
    // Pode vir como "~3 results", "~15 resultados", "3 results", etc.
    const numberMatch = data.total_resultados.match(/\d+/)
    
    if (!numberMatch) {
      console.error('[tracking] Não conseguiu extrair número de total_resultados', {
        total_resultados: data.total_resultados,
        url,
      })
      return {
        success: false,
        error: 'Não consegui encontrar o número de anúncios na resposta do scraper',
        status: 422,
      }
    }

    const adsCount = parseInt(numberMatch[0], 10)

    if (isNaN(adsCount) || adsCount < 0) {
      console.error('[tracking] Número de anúncios inválido', {
        adsCount,
        total_resultados: data.total_resultados,
        url,
      })
      return {
        success: false,
        error: 'Número de anúncios inválido extraído da resposta',
        status: 422,
      }
    }

    console.log('[tracking] Ads count extraído com sucesso do scraper', {
      url,
      adsCount,
      total_resultados: data.total_resultados,
      timestamp: data.timestamp,
    })

    return {
      success: true,
      ads_count: adsCount,
      raw_total_resultados: data.total_resultados,
      timestamp: data.timestamp || new Date().toISOString(),
    }
  } catch (error: any) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      console.error('[tracking] Timeout ao chamar scraper', {
        url,
      })
      return {
        success: false,
        error: 'Timeout ao chamar scraper. Tente novamente.',
        status: 502,
      }
    }

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error('[tracking] Erro de conexão ao chamar scraper', {
        url,
        error: error.message,
      })
      return {
        success: false,
        error: 'Erro de conexão ao chamar scraper. Verifique se a API está acessível.',
        status: 502,
      }
    }

    console.error('[tracking] Erro desconhecido ao chamar scraper', {
      url,
      error: error.message,
      errorName: error.name,
    })

    return {
      success: false,
      error: error.message || 'Erro desconhecido ao chamar scraper.',
      status: 500,
    }
  }
}
