'use server'

/**
 * Wrapper padronizado para Server Actions.
 * Captura erros, serializa e retorna estrutura consistente.
 */

export type Ok<T> = { ok: true; data: T }
export type Fail = {
  ok: false
  error: {
    name?: string
    message: string
    code?: string
    details?: any
    stack?: string
  }
}

export type Result<T> = Ok<T> | Fail

function serializeError(e: any): Fail['error'] {
  const base = typeof e === 'object' && e ? e : { message: String(e) }
  return {
    name: base.name,
    message: base.message ?? String(e),
    code: base.code,
    details: base.details,
    stack: process.env.NODE_ENV !== 'production' ? base.stack : undefined,
  }
}

/**
 * Wrapper para Server Actions com tratamento de erros padronizado.
 * 
 * @param label - Label para identificar a action nos logs
 * @param fn - Função async a ser executada
 * @returns Promise com resultado estruturado { ok, data|error }
 * 
 * @example
 * ```ts
 * export async function myAction(id: string) {
 *   return sa('MY_ACTION', async () => {
 *     // sua lógica aqui
 *     return result
 *   })
 * }
 * ```
 */
export async function sa<T>(label: string, fn: () => Promise<T>): Promise<Result<T>> {
  try {
    const data = await fn()
    return { ok: true, data }
  } catch (e: any) {
    console.error(`[SA:${label}:ERROR]`, e)
    return { ok: false, error: serializeError(e) }
  }
}




