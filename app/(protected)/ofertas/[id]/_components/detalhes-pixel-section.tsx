'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { savePixel, deletePixel } from '@/app/actions/offers'
import type { OfferPixel } from '@/lib/types'
import { X } from 'lucide-react'

interface DetalhesPixelSectionProps {
  offerId: string
}

export function DetalhesPixelSection({ offerId }: DetalhesPixelSectionProps) {
  const supabase = createClient()
  const [pixels, setPixels] = useState<OfferPixel[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    loadPixels()
  }, [offerId])

  const loadPixels = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .schema('offers')
        .from('offer_pixel')
        .select('*')
        .eq('offer_id', offerId)

      if (error) throw error
      setPixels((data as OfferPixel[]) || [])
    } catch (err) {
      console.error('[PIXEL_LOAD]', err)
      toast.error('Erro ao carregar pixel')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    try {
      setFormLoading(true)

      const dto = {
        pixel_meta: formData.get('pixel_meta') as string,
        token: formData.get('token') as string,
        is_active: formData.get('is_active') === 'true',
        notes: (formData.get('notes') as string) || undefined,
      }

      const result = await savePixel(offerId, dto)

      if (!result.success) {
        throw new Error(result.error || 'Erro ao salvar')
      }

      toast.success('Pixel salvo com sucesso')
      setModalOpen(false)
      loadPixels()
      formRef.current?.reset()
    } catch (err) {
      console.error('[PIXEL_SAVE]', err)
      toast.error('Erro ao salvar pixel')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este pixel?')) return

    try {
      const result = await deletePixel(offerId, id)

      if (!result.success) {
        throw new Error(result.error || 'Erro ao excluir')
      }

      toast.success('Pixel excluído')
      loadPixels()
    } catch (err) {
      console.error('[PIXEL_DELETE]', err)
      toast.error('Erro ao excluir pixel')
    }
  }

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token)
    toast.success('Token copiado')
  }

  if (loading) {
    return (
      <aside className="card p-4 md:p-6">
        <h3 className="section-title mb-4">Pixel</h3>
        <p className="muted text-center text-sm">Carregando...</p>
      </aside>
    )
  }

  const pixel = pixels[0] // Assumindo apenas um pixel por oferta

  return (
    <>
      <aside className="card p-4 md:p-6" style={{ boxShadow: 'var(--shadow-gold)' }}>
        <h3 className="section-title mb-4">Pixel</h3>

        {!pixel ? (
          <p className="muted py-8 text-center text-sm">Nenhum pixel configurado</p>
        ) : (
          <dl className="space-y-3 text-sm">
            {/* Título (vindo de notas) */}
            <div className="flex gap-2">
              <dt className="subtitle">Título:</dt>
              <dd className="break-words">{pixel.notes || '—'}</dd>
            </div>

            {/* ID */}
            {pixel.pixel_meta && (
              <div className="flex gap-2">
                <dt className="subtitle">Id:</dt>
                <dd className="break-all">{pixel.pixel_meta}</dd>
              </div>
            )}

            {/* Token */}
            {pixel.token && (
              <div className="flex items-start gap-2">
                <dt className="subtitle">Token:</dt>
                <dd className="min-w-0 flex-1 break-all">{pixel.token}</dd>
                <button onClick={() => handleCopyToken(pixel.token!)} className="btn btn-primary text-xs shrink-0">
                  Copiar
                </button>
              </div>
            )}

            {/* Status */}
            <div className="flex items-center gap-2">
              <span className={pixel.is_active ? 'badge badge--ok' : 'badge'}>
                {pixel.is_active ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </dl>
        )}

        {/* Ações */}
        <div className="mt-4 flex items-center gap-2">
          {pixel && (
            <button onClick={() => handleDelete(pixel.id)} className="btn btn-danger text-xs">
              Excluir
            </button>
          )}
          <button onClick={() => setModalOpen(true)} className="btn btn-primary text-xs">
            {pixel ? 'Editar' : 'Adicionar'}
          </button>
        </div>
      </aside>

      {/* Modal Adicionar/Editar Pixel */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="modal w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between border-b sep p-4">
              <h2 className="section-title">
                {pixel ? 'Editar Pixel' : 'Adicionar Pixel'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="btn btn-ghost p-1"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form ref={formRef} onSubmit={handleSubmit} className="p-4">
              <div className="space-y-4">
                {/* Pixel Meta (ID) */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Pixel Meta (ID) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="pixel_meta"
                    defaultValue={pixel?.pixel_meta || ''}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                    placeholder="ID do pixel Meta"
                    required
                    disabled={formLoading}
                  />
                </div>

                {/* Token */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Token <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="token"
                    defaultValue={pixel?.token || ''}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                    placeholder="Token de acesso"
                    rows={3}
                    required
                    disabled={formLoading}
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    name="is_active"
                    defaultValue={pixel?.is_active ? 'true' : 'false'}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                    disabled={formLoading}
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>

                {/* Notas (rotulado como Título do Pixel) */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Título do Pixel (Notas)
                  </label>
                  <input
                    type="text"
                    name="notes"
                    defaultValue={pixel?.notes || ''}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                    placeholder="Ex: Pixel Principal - Conversão"
                    disabled={formLoading}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  disabled={formLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-[#1A1A1A] transition hover:bg-[#C29F30] disabled:opacity-50"
                  disabled={formLoading}
                >
                  {formLoading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

