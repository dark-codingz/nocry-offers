/**
 * Fetcher genérico que normaliza respostas para array
 * Garante compatibilidade com formatos { data: [...] } e array direto
 */
export async function jsonFetcherAsArray<T = unknown>(url: string): Promise<T[]> {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    
    const body = await res.json().catch(() => null)
    
    if (!res.ok) {
      console.error('[fetcher] GET', url, 'status:', res.status, 'body:', body)
      return []
    }
    
    // Normaliza {data: [...]} ou [...] para []
    if (Array.isArray(body)) {
      return body as T[]
    }
    
    if (body && typeof body === 'object' && Array.isArray(body.data)) {
      return body.data as T[]
    }
    
    return []
  } catch (error) {
    console.error('[fetcher] Error fetching', url, error)
    return []
  }
}


