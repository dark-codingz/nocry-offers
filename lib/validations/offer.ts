import { z } from 'zod'
import { normalizeUrl, isLikelyUrl } from '@/lib/url'

// Schema de URL opcional (obrigatório)
const urlOptional = z
  .string()
  .trim()
  .min(1, 'Informe uma URL')
  .transform((v) => normalizeUrl(v) ?? '')
  .refine(
    (v) => {
      try {
        new URL(v)
        return true
      } catch {
        return false
      }
    },
    'URL inválida'
  )

// Schema de URL opcional (nullable)
const urlOptionalNullable = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? normalizeUrl(v) : undefined))
  .refine(
    (v) =>
      v
        ? (() => {
            try {
              new URL(v)
              return true
            } catch {
              return false
            }
          })()
        : true,
    'URL inválida'
  )

// Schema para criação de nova oferta (sem org_id, owner_user_id, status)
export const createOfferSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  country: z.string().min(1, 'País é obrigatório'),
  niche: z.string().optional().nullable(),
  ad_library_url: urlOptional, // aceita sem protocolo, normaliza
  original_funnel_url: urlOptional, // idem
  spy_tool_url: urlOptionalNullable, // idem (opcional)
  notes: z.string().optional().nullable(),
  visibility: z.enum(['org', 'private']),
})

// Schema completo para edição de oferta existente
export const offerSchema = z.object({
  org_id: z.string().min(1, 'Organização é obrigatória'),
  name: z.string().min(1, 'Nome é obrigatório'),
  country: z.string().min(1, 'País é obrigatório'),
  niche: z.string().optional(),
  status: z.enum([
    'Descartada',
    'Em análise',
    'Modelando',
    'Rodando',
    'Encerrada',
  ]),
  ad_library_url: urlOptional,
  original_funnel_url: urlOptional,
  spy_tool_url: urlOptionalNullable,
  notes: z.string().optional(),
  visibility: z.enum(['org', 'private']),
  owner_user_id: z.string().optional(),
})

export type CreateOfferFormData = z.infer<typeof createOfferSchema>
export type OfferFormData = z.infer<typeof offerSchema>
