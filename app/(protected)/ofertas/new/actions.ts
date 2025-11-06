'use server'

import { revalidatePath } from 'next/cache'
import { getServerClient } from '@/lib/supabase/server'
import { getSessionUserAndOrg } from '@/lib/auth'
import { createOfferSchema, type CreateOfferFormData } from '@/lib/validations/offer'
import { normalizeUrl } from '@/lib/url'

export async function createOffer(data: CreateOfferFormData) {
  try {
    // URLs já são normalizadas pelo schema Zod (transform), mas garantimos aqui também (defesa dupla)
    const normalizedData = {
      ...data,
      ad_library_url: normalizeUrl(data.ad_library_url) ?? data.ad_library_url,
      original_funnel_url: normalizeUrl(data.original_funnel_url) ?? data.original_funnel_url,
      spy_tool_url: data.spy_tool_url ? normalizeUrl(data.spy_tool_url) ?? data.spy_tool_url : undefined,
    }

    // Validar dados (schema já normaliza, mas garantimos antes)
    const validatedData = createOfferSchema.parse(normalizedData)

    // Obter userId e orgId automaticamente
    const { userId, orgId } = await getSessionUserAndOrg()

    const supabase = await getServerClient()

    // Montar payload com valores automáticos
    const payload = {
      org_id: orgId,
      owner_user_id: userId,
      name: validatedData.name,
      country: validatedData.country,
      niche: validatedData.niche || null,
      status: 'Em análise' as const, // FORÇADO
      ad_library_url: validatedData.ad_library_url,
      original_funnel_url: validatedData.original_funnel_url,
      spy_tool_url: validatedData.spy_tool_url || null,
      notes: validatedData.notes || null,
      visibility: validatedData.visibility,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data: insertedData, error } = await supabase
      .schema('offers')
      .from('offers')
      .insert([payload])
      .select('id')
      .single()

    if (error) {
      console.error('Erro ao criar oferta:', error)
      // Mensagem clara para RLS/perm
      if (error.code === '42501' || error.message.includes('RLS')) {
        return {
          ok: false,
          error:
            'Sem permissão para criar oferta nessa organização. Verifique seu vínculo ao squad.',
        }
      }
      return { ok: false, error: `Erro ao criar oferta: ${error.message}` }
    }

    // Revalidar cache da página /ofertas
    revalidatePath('/ofertas')

    // Sucesso - retornar objeto (SEM redirect)
    return { ok: true, id: insertedData?.id }
  } catch (err) {
    if (err instanceof Error) {
      // Erro do getSessionUserAndOrg ou validação
      return { ok: false, error: err.message }
    }
    return { ok: false, error: 'Erro inesperado ao criar oferta.' }
  }
}
