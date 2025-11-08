/**
 * DuckDuckGo Search Provider (Fallback)
 * Scraping HTML do DuckDuckGo quando APIs pagas não estão disponíveis
 */

import * as cheerio from 'cheerio';

export interface DorkResult {
  title: string;
  link: string;
  snippet: string;
  source: 'ddg' | 'serpapi' | 'bing';
}

/**
 * Busca no DuckDuckGo via scraping HTML
 * @param query - Query de busca (ex: "inurl:example.com")
 * @param limit - Número máximo de resultados (padrão: 10)
 */
export async function searchDuckDuckGo(
  query: string,
  limit: number = 10
): Promise<DorkResult[]> {
  try {
    // DuckDuckGo HTML search endpoint
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo retornou status ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const results: DorkResult[] = [];

    // DuckDuckGo estrutura: .result, .result__title, .result__url, .result__snippet
    $('.result').each((_, element) => {
      if (results.length >= limit) {
        return false; // Para o loop
      }

      const $result = $(element);

      // Título e link
      const $title = $result.find('.result__title a');
      const title = $title.text().trim();
      const link = $title.attr('href') || '';

      // Snippet
      const snippet = $result.find('.result__snippet').text().trim();

      // Valida se tem dados mínimos
      if (title && link && link.startsWith('http')) {
        results.push({
          title,
          link,
          snippet,
          source: 'ddg',
        });
      }
    });

    return results;
  } catch (error: any) {
    console.error('[DuckDuckGo] Erro ao buscar:', error);
    throw new Error(`Falha ao buscar no DuckDuckGo: ${error.message}`);
  }
}

