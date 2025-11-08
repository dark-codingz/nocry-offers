/**
 * API Route: /api/dorks
 * Busca web usando SerpAPI com duas queries complementares: site: e inurl:
 * 
 * IMPORTANTE:
 * - Configure SERPAPI_KEY no .env.local (ou Environment Variables da Vercel em produção)
 * - Este endpoint usa cache via lib/cache.ts (TTL configurável via CACHE_TTL)
 * - Implementa retry automático com backoff exponencial em caso de rate limit (429)
 * - Faz duas queries em paralelo: site:{domain} e inurl:{domain}/
 * - Usa inurl:{domain}/ com barra para forçar páginas com paths (não apenas homepage)
 * - Deduplicação prioriza links com path sobre links sem path
 * 
 * Observação sobre cota: Use cache sempre e não abuse de num=100 repetidamente.
 * Para paginação, use o parâmetro start (ex: start=0, start=100, start=200).
 * 
 * Runtime: Node.js
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCache, setCache, cacheKey } from '@/lib/cache';
import { extractDomain } from '@/lib/domain';

// Força runtime Node.js
export const runtime = 'nodejs';

// Schema de validação
const DomainOrQuerySchema = z
  .string()
  .min(1, 'Domain ou query não pode estar vazio')
  .max(500, 'Domain ou query muito longo');

const StartSchema = z
  .string()
  .optional()
  .transform((val) => (val ? parseInt(val, 10) : 0))
  .pipe(z.number().int().min(0));

interface SerpApiResult {
  link?: string;
  url?: string;
  displayed_link?: string;
  source?: string;
  title?: string;
  snippet?: string;
  additional_links?: Array<{ link?: string }>;
  inline_links?: Array<{ link?: string }>;
  rich_snippet?: {
    top?: { link?: { url?: string } };
    bottom?: { link?: { url?: string } };
  };
  related_pages?: Array<{ link?: string }>;
  [key: string]: any;
}

interface SerpApiResponse {
  organic_results?: SerpApiResult[];
  organic?: SerpApiResult[];
  top_results?: SerpApiResult[];
  error?: string;
  [key: string]: any;
}

interface DorkResult {
  title: string | null;
  link: string | null;
  snippet: string | null;
  source: 'serpapi';
}

interface ApiResponse {
  domain: string;
  queries: string[];
  count: number;
  results: DorkResult[];
}

/**
 * Extrai URL de um resultado da SerpAPI checando vários campos possíveis
 * Prioriza links completos com path sobre links sem path
 */
