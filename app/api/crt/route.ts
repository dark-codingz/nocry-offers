/**
 * API Route: /api/crt
 * Consulta crt.sh para Certificate Transparency de um domínio
 * Runtime: Node.js (melhor compatibilidade)
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractDomain } from '@/lib/domain';
import { getCache, setCache, cacheKey } from '@/lib/cache';
import { rateLimit, getClientIP } from '@/lib/ratelimit';

// Força runtime Node.js
export const runtime = 'nodejs';

// Lock simples para evitar requests concorrentes ao mesmo domínio
const pendingRequests = new Map<string, Promise<any>>();

interface CrtShResult {
  name_value: string;
  not_before?: string;
  not_after?: string;
  issuer_name?: string;
  [key: string]: any;
}

interface ProcessedResult {
  hostname: string;
  not_before?: string;
  not_after?: string;
  issuer?: string;
}

interface ApiResponse {
  domain: string;
  count: number;
  results: ProcessedResult[];
}

/**
 * Faz fetch com retry e backoff exponencial em caso de 429
 * Backoff: 2s, depois 4s (máximo 2 tentativas)
 */
async function fetchWithRetry(url: string, maxRetries = 2): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'funilspy/1.0',
          Accept: 'application/json',
        },
      });

      // Se 429 (Too Many Requests), aguarda e tenta novamente
      if (response.status === 429 && attempt < maxRetries) {
        const delay = 2000 * Math.pow(2, attempt); // 2s, depois 4s
        console.log(
          `[crt.sh] Rate limit (429), aguardando ${delay}ms antes de retry (tentativa ${attempt + 1}/${maxRetries})...`
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
 * Processa resultados do crt.sh: extrai hostnames, deduplica e ordena
 * Preserva o mais recente not_before/not_after quando há duplicatas
 */
function processResults(data: CrtShResult[]): ProcessedResult[] {
  const hostnameMap = new Map<string, ProcessedResult>();

  for (const item of data) {
    // name_value pode ser multilinha
    const nameValues = (item.name_value || '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    for (const nameValue of nameValues) {
      // Remove wildcards (*.)
      let hostname = nameValue.replace(/^\*\./, '').trim().toLowerCase();

      // Ignora entradas vazias ou inválidas
      if (!hostname || hostname === '*' || hostname.includes(' ')) {
        continue;
      }

      // Deduplica (case-insensitive)
      const key = hostname.toLowerCase();

      if (!hostnameMap.has(key)) {
        hostnameMap.set(key, {
          hostname,
          not_before: item.not_before,
          not_after: item.not_after,
          issuer: item.issuer_name,
        });
      } else {
        const existing = hostnameMap.get(key)!;
        // Preserva o mais recente not_before/not_after se disponível
        if (item.not_before) {
          if (!existing.not_before || item.not_before > existing.not_before) {
            existing.not_before = item.not_before;
          }
        }
        if (item.not_after) {
          if (!existing.not_after || item.not_after > existing.not_after) {
            existing.not_after = item.not_after;
          }
        }
        if (item.issuer_name && !existing.issuer) {
          existing.issuer = item.issuer_name;
        }
      }
    }
  }

  // Ordena alfabeticamente
  return Array.from(hostnameMap.values()).sort((a, b) =>
    a.hostname.localeCompare(b.hostname)
  );
}

/**
 * Busca certificados no crt.sh
 */
async function fetchCertificates(domain: string): Promise<ProcessedResult[]> {
  const url = `https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    if (response.status === 429) {
      const error: any = new Error('crt.sh retornou rate limit (429)');
      error.code = 'UPSTREAM_RATE_LIMIT';
      throw error;
    }
    throw new Error(
      `crt.sh retornou status ${response.status}: ${response.statusText}`
    );
  }

  const data: CrtShResult[] = await response.json();

  if (!Array.isArray(data)) {
    throw new Error('Resposta inválida do crt.sh: esperado array');
  }

  return processResults(data);
}

/**
 * GET /api/crt?domain=example.com
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const domainInput = searchParams.get('domain');

    if (!domainInput) {
      return NextResponse.json(
        { error: 'Parâmetro "domain" é obrigatório', code: 'MISSING_PARAM' },
        { status: 400 }
      );
    }

    // Extrai e valida domínio
    let domain: string;
    try {
      domain = extractDomain(domainInput);
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Domínio inválido', code: 'INVALID_DOMAIN' },
        { status: 400 }
      );
    }

    // Aplica rate limit (se Upstash configurado)
    try {
      const clientIP = getClientIP(request);
      await rateLimit(clientIP);
    } catch (error: any) {
      if (error.code === 'RATE_LIMIT') {
        return NextResponse.json(
          {
            error: error.message,
            code: 'RATE_LIMIT',
            retryAfter: error.retryAfter,
          },
          { status: 429 }
        );
      }
      // Se não for rate limit, continua (fail open)
    }

    // Gera chave de cache
    const key = cacheKey(['crt', domain]);

    // Verifica cache
    const cached = await getCache<ApiResponse>(key);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'X-Cache': 'HIT',
        },
      });
    }

    // Verifica se já existe uma request pendente para este domínio
    let fetchPromise = pendingRequests.get(domain);
    if (!fetchPromise) {
      fetchPromise = fetchCertificates(domain);
      pendingRequests.set(domain, fetchPromise);

      // Remove do map após completar (sucesso ou erro)
      fetchPromise
        .finally(() => {
          pendingRequests.delete(domain);
        })
        .catch(() => {
          // Ignora erros aqui, serão tratados abaixo
        });
    }

    const results = await fetchPromise;

    const response: ApiResponse = {
      domain,
      count: results.length,
      results,
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
    console.error('[API /api/crt] Erro:', error);

    // Trata erros específicos
    if (error.code === 'UPSTREAM_RATE_LIMIT') {
      return NextResponse.json(
        {
          error: 'crt.sh retornou rate limit. Tente novamente em alguns segundos.',
          code: 'UPSTREAM_RATE_LIMIT',
        },
        { status: 502 }
      );
    }

    const errorMessage =
      error.message || 'Erro interno ao buscar certificados';
    const statusCode = error.message?.includes('status') ? 502 : 500;

    return NextResponse.json(
      {
        error: errorMessage,
        code: 'UPSTREAM_ERROR',
      },
      { status: statusCode }
    );
  }
}
