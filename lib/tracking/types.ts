/**
 * Tipos para o módulo de rastreamento de ofertas
 */

export interface OfferTracked {
  id: string
  created_at: string
  updated_at: string
  org_id: string
  owner_user_id: string
  name: string
  niche?: string
  country: string
  ads_library_url: string
  landing_page_url?: string
  notes?: string
  is_archived: boolean
}

export interface OfferAdsSnapshot {
  id: string
  created_at: string
  offer_tracked_id: string
  taken_at: string
  ads_count: number
  source: 'manual' | 'cron'
  raw_data?: any
  note?: string
}

export interface OfferTrackedWithLatest extends OfferTracked {
  latest_snapshot?: OfferAdsSnapshot
  delta?: number
  status_calculado?: string
}

export interface CreateOfferTrackedData {
  name: string
  niche?: string
  country: string
  ads_library_url: string
  landing_page_url?: string
  notes?: string
}

export interface UpdateOfferTrackedData {
  name?: string
  niche?: string
  country?: string
  ads_library_url?: string
  landing_page_url?: string
  notes?: string
  is_archived?: boolean
}

/**
 * Resposta da API externa de scraping
 */
export interface TrackingScraperResponse {
  timestamp: string
  url: string
  page_id: string
  total_resultados: string
}

