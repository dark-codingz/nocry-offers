'use server'

import { revalidatePath } from 'next/cache'
import { getServerClient } from '@/lib/supabase/server'
import { getOfferOrgId, getAuthUserId } from '@/lib/offer'
import { normalizeUrl } from '@/lib/url'
import { sa, type Result } from '@/lib/sa-wrapper'

// ============================================
// SERVER ACTIONS COM RLS CORRIGIDO
// ============================================

/** CRIATIVOS ORIGINAIS - Server Action com RLS */
export async function saCreateCreativeOriginal(
  offerId: string,
  dto: {
    ref_name: string
    format: string
    copy?: string
    preview_url?: string
    captured_at?: string
    notes?: string
  }
): Promise<Result<boolean>> {
  return sa('CREATE_ORIG', async () => {
    // Validações
    if (!dto?.ref_name || !dto?.format) {
      throw new Error('Campos obrigatórios: ref_name, format.')
    }

    const supabase = await getServerClient()
    const [orgId, userId] = await Promise.all([getOfferOrgId(offerId), getAuthUserId()])

    const payload = {
      org_id: orgId,
      offer_id: offerId,
      ref_name: dto.ref_name,
      format: dto.format,
      copy: dto.copy || null,
      preview_url: dto.preview_url || null,
      captured_at: dto.captured_at || new Date().toISOString().slice(0, 10),
      notes: dto.notes || null,
    }

    console.log('[CREATE_ORIG_PAYLOAD]', { userId, offerId, payload })

    const { error } = await supabase
      .schema('offers')
      .from('offer_creatives_original')
      .insert(payload)

    if (error) {
      console.error('[CREATE_ORIG_DB_ERROR]', error)
      throw new Error(error.message)
    }

    revalidatePath(`/ofertas/${offerId}`)
    return true
  })
}

/** ENTREGÁVEIS (BÔNUS) - Server Action com RLS */
export async function saCreateBonus(
  offerId: string,
  dto: {
    title: string
    short_desc?: string
    content_type: string
    file_or_link: string
    perceived_value?: number
    notes?: string
  }
): Promise<Result<boolean>> {
  return sa('CREATE_BONUS', async () => {
    // Validações
    if (!dto?.title || !dto?.content_type) {
      throw new Error('Preencha título e tipo.')
    }
    if (!dto?.file_or_link) {
      throw new Error('Envie o arquivo ou cole um link.')
    }

    const supabase = await getServerClient()
    const [orgId, userId] = await Promise.all([getOfferOrgId(offerId), getAuthUserId()])

    const fol = dto.file_or_link?.startsWith('http')
      ? normalizeUrl(dto.file_or_link) ?? dto.file_or_link
      : dto.file_or_link

    const payload = {
      org_id: orgId,
      offer_id: offerId,
      title: dto.title,
      short_desc: dto.short_desc || null,
      content_type: dto.content_type,
      file_or_link: fol,
      perceived_value: dto.perceived_value ?? null,
      notes: dto.notes || null,
    }

    console.log('[CREATE_BONUS_PAYLOAD]', { userId, offerId, payload })

    const { error } = await supabase.schema('offers').from('offer_bonuses').insert(payload)

    if (error) {
      console.error('[CREATE_BONUS_DB_ERROR]', error)
      throw new Error(error.message)
    }

    revalidatePath(`/ofertas/${offerId}`)
    return true
  })
}

/** ANEXOS - Server Action com RLS */
export async function saCreateAttachment(
  offerId: string,
  dto: {
    file_url: string
    label?: string
  }
): Promise<Result<boolean>> {
  return sa('CREATE_ATTACHMENT', async () => {
    // Validações
    if (!dto?.file_url) {
      throw new Error('Envie o arquivo.')
    }

    const supabase = await getServerClient()
    const [orgId, userId] = await Promise.all([getOfferOrgId(offerId), getAuthUserId()])

    const furl = dto.file_url?.startsWith('http') ? normalizeUrl(dto.file_url) ?? dto.file_url : dto.file_url

    const payload = {
      org_id: orgId,
      offer_id: offerId,
      file_url: furl,
      label: dto.label || null,
    }

    console.log('[CREATE_ATTACHMENT_PAYLOAD]', { userId, offerId, payload })

    const { error } = await supabase.schema('offers').from('offer_attachments').insert(payload)

    if (error) {
      console.error('[CREATE_ATTACHMENT_DB_ERROR]', error)
      throw new Error(error.message)
    }

    revalidatePath(`/ofertas/${offerId}`)
    return true
  })
}

