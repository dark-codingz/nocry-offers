/**
 * Rate limiting opcional com Upstash Redis
 * Se Upstash não estiver configurado, não aplica rate limit
 */

import { Redis } from '@upstash/redis';

const LIMIT_PER_MINUTE = Number(process.env.RATE_LIMIT_PER_MINUTE) || 10;

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
      return redisInstance;
    } catch (error) {
      console.error('[RateLimit] Erro ao inicializar Redis:', error);
      return null;
    }
  }

  return null;
}

/**
 * Aplica rate limit por IP
 * Se Upstash não estiver configurado, não faz nada (permite todas as requisições)
 */
export async function rateLimit(ip: string): Promise<void> {
  const redis = getRedis();

  if (!redis) {
    // Sem Redis = sem rate limit
    return;
  }

  // Gera chave baseada no IP e minuto atual
  const now = new Date();
  const minuteKey = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const key = `rl:${ip}:${minuteKey}`;

  try {
    // Incrementa contador e define expiração de 65 segundos (para cobrir o minuto atual)
    const count = await redis.incr(key);
    await redis.expire(key, 65);

    if (count > LIMIT_PER_MINUTE) {
      const error: any = new Error(
        `Rate limit excedido: máximo ${LIMIT_PER_MINUTE} requisições por minuto`
      );
      error.code = 'RATE_LIMIT';
      error.retryAfter = 60;
      throw error;
    }
  } catch (error: any) {
    // Se já é nosso erro de rate limit, re-lança
    if (error.code === 'RATE_LIMIT') {
      throw error;
    }
    // Em caso de erro do Redis, loga mas não bloqueia (fail open)
    console.error('[RateLimit] Erro ao verificar rate limit:', error);
  }
}

/**
 * Obtém IP do request (considera x-forwarded-for para proxies)
 */
export function getClientIP(request: Request): string {
  // Tenta obter do header x-forwarded-for (Vercel, proxies)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Pega o primeiro IP (o cliente original) - garante string segura
    const parts = forwardedFor.split(',');
    const ip = parts[0]?.trim() || '';
    if (ip) {
      return ip;
    }
  }

  // Tenta x-real-ip
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback
  return 'unknown';
}