function extractUrlFromResult(result: SerpApiResult): string | null {
  // Lista de campos candidatos para URL (em ordem de prioridade)
  const candidates: (string | undefined)[] = [
    result.link,
    result.url,
    result.displayed_link,
    result.source,
  ];

  // Checa campos aninhados
  if (result.additional_links) {
    for (const item of result.additional_links) {
      if (item.link) candidates.push(item.link);
    }
  }

  if (result.inline_links) {
    for (const item of result.inline_links) {
      if (item.link) candidates.push(item.link);
    }
  }

  if (result.rich_snippet?.top?.link?.url) {
    candidates.push(result.rich_snippet.top.link.url);
  }

  if (result.rich_snippet?.bottom?.link?.url) {
    candidates.push(result.rich_snippet.bottom.link.url);
  }

  if (result.related_pages) {
    for (const item of result.related_pages) {
      if (item.link) candidates.push(item.link);
    }
  }

  // Processa candidatos
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'string') {
      continue;
    }

    const trimmed = candidate.trim();

    // Se já é uma URL completa (http/https)
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }

    // Se é displayed_link sem schema, normalizar para https://
    if (trimmed && !trimmed.includes('://') && !trimmed.startsWith('/')) {
      // Pode ser um domínio exibido, tentar normalizar
      if (trimmed.includes('.') && !trimmed.includes(' ')) {
        return `https://${trimmed}`;
      }
    }
  }

  // Se não encontrou em campos diretos, tenta extrair de snippet ou title
  const textFields = [result.snippet, result.title].filter(Boolean) as string[];

  for (const text of textFields) {
    // Regex para encontrar URLs http/https no texto
    const urlMatch = text.match(/https?:\/\/[^\s<>"']+/i);
    if (urlMatch) {
      return urlMatch[0];
    }
  }

  return null;
}

/**
 * Faz fetch com retry automático em caso de rate limit (429)
 * Backoff exponencial: 2s (1º retry) e 4s (2º retry)
 */
async function fetchWithRetries(
  url: string,
  options: RequestInit,
  maxRetries = 2
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Se 429 (Too Many Requests), aguarda e tenta novamente
      if (response.status === 429 && attempt < maxRetries) {
        const delay = 2000 * Math.pow(2, attempt); // 2s, depois 4s
        console.log(
          `[SerpAPI] Rate limit (429), aguardando ${delay}ms antes de retry (tentativa ${attempt + 1}/${maxRetries})...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      // Aguarda antes de retry em caso de erro de rede
      const delay = 2000 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error('Falha ao buscar após retries');
}

/**
 * Normaliza resposta da SerpAPI para formato comum
 * Aceita organic_results, organic ou top_results
 */
function normalizeSerpApiResponse(data: SerpApiResponse): DorkResult[] {
  const results: DorkResult[] = [];

  // Tenta diferentes campos de resposta da SerpAPI
  const organicResults =
    data.organic_results || data.organic || data.top_results || [];

  for (const item of organicResults) {
    const link = extractUrlFromResult(item);

    // Só adiciona se tiver link válido
    if (!link) {
      continue;
    }

    results.push({
      title: item.title || null,
      link,
      snippet: item.snippet || null,
      source: 'serpapi',
    });
  }

  return results;
}

/**
 * Deduplica resultados por link (case-insensitive)
 * Prioriza links com path sobre links sem path
 * Se houver duplicatas, mantém a que tiver snippet maior ou que apareceu primeiro
 */
function deduplicateAndPrioritize(results: DorkResult[]): DorkResult[] {
  const seen = new Map<string, DorkResult>();

  for (const result of results) {
    if (!result.link) {
      continue;
    }

    const linkKey = result.link.toLowerCase();
    const existing = seen.get(linkKey);

    if (!existing) {
      seen.set(linkKey, result);
    } else {
      // Prioriza links com path (contém / após o domínio)
      const currentHasPath = /^https?:\/\/[^/]+\//.test(result.link);
      const existingHasPath = /^https?:\/\/[^/]+\//.test(existing.link || '');

      // Se o novo tem path e o existente não, substitui
      if (currentHasPath && !existingHasPath) {
        seen.set(linkKey, result);
      }
      // Se ambos têm path ou ambos não têm, mantém o que tem snippet maior
      else if (
        currentHasPath === existingHasPath &&
        (result.snippet?.length || 0) > (existing.snippet?.length || 0)
      ) {
        seen.set(linkKey, result);
      }
      // Caso contrário, mantém o existente (primeiro a aparecer)
    }
  }

  return Array.from(seen.values());
}

/**
 * Busca usando SerpAPI (Google engine)
 */
async function searchSerpAPI(
  query: string,
  start: number = 0
): Promise<DorkResult[]> {
  const apiKey = process.env.SERPAPI_KEY;

  if (!apiKey) {
    throw new Error('SERPAPI_KEY não configurada');
  }

  // Monta URL da SerpAPI
  // Usa num=100 para pegar mais resultados por chamada
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&num=100&start=${start}&google_domain=google.com&hl=en&api_key=${apiKey}`;

  // Headers conforme especificação
  const headers = {
    'User-Agent': 'funilspy/1.0',
    Accept: 'application/json',
  };

  // Faz fetch com retry automático em caso de 429
  const response = await fetchWithRetries(url, { headers });

  if (!response.ok) {
    throw new Error(
      `SerpAPI retornou status ${response.status}: ${response.statusText}`
    );
  }

  const data: SerpApiResponse = await response.json();

  // Verifica se há erro na resposta
  if (data.error) {
    throw new Error(`SerpAPI error: ${data.error}`);
  }

  // Normaliza resultados
  return normalizeSerpApiResponse(data);
}

/**
 * Extrai domínio limpo de uma query ou domínio
 * Se a query já contém site: ou inurl:, retorna como está
 * Caso contrário, extrai o domínio usando extractDomain
 */
function extractDomainOrQuery(input: string): string {
  const trimmed = input.trim();

  // Se já contém operadores de busca, retorna como está
  if (trimmed.includes('site:') || trimmed.includes('inurl:')) {
    return trimmed;
  }

  // Caso contrário, extrai domínio limpo
  try {
    return extractDomain(trimmed);
  } catch (error) {
    // Se falhar, retorna o input original
    return trimmed;
  }
}

/**
 * GET /api/dorks?domain={domainOrQuery}&start={start?}
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const domainOrQueryInput = searchParams.get('domain');
    const startInput = searchParams.get('start');

    // Valida domainOrQuery
    const domainValidation = DomainOrQuerySchema.safeParse(domainOrQueryInput);
    if (!domainValidation.success) {
      return NextResponse.json(
        {
          error: domainValidation.error.errors[0]?.message || 'Domain inválido',
          code: 'INVALID_DOMAIN',
        },
        { status: 400 }
      );
    }

    // Valida start (opcional)
    const startValidation = StartSchema.safeParse(startInput);
    const start = startValidation.success ? startValidation.data : 0;

    // Extrai domínio ou query
    const domainOrQuery = domainValidation.data;
    const domainClean = extractDomainOrQuery(domainOrQuery);

    // Verifica se SERPAPI_KEY está configurada
    if (!process.env.SERPAPI_KEY) {
      return NextResponse.json(
        {
          error: 'missing api key',
          code: 'NO_KEY',
        },
        { status: 500 }
      );
    }

    // Gera chave de cache
    const key = cacheKey(['dorks', domainClean, 'site+inurl', start]);

    // Verifica cache
    const cached = await getCache<ApiResponse>(key);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'X-Cache': 'HIT',
        },
      });
    }

    // Constrói duas queries complementares
    // inurl:{domain}/ com barra para forçar páginas com paths
    // site:{domain} para páginas indexadas do site
    const queries = [
      `inurl:${domainClean}/`,
      `site:${domainClean}`,
    ];

    // Busca resultados em paralelo (duas queries)
    let allResults: DorkResult[] = [];
    let upstreamStatus: number | undefined;

    try {
      const [inurlResults, siteResults] = await Promise.all([
        searchSerpAPI(queries[0], start),
        searchSerpAPI(queries[1], start),
      ]);

      // Combina resultados
      allResults = [...inurlResults, ...siteResults];
    } catch (error: any) {
      // Trata erros upstream
      const statusMatch = error.message?.match(/status (\d+)/);
      if (statusMatch) {
        upstreamStatus = parseInt(statusMatch[1], 10);
      }

      return NextResponse.json(
        {
          error: 'upstream error',
          code: 'UPSTREAM_ERROR',
          upstreamStatus,
        },
        { status: 502 }
      );
    }

    // Deduplica e prioriza links com path
    const deduplicated = deduplicateAndPrioritize(allResults);

    // Limita a 200 resultados
    const limited = deduplicated.slice(0, 200);

    // Monta resposta
    const response: ApiResponse = {
      domain: domainClean,
      queries,
      count: limited.length,
      results: limited,
    };

    // Salva no cache (TTL padrão ou do env)
    const ttl = Number(process.env.CACHE_TTL) || 3600;
    await setCache(key, response, ttl);

    return NextResponse.json(response, {
      headers: {
        'X-Cache': 'MISS',
      },
    });
  } catch (error: any) {
    console.error('[API /api/dorks] Erro interno:', error);

    // Trata exceções internas
    return NextResponse.json(
      {
        error: 'internal error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
