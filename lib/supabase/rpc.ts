import { getServerClient } from '@/lib/supabase/server'

export type Top3ClusterRow = {
  cluster_id: string
  media_type: string | null
  ads_total: number | null
  variants: number | null
  days_active: number | null
}

/**
 * RPC offers.top3_clusters - Busca Top 3 clusters de um scan
 * 
 * @param scanId - UUID do scan
 * @returns Array de clusters ordenado por ads_total DESC (limitado a 3)
 */
export async function rpcOffersTop3Clusters(scanId: string): Promise<Top3ClusterRow[]> {
  const supabase = await getServerClient()
  
  const result = await supabase
    .schema('offers')                // ⚠️ usar o schema correto
    .rpc('top3_clusters', { p_scan_id: scanId })
  
  const { data, error } = result as { data: Top3ClusterRow[] | null; error: any }

  if (error) {
    // Deixe o erro bem explícito no log
    console.error('[tracking] RPC offers.top3_clusters error:', {
      code: (error as any).code,
      details: (error as any).details,
      hint: (error as any).hint,
      message: error.message,
    })
    throw new Error(`RPC offers.top3_clusters failed: ${error.message}`)
  }

  if (!data || data.length === 0) {
    return []
  }

  // Garantir que data é array
  const dataArray = Array.isArray(data) ? data : []
  
  // Ordena e limita por segurança (mesma regra do SQL), sem quebrar se vier mais
  return [...dataArray]
    .sort((a, b) => (b.ads_total ?? 0) - (a.ads_total ?? 0))
    .slice(0, 3)
}
