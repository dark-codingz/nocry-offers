'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { offerSchema, type OfferFormData } from '@/lib/validations/offer'
import { normalizeUrl } from '@/lib/url'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useOffer } from '@/hooks/use-offer'
import type { Offer } from '@/lib/types'

interface ResumoTabProps {
  offer: Offer
}

export function ResumoTab({ offer }: ResumoTabProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const { updateOffer } = useOffer(offer.id)
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<OfferFormData>({
    resolver: zodResolver(offerSchema),
    defaultValues: offer,
  })

  const onSubmit = async (data: OfferFormData) => {
    setIsSubmitting(true)

    try {
      // Normalizar URLs
      const normalizedData = {
        ...data,
        ad_library_url: normalizeUrl(data.ad_library_url),
        original_funnel_url: normalizeUrl(data.original_funnel_url),
        spy_tool_url: normalizeUrl(data.spy_tool_url),
      }

      const result = await updateOffer(normalizedData)

      if (result.success) {
        showToast('Oferta atualizada com sucesso', 'success')
        setIsEditing(false)
        router.refresh()
      } else {
        showToast(result.error || 'Erro ao salvar alterações', 'error')
      }
    } catch (err) {
      console.error('[RESUMO_SAVE]', err)
      showToast('Erro inesperado ao salvar', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    reset(offer)
    setIsEditing(false)
  }

  if (!isEditing) {
    return (
      <div className="space-y-6">
        {/* Botão de edição */}
        <div className="flex justify-end">
          <Button onClick={() => setIsEditing(true)}>Editar</Button>
        </div>

        {/* Cards minimalistas com informações principais */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* País */}
          <div className="group rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-xl transition hover:border-white/30 hover:bg-white/[0.15]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                <svg
                  className="h-5 w-5 text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs text-white/50">País</p>
                <p className="font-semibold text-white">{offer.country}</p>
              </div>
            </div>
          </div>

          {/* Nicho */}
          {offer.niche && (
            <div className="group rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-xl transition hover:border-white/30 hover:bg-white/[0.15]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
                  <svg
                    className="h-5 w-5 text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-white/50">Nicho</p>
                  <p className="font-semibold text-white">{offer.niche}</p>
                </div>
              </div>
            </div>
          )}

          {/* Ad Library */}
          <a
            href={offer.ad_library_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-xl transition hover:border-yellow-400/50 hover:bg-white/[0.15]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs text-white/50">Ad Library</p>
                <p className="truncate font-semibold text-white group-hover:text-yellow-400">
                  Ver anúncios →
                </p>
              </div>
            </div>
          </a>

          {/* Funil Original */}
          <a
            href={offer.original_funnel_url}
            target="_blank"
            rel="noopener noreferrer"
              className="group rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-xl transition hover:border-green-400/50 hover:bg-white/[0.15]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10">
                <svg
                  className="h-5 w-5 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs text-white/50">Funil Original</p>
                <p className="truncate font-semibold text-white group-hover:text-green-400">
                  Ver funil →
                </p>
              </div>
            </div>
          </a>

          {/* Spy Tool (se existir) */}
          {offer.spy_tool_url && (
            <a
              href={offer.spy_tool_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-xl transition hover:border-pink-400/50 hover:bg-white/[0.15]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10">
                  <svg
                    className="h-5 w-5 text-pink-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-white/50">Spy Tool</p>
                  <p className="truncate font-semibold text-white group-hover:text-pink-400">
                    Ver espionagem →
                  </p>
                </div>
              </div>
            </a>
          )}
        </div>

        {/* Notas (se existir) */}
        {offer.notes && (
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-xl">
            <p className="mb-2 text-xs text-white/50">Notas</p>
            <p className="whitespace-pre-wrap text-sm text-white/80">{offer.notes}</p>
          </div>
        )}
      </div>
    )
  }

  // Modo de edição
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">
            Nome <span className="text-destructive">*</span>
          </Label>
          <Input id="name" {...register('name')} disabled={isSubmitting} />
          {errors.name?.message && <p className="text-sm text-destructive">{String(errors.name.message)}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">
            País <span className="text-destructive">*</span>
          </Label>
          <Input id="country" {...register('country')} disabled={isSubmitting} />
          {errors.country && (
            <p className="text-sm text-destructive">{String(errors.country.message)}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="niche">Nicho</Label>
          <Input id="niche" {...register('niche')} disabled={isSubmitting} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">
            Status <span className="text-destructive">*</span>
          </Label>
          <Select id="status" {...register('status')} disabled={isSubmitting}>
            <option value="Descartada">Descartada</option>
            <option value="Em análise">Em análise</option>
            <option value="Modelando">Modelando</option>
            <option value="Rodando">Rodando</option>
            <option value="Encerrada">Encerrada</option>
          </Select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="ad_library_url">
            Ad Library URL <span className="text-destructive">*</span>
          </Label>
          <Input
            id="ad_library_url"
            {...register('ad_library_url')}
            placeholder="facebook.com/ads/library/..."
            disabled={isSubmitting}
          />
          {errors.ad_library_url?.message && (
            <p className="text-sm text-destructive">{String(errors.ad_library_url.message)}</p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="original_funnel_url">
            Funil Original URL <span className="text-destructive">*</span>
          </Label>
          <Input
            id="original_funnel_url"
            {...register('original_funnel_url')}
            placeholder="quiz.the.coach/..."
            disabled={isSubmitting}
          />
          {errors.original_funnel_url?.message && (
            <p className="text-sm text-destructive">{String(errors.original_funnel_url.message)}</p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="spy_tool_url">Spy Tool URL</Label>
          <Input
            id="spy_tool_url"
            {...register('spy_tool_url')}
            placeholder="adspy.com/..."
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="visibility">
            Visibilidade <span className="text-destructive">*</span>
          </Label>
          <Select id="visibility" {...register('visibility')} disabled={isSubmitting}>
            <option value="org">NoCry (Geral)</option>
            <option value="private">Apenas para mim</option>
          </Select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Notas</Label>
          <Textarea
            id="notes"
            {...register('notes')}
            rows={4}
            placeholder="Observações sobre a oferta..."
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : 'Salvar'}
        </Button>
        <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