// ============================================
// CRIATIVOS ORIGINAIS (Antiga - manter para compatibilidade)
// ============================================
export async function createCreativeOriginal(offerId: string, dto: {
  ref_name: string
  format: string
  copy?: string
  preview_url?: string
  captured_at?: string
  notes?: string
}) {
  try {
    const supabase = await getServerClient()
    const orgId = await getOfferOrgId(offerId)

    const payload = {
      org_id: orgId,
      offer_id: offerId,
      ref_name: dto.ref_name,
      format: dto.format,
      copy: dto.copy || null,
      preview_url: dto.preview_url || null,
      captured_at: dto.captured_at || new Date().toISOString().slice(0, 10),
      notes: dto.notes || null,
    }

    console.log('[CREATE_ORIG_PAYLOAD]', payload)

    const { error } = await supabase
      .schema('offers')
      .from('offer_creatives_original')
      .insert(payload)

    if (error) {
      console.error('[CRIATIVOS_ORIG_SAVE_ERROR]', error)
      throw new Error(error.message)
    }

    revalidatePath(`/ofertas/${offerId}`)
    return { success: true }
  } catch (error) {
    console.error('[CREATE_CREATIVE_ORIGINAL]', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}

export async function deleteCreativeOriginal(offerId: string, id: string) {
  try {
    const supabase = await getServerClient()
    const { error } = await supabase
      .schema('offers')
      .from('offer_creatives_original')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[CRIATIVOS_ORIG_DELETE_ERROR]', error)
      throw new Error(error.message)
    }

    revalidatePath(`/ofertas/${offerId}`)
    return { success: true }
  } catch (error) {
    console.error('[DELETE_CREATIVE_ORIGINAL]', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}

// ============================================
// CRIATIVOS MODELADOS
// ============================================
export async function createCreativeModeled(offerId: string, dto: {
  internal_name: string
  asset_url?: string
  copy?: string
  status?: string
  notes?: string
}) {
  try {
    const supabase = await getServerClient()
    const orgId = await getOfferOrgId(offerId)

    const payload = {
      org_id: orgId,
      offer_id: offerId,
      internal_name: dto.internal_name,
      asset_url: dto.asset_url || null,
      copy: dto.copy || null,
      status: dto.status || null,
      notes: dto.notes || null,
    }

    console.log('[CREATE_MOD_PAYLOAD]', payload)

    const { error } = await supabase
      .schema('offers')
      .from('offer_creatives_modeled')
      .insert(payload)

    if (error) {
      console.error('[CRIATIVOS_MOD_SAVE_ERROR]', error)
      throw new Error(error.message)
    }

    revalidatePath(`/ofertas/${offerId}`)
    return { success: true }
  } catch (error) {
    console.error('[CREATE_CREATIVE_MODELED]', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}

export async function deleteCreativeModeled(offerId: string, id: string) {
  try {
    const supabase = await getServerClient()
    const { error } = await supabase
      .schema('offers')
      .from('offer_creatives_modeled')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[CRIATIVOS_MOD_DELETE_ERROR]', error)
      throw new Error(error.message)
    }

    revalidatePath(`/ofertas/${offerId}`)
    return { success: true }
  } catch (error) {
    console.error('[DELETE_CREATIVE_MODELED]', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}

// ============================================
// PÁGINAS (SIMPLIFICADO)
// ============================================
export async function createSimplePage(offerId: string, dto: {
  title: string
  url?: string
  notes?: string
  file_url?: string
}) {
  try {
    const supabase = await getServerClient()
    const orgId = await getOfferOrgId(offerId)

    const payload = {
      org_id: orgId,
      offer_id: offerId,
      funnel_type: dto.title,
      our_quiz_or_lp: dto.url ? normalizeUrl(dto.url) ?? dto.url : (dto.file_url || null),
      structure_notes: dto.notes || null,
    }

    console.log('[FUNIL_PAYLOAD]', payload)

    const { error } = await supabase.schema('offers').from('offer_pages').insert(payload)

    if (error) {
      console.error('[FUNIL_SAVE_ERROR]', error)
      throw new Error(error.message)
    }

    revalidatePath(`/ofertas/${offerId}`)
    return { success: true }
  } catch (error) {
    console.error('[CREATE_PAGE]', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}

export async function deletePage(offerId: string, id: string) {
  try {
    const supabase = await getServerClient()
    const { error } = await supabase.schema('offers').from('offer_pages').delete().eq('id', id)

    if (error) {
      console.error('[FUNIL_DELETE_ERROR]', error)
      throw new Error(error.message)
    }

    revalidatePath(`/ofertas/${offerId}`)
    return { success: true }
  } catch (error) {
    console.error('[DELETE_PAGE]', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}

// ============================================
// ENTREGÁVEIS (BÔNUS) - file_or_link OBRIGATÓRIO
// ============================================
export async function createBonus(offerId: string, dto: {
  title: string
  short_desc?: string
  content_type: string
  file_or_link: string
  perceived_value?: number
  notes?: string
}) {
  try {
    const supabase = await getServerClient()
    const orgId = await getOfferOrgId(offerId)

    // Validação: file_or_link é obrigatório
    if (!dto.file_or_link || !dto.file_or_link.trim()) {
      throw new Error('Envie o arquivo ou cole um link.')
    }

    const payload = {
      org_id: orgId,
      offer_id: offerId,
      title: dto.title,
      short_desc: dto.short_desc || null,
      content_type: dto.content_type,
      file_or_link: dto.file_or_link, // key do Storage ou URL
      perceived_value: dto.perceived_value ?? null,
      notes: dto.notes || null,
    }

    console.log('[BONUS_PAYLOAD]', payload)

    const { error } = await supabase.schema('offers').from('offer_bonuses').insert(payload)

    if (error) {
      console.error('[BONUS_SAVE_ERROR]', error)
      throw new Error(error.message)
    }

    revalidatePath(`/ofertas/${offerId}`)
    return { success: true }
  } catch (error) {
    console.error('[CREATE_BONUS]', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}

export async function deleteBonus(offerId: string, id: string) {
  try {
    const supabase = await getServerClient()
    const { error } = await supabase.schema('offers').from('offer_bonuses').delete().eq('id', id)

    if (error) {
      console.error('[BONUS_DELETE_ERROR]', error)
      throw new Error(error.message)
    }

    revalidatePath(`/ofertas/${offerId}`)
    return { success: true }
  } catch (error) {
    console.error('[DELETE_BONUS]', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}

// ============================================
// UPSELL
// ============================================
export async function createUpsell(offerId: string, dto: {
  name: string
  price?: number
  page_link?: string
  short_desc?: string
  notes?: string
}) {
  try {
    const supabase = await getServerClient()
    const orgId = await getOfferOrgId(offerId)

    const payload = {
      org_id: orgId,
      offer_id: offerId,
      name: dto.name,
      price: dto.price ?? null,
      page_link: dto.page_link ? normalizeUrl(dto.page_link) ?? null : null,
      short_desc: dto.short_desc || null,
      notes: dto.notes || null,
    }

    console.log('[UPSELL_PAYLOAD]', payload)

    const { error } = await supabase.schema('offers').from('offer_upsells').insert(payload)

    if (error) {
      console.error('[UPSELL_SAVE_ERROR]', error)
      throw new Error(error.message)
    }

    revalidatePath(`/ofertas/${offerId}`)
    return { success: true }
  } catch (error) {
    console.error('[CREATE_UPSELL]', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}

export async function deleteUpsell(offerId: string, id: string) {
  try {
    const supabase = await getServerClient()
    const { error } = await supabase.schema('offers').from('offer_upsells').delete().eq('id', id)

    if (error) {
      console.error('[UPSELL_DELETE_ERROR]', error)
      throw new Error(error.message)
    }

    revalidatePath(`/ofertas/${offerId}`)
    return { success: true }
  } catch (error) {
    console.error('[DELETE_UPSELL]', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}

// ============================================
// PIXEL (SELECT → UPDATE|INSERT)
// ============================================
export async function savePixel(offerId: string, dto: {
  pixel_meta: string
  token: string
  is_active: boolean
  notes?: string
}) {
  try {
    const supabase = await getServerClient()
    const orgId = await getOfferOrgId(offerId)

    console.log('[PIXEL_PAYLOAD]', { offerId, orgId, ...dto })

    // Verificar se já existe
    const { data: existing, error: selErr } = await supabase
      .schema('offers')
      .from('offer_pixel')
      .select('id')
      .eq('offer_id', offerId)
      .limit(1)
      .maybeSingle()

    if (selErr) {
      console.error('[PIXEL_SELECT_ERROR]', selErr)
      throw new Error(selErr.message)
    }

    if (existing?.id) {
      // UPDATE
      const { error: updErr } = await supabase
        .schema('offers')
        .from('offer_pixel')
        .update({
          pixel_meta: dto.pixel_meta,
          token: dto.token,
          is_active: dto.is_active,
          notes: dto.notes || null,
          org_id: orgId,
        })
        .eq('id', existing.id)

      if (updErr) {
        console.error('[PIXEL_UPDATE_ERROR]', updErr)
        throw new Error(updErr.message)
      }
    } else {
      // INSERT
      const { error: insErr } = await supabase
        .schema('offers')
        .from('offer_pixel')
        .insert({
          org_id: orgId,
          offer_id: offerId,
          pixel_meta: dto.pixel_meta,
          token: dto.token,
          is_active: dto.is_active,
          notes: dto.notes || null,
        })

      if (insErr) {
        console.error('[PIXEL_INSERT_ERROR]', insErr)
        throw new Error(insErr.message)
      }
    }

    revalidatePath(`/ofertas/${offerId}`)
    return { success: true }
  } catch (error) {
    console.error('[SAVE_PIXEL]', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}

export async function deletePixel(offerId: string, id: string) {
  try {
    const supabase = await getServerClient()
    const { error } = await supabase.schema('offers').from('offer_pixel').delete().eq('id', id)

    if (error) {
      console.error('[PIXEL_DELETE_ERROR]', error)
      throw new Error(error.message)
    }

    revalidatePath(`/ofertas/${offerId}`)
    return { success: true }
  } catch (error) {
    console.error('[DELETE_PIXEL]', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}

export async function togglePixelActive(offerId: string, id: string, currentStatus: boolean) {
  try {
    const supabase = await getServerClient()
    const { error } = await supabase
      .schema('offers')
      .from('offer_pixel')
      .update({
        is_active: !currentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('[PIXEL_TOGGLE_ERROR]', error)
      throw new Error(error.message)
    }

    revalidatePath(`/ofertas/${offerId}`)
    return { success: true }
  } catch (error) {
    console.error('[TOGGLE_PIXEL]', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}

// ============================================
// ANEXOS
// ============================================
export async function createAttachment(offerId: string, dto: {
  file_url: string
  label?: string
}) {
  try {
    const supabase = await getServerClient()
    const orgId = await getOfferOrgId(offerId)

    const payload = {
      org_id: orgId,
      offer_id: offerId,
      file_url: dto.file_url,
      label: dto.label || null,
    }

    console.log('[ANEXO_PAYLOAD]', payload)

    const { error } = await supabase.schema('offers').from('offer_attachments').insert(payload)

    if (error) {
      console.error('[ANEXOS_SAVE_ERROR]', error)
      throw new Error(error.message)
    }

    revalidatePath(`/ofertas/${offerId}`)
    return { success: true }
  } catch (error) {
    console.error('[CREATE_ATTACHMENT]', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}

export async function deleteAttachment(offerId: string, id: string) {
  try {
    const supabase = await getServerClient()
    const { error } = await supabase
      .schema('offers')
      .from('offer_attachments')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[ANEXOS_DELETE_ERROR]', error)
      throw new Error(error.message)
    }

    revalidatePath(`/ofertas/${offerId}`)
    return { success: true }
  } catch (error) {
    console.error('[DELETE_ATTACHMENT]', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}

// ============================================
// COMENTÁRIOS
// ============================================
export async function createComment(offerId: string, dto: {
  author?: string
  body: string
}) {
  try {
    const supabase = await getServerClient()
    const orgId = await getOfferOrgId(offerId)

    const payload = {
      org_id: orgId,
      offer_id: offerId,
      author: dto.author || null,
      body: dto.body,
    }

    console.log('[COMMENT_PAYLOAD]', payload)

    const { error } = await supabase.schema('offers').from('offer_comments').insert(payload)

    if (error) {
      console.error('[COMMENTS_SAVE_ERROR]', error)
      throw new Error(error.message)
    }

    revalidatePath(`/ofertas/${offerId}`)
    return { success: true }
  } catch (error) {
    console.error('[CREATE_COMMENT]', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}

export async function deleteComment(offerId: string, id: string) {
  try {
    const supabase = await getServerClient()
    const { error } = await supabase.schema('offers').from('offer_comments').delete().eq('id', id)

    if (error) {
      console.error('[COMMENT_DELETE_ERROR]', error)
      throw new Error(error.message)
    }

    revalidatePath(`/ofertas/${offerId}`)
    return { success: true }
  } catch (error) {
    console.error('[DELETE_COMMENT]', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}
