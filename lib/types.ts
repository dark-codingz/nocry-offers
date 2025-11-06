export type OfferStatus =
  | 'Descartada'
  | 'Em análise'
  | 'Modelando'
  | 'Rodando'
  | 'Encerrada'

export type Visibility = 'org' | 'private'

export interface Offer {
  id: string
  org_id: string
  name: string
  country: string
  niche?: string
  status: OfferStatus
  ad_library_url: string
  original_funnel_url: string
  spy_tool_url?: string
  notes?: string
  visibility: Visibility
  owner_user_id?: string
  created_at: string
  updated_at: string
}

export interface OfferCreativeOriginal {
  id: string
  offer_id: string
  ref_name: string
  ad_link?: string
  format?: string
  copy?: string
  preview_url?: string
  captured_at?: string
  notes?: string
  created_at: string
  // Metadados de upload
  file_type?: 'image' | 'video' | 'pdf' | 'file'
  size_bytes?: number
  size_mb?: string
  width?: number
  height?: number
  duration_sec?: number
  duration_formatted?: string
  order?: number
}

export interface OfferCreativeModeled {
  id: string
  offer_id: string
  internal_name: string
  meta_ads_link?: string
  asset_url?: string
  copy?: string
  status?: 'Em teste' | 'Validado' | 'Rejeitado'
  notes?: string
  created_at: string
  // Metadados de upload
  file_type?: 'image' | 'video' | 'pdf' | 'file'
  size_bytes?: number
  size_mb?: string
  width?: number
  height?: number
  duration_sec?: number
  duration_formatted?: string
  order?: number
  is_winner?: boolean
}

export interface OfferPage {
  id: string
  offer_id: string
  funnel_type?: string
  our_quiz_or_lp?: string
  structure_notes?: string
  created_at: string
}

export interface OfferBonus {
  id: string
  offer_id: string
  title: string
  content_type?: string
  file_or_link?: string
  short_desc?: string
  perceived_value?: number
  notes?: string
  created_at: string
}

export interface OfferUpsell {
  id: string
  offer_id: string
  upsell_name: string
  description?: string
  price?: number
  created_at: string
}

export interface OfferPixel {
  id: string
  offer_id: string
  pixel_meta?: string
  token?: string
  is_active?: boolean
  notes?: string
  created_at: string
  updated_at: string
}

export interface OfferAttachment {
  id: string
  offer_id: string
  file_url: string
  label?: string
  created_at: string
}

export interface OfferComment {
  id: string
  offer_id: string
  author: string
  body: string
  created_at: string
}

// Tipos para as views/tabelas core
export interface UserOrg {
  user_id: string
  org_id: string
}

export interface Org {
  id: string
  name: string
  created_at: string
}
