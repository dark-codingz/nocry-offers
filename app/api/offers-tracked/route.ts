import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase/server'
import { getSessionUserAndOrg } from '@/lib/auth'
import { normalizeUrl } from '@/lib/url'

/**
 * GET /api/offers-tracked
 * Lista ofertas rastreadas do usuário/org
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await getSessionUserAndOrg()
    const supabase = await getServerClient()

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const archived = searchParams.get('archived') === 'true'

    // Query base
    let query = supabase
      .schema('offers')
      .from('offers_tracked')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_archived', archived)
      .order('created_at', { ascending: false })

    // Filtro de busca (nome ou nicho)
    if (search) {
      query = query.or(`name.ilike.%${search}%,niche.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao listar ofertas rastreadas:', error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, data: data || [] })
  } catch (error: any) {
    console.error('Erro em GET /api/offers-tracked:', error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao listar ofertas rastreadas' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/offers-tracked
 * Cria nova oferta rastreada
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await getSessionUserAndOrg()
    const supabase = await getServerClient()

    const body = await request.json()
    const { name, niche, country, ads_library_url, landing_page_url, notes } = body

    // Validações básicas
    if (!name || !country || !ads_library_url) {
      return NextResponse.json(
        { ok: false, error: 'Nome, país e URL da Ads Library são obrigatórios' },
        { status: 400 }
      )
    }

    // Normalizar URLs
    const normalizedAdsUrl = normalizeUrl(ads_library_url) || ads_library_url
    const normalizedLpUrl = landing_page_url ? normalizeUrl(landing_page_url) || landing_page_url : null

    const payload = {
      org_id: orgId,
      owner_user_id: userId,
      name: name.trim(),
      niche: niche?.trim() || null,
      country: country.trim(),
      ads_library_url: normalizedAdsUrl,
      landing_page_url: normalizedLpUrl,
      notes: notes?.trim() || null,
      is_archived: false,
    }

    const { data, error } = await supabase
      .schema('offers')
      .from('offers_tracked')
      .insert([payload])
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar oferta rastreada:', error)
      if (error.code === '42501' || error.message.includes('RLS')) {
        return NextResponse.json(
          { ok: false, error: 'Sem permissão para criar oferta rastreada' },
          { status: 403 }
        )
      }
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, data })
  } catch (error: any) {
    console.error('Erro em POST /api/offers-tracked:', error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao criar oferta rastreada' },
      { status: 500 }
    )
  }
}

