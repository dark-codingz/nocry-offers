import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase/server'
import { getSessionUserAndOrg } from '@/lib/auth'
import { normalizeUrl } from '@/lib/url'
import { calculateTrackingStatus } from '@/lib/tracking/status'

/**
 * GET /api/offers-tracked/[id]
 * Obtém detalhes de uma oferta rastreada + snapshots
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { userId, orgId } = await getSessionUserAndOrg()
    const supabase = await getServerClient()

    // Buscar oferta
    const { data: offer, error: offerError } = await supabase
      .schema('offers')
      .from('offers_tracked')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (offerError || !offer) {
      return NextResponse.json(
        { ok: false, error: 'Oferta rastreada não encontrada' },
        { status: 404 }
      )
    }

    // Buscar snapshots ordenados por data
    const { data: snapshots, error: snapshotsError } = await supabase
      .schema('offers')
      .from('offer_ads_snapshots')
      .select('*')
      .eq('offer_tracked_id', id)
      .order('taken_at', { ascending: false })

    if (snapshotsError) {
      console.error('Erro ao buscar snapshots:', snapshotsError)
    }

    // Calcular status
    const status_calculado = snapshots && snapshots.length > 0
      ? calculateTrackingStatus(snapshots.map(s => ({ ads_count: s.ads_count, taken_at: s.taken_at })))
      : 'RECEM_LANCADA'

    return NextResponse.json({
      ok: true,
      data: {
        offer: {
          ...offer,
          status_calculado,
        },
        snapshots: snapshots || [],
      },
    })
  } catch (error: any) {
    console.error('Erro em GET /api/offers-tracked/[id]:', error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao buscar oferta rastreada' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/offers-tracked/[id]
 * Atualiza uma oferta rastreada
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { userId, orgId } = await getSessionUserAndOrg()
    const supabase = await getServerClient()

    const body = await request.json()
    const { name, niche, country, ads_library_url, landing_page_url, notes, is_archived } = body

    // Montar payload apenas com campos fornecidos
    const updates: any = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) updates.name = name.trim()
    if (niche !== undefined) updates.niche = niche?.trim() || null
    if (country !== undefined) updates.country = country.trim()
    if (ads_library_url !== undefined) {
      updates.ads_library_url = normalizeUrl(ads_library_url) || ads_library_url
    }
    if (landing_page_url !== undefined) {
      updates.landing_page_url = landing_page_url
        ? normalizeUrl(landing_page_url) || landing_page_url
        : null
    }
    if (notes !== undefined) updates.notes = notes?.trim() || null
    if (is_archived !== undefined) updates.is_archived = is_archived

    const { data, error } = await supabase
      .schema('offers')
      .from('offers_tracked')
      .update(updates)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar oferta rastreada:', error)
      if (error.code === '42501' || error.message.includes('RLS')) {
        return NextResponse.json(
          { ok: false, error: 'Sem permissão para atualizar esta oferta' },
          { status: 403 }
        )
      }
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { ok: false, error: 'Oferta rastreada não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({ ok: true, data })
  } catch (error: any) {
    console.error('Erro em PATCH /api/offers-tracked/[id]:', error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao atualizar oferta rastreada' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/offers-tracked/[id]
 * Arquiva uma oferta rastreada (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { userId, orgId } = await getSessionUserAndOrg()
    const supabase = await getServerClient()

    // Soft delete: marcar como arquivada
    const { data, error } = await supabase
      .schema('offers')
      .from('offers_tracked')
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', orgId)
      .eq('owner_user_id', userId) // Apenas dono pode arquivar
      .select()
      .single()

    if (error) {
      console.error('Erro ao arquivar oferta rastreada:', error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { ok: false, error: 'Oferta rastreada não encontrada ou sem permissão' },
        { status: 404 }
      )
    }

    return NextResponse.json({ ok: true, data })
  } catch (error: any) {
    console.error('Erro em DELETE /api/offers-tracked/[id]:', error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao arquivar oferta rastreada' },
      { status: 500 }
    )
  }
}

