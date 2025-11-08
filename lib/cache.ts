/**
 * Sistema de cache: Upstash Redis (se configurado) ou Map em memória
 * Compatível com Vercel Serverless
 */

import { Redis } from '@upstash/redis';

// TTL padrão: 1 hora (3600 segundos)
const DEFAULT_TTL = Number(process.env.CACHE_TTL) || 3600;

// Cache em memória (fallback quando Upstash não está configurado)
interface CacheEntry<T> {
  value: T;
  exp: number; // timestamp de expiração
}

const memoryCache = new Map<string, CacheEntry<any>>();

// Limpa entradas expiradas periodicamente (a cada 5 minutos)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryCache.entries()) {
      if (entry.exp < now) {
        memoryCache.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

// Instância do Redis (se configurado)
let redisInstance: Redis | null = null;

function getRedis(): Redis | null {
  if (redisInstance) {
    return redisInstance;
  }

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      redisInstance = new Redis({
        url: redisUrl,
        token: redisToken,
      });
      console.log('[Cache] Usando Upstash Redis');
      return redisInstance;
    } catch (error) {
      console.error('[Cache] Erro ao inicializar Redis:', error);
      return null;
    }
  }

  return null;
}

/**
 * Gera chave de cache a partir de partes
 */
export function cacheKey(parts: Array<string | number>): string {
  return parts.map((p) => String(p).toLowerCase()).join(':');
}

/**
 * Busca valor no cache
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const redis = getRedis();

  if (redis) {
    try {
      const value = await redis.get<T>(key);
      return value;
    } catch (error) {
      console.error('[Cache] Erro ao buscar no Redis:', error);
      // Fallback para memória em caso de erro
    }
  }

  // Cache em memória
  const entry = memoryCache.get(key);
  if (!entry) {
    return null;
  }

  // Verifica expiração
  if (entry.exp < Date.now()) {
    memoryCache.delete(key);
    return null;
  }

  return entry.value as T;
}

/**
 * Salva valor no cache com TTL
 */
export async function setCache<T>(
  key: string,
  value: T,
  ttlSec: number = DEFAULT_TTL
): Promise<void> {
  const redis = getRedis();

  if (redis) {
    try {
      await redis.set(key, value, { ex: ttlSec });
      return;
    } catch (error) {
      console.error('[Cache] Erro ao salvar no Redis:', error);
      // Fallback para memória em caso de erro
    }
  }

  // Cache em memória
  const exp = Date.now() + ttlSec * 1000;
  memoryCache.set(key, { value, exp });
}

/**
 * Remove valor do cache
 */
export async function deleteCache(key: string): Promise<void> {
  const redis = getRedis();

  if (redis) {
    try {
      await redis.del(key);
      return;
    } catch (error) {
      console.error('[Cache] Erro ao deletar do Redis:', error);
    }
  }

  memoryCache.delete(key);
}
