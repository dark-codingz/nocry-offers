import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase/server'
import { getSessionUserAndOrg } from '@/lib/auth'
import { fetchAdsCountFromScraper } from '@/lib/tracking/parser'
import { calculateTrackingStatus } from '@/lib/tracking/status'

/**
 * POST /api/offers-tracked/[id]/refresh
 * Busca contagem atual de anúncios e cria novo snapshot
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { userId, orgId } = await getSessionUserAndOrg()
    const supabase = await getServerClient()

    console.log('[tracking] Iniciando refresh', { offerId: id, userId, orgId })

    // Buscar oferta rastreada
    const { data: offer, error: offerError } = await supabase
      .schema('offers')
      .from('offers_tracked')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (offerError || !offer) {
      console.error('[tracking] Oferta não encontrada', { offerId: id, error: offerError })
      return NextResponse.json(
        { ok: false, error: 'Oferta não encontrada' },
        { status: 404 }
      )
    }

    // Validar se possui ads_library_url
    if (!offer.ads_library_url) {
      console.error('[tracking] Oferta sem URL da Ads Library', { offerId: id })
      return NextResponse.json(
        { ok: false, error: 'Oferta sem URL da Ads Library cadastrada' },
        { status: 400 }
      )
    }

    console.log('[tracking] Oferta encontrada', {
      offerId: id,
      name: offer.name,
      adsLibraryUrl: offer.ads_library_url,
    })

    // Buscar snapshot anterior para calcular delta
    const { data: previousSnapshot, error: prevError } = await supabase
      .schema('offers')
      .from('offer_ads_snapshots')
      .select('ads_count')
      .eq('offer_tracked_id', id)
      .order('taken_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (prevError) {
      console.warn('[tracking] Erro ao buscar snapshot anterior (continuando)', { error: prevError })
    }

    // Chamar API externa de scraping
    const fetchResult = await fetchAdsCountFromScraper(offer.ads_library_url)

    if (!fetchResult.success) {
      // Não gravar snapshot se falhou
      const statusCode = fetchResult.status || 400
      const isUnprocessable = statusCode === 422 // Não encontrou número
      const isUpstreamError = statusCode >= 500 || statusCode === 502 // Erro do scraper

      console.error('[tracking] Falha ao buscar/extrair ads_count do scraper', {
        offerId: id,
        error: fetchResult.error,
        status: statusCode,
        isUnprocessable,
        isUpstreamError,
      })

      return NextResponse.json(
        {
          ok: false,
          error: fetchResult.error,
        },
        { status: isUnprocessable ? 422 : isUpstreamError ? 502 : statusCode }
      )
    }

    const adsCount = fetchResult.ads_count
    const rawTotalResultados = fetchResult.raw_total_resultados
    const scrapedAt = fetchResult.timestamp || new Date().toISOString()

    // Calcular delta
    const prevCount = previousSnapshot?.ads_count ?? null
    const delta = prevCount !== null ? adsCount - prevCount : null

    console.log('[tracking] Preparando para gravar snapshot', {
      offerId: id,
      adsCount,
      prevCount,
      delta,
    })

    // Criar novo snapshot
    const snapshotPayload: {
      offer_tracked_id: string
      ads_count: number
      source: 'manual' | 'cron'
      taken_at?: string
      raw_data?: any
    } = {
      offer_tracked_id: id,
      ads_count: adsCount,
      source: 'manual',
      taken_at: scrapedAt,
    }

    // Se a tabela tiver campo para raw_total_resultados, salvar
    // Caso contrário, salvar em raw_data
    snapshotPayload.raw_data = {
      raw_total_resultados: rawTotalResultados,
      timestamp: scrapedAt,
    }

    const { data: snapshot, error: snapshotError } = await supabase
      .schema('offers')
      .from('offer_ads_snapshots')
      .insert([snapshotPayload])
      .select()
      .single()

    if (snapshotError) {
      console.error('[tracking] Erro ao criar snapshot', {
        offerId: id,
        error: snapshotError,
      })
      return NextResponse.json(
        { ok: false, error: 'Erro ao salvar snapshot: ' + snapshotError.message },
        { status: 500 }
      )
    }

    // Buscar últimos snapshots para calcular status
    const { data: recentSnapshots, error: recentError } = await supabase
      .schema('offers')
      .from('offer_ads_snapshots')
      .select('ads_count, taken_at')
      .eq('offer_tracked_id', id)
      .order('taken_at', { ascending: false })
      .limit(10)

    if (recentError) {
      console.warn('[tracking] Erro ao buscar snapshots recentes para status (continuando)', {
        error: recentError,
      })
    }

    const statusCalculado = recentSnapshots && recentSnapshots.length > 0
      ? calculateTrackingStatus(recentSnapshots.map(s => ({ ads_count: s.ads_count, taken_at: s.taken_at })))
      : 'RECEM_LANCADA'

    console.log('[tracking] Refresh concluído com sucesso', {
      offerId: id,
      adsCount,
      delta,
      statusCalculado,
    })

    return NextResponse.json({
      ok: true,
      data: {
        offer_id: id,
        ads_count: adsCount,
        scraped_at: scrapedAt,
        raw_total_resultados: rawTotalResultados,
      },
    })
  } catch (error: any) {
    console.error('[tracking] Erro inesperado em POST /api/offers-tracked/[id]/refresh', {
      error: error.message,
      stack: error.stack,
    })
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao atualizar oferta rastreada' },
      { status: 500 }
    )
  }
}
