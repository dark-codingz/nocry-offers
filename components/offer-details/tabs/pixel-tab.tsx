'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { savePixel, deletePixel, togglePixelActive } from '@/app/actions/offers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { OfferPixel } from '@/lib/types'

interface PixelTabProps {
  offerId: string
}

export function PixelTab({ offerId }: PixelTabProps) {
  const supabase = createClient()
  const { showToast } = useToast()
  const formRef = useRef<HTMLFormElement>(null)
  const [pixels, setPixels] = useState<OfferPixel[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

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
      showToast('Erro ao carregar pixels', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    try {
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

      showToast('Pixel salvo com sucesso', 'success')
      setShowForm(false)
      loadPixels()
      formRef.current?.reset()
    } catch (err) {
      console.error('[PIXEL_SAVE]', err)
      showToast(`Erro ao salvar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`, 'error')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este pixel?')) return

    try {
      const result = await deletePixel(offerId, id)

      if (!result.success) {
        throw new Error(result.error || 'Erro ao excluir')
      }

      showToast('Pixel excluído', 'success')
      loadPixels()
    } catch (err) {
      console.error('[PIXEL_DELETE]', err)
      showToast('Erro ao excluir', 'error')
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const result = await togglePixelActive(offerId, id, currentStatus)

      if (!result.success) {
        throw new Error(result.error || 'Erro ao atualizar')
      }

      showToast(`Pixel ${!currentStatus ? 'ativado' : 'desativado'}`, 'success')
      loadPixels()
    } catch (err) {
      console.error('[PIXEL_TOGGLE]', err)
      showToast('Erro ao atualizar status', 'error')
    }
  }

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token)
    showToast('Token copiado para área de transferência', 'success')
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Configuração de Pixel</CardTitle>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancelar' : 'Adicionar'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <form ref={formRef} onSubmit={handleCreate} className="space-y-4 rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-xl">
            <div className="space-y-2">
              <Label htmlFor="pixel_meta">Pixel Meta</Label>
              <Input
                id="pixel_meta"
                name="pixel_meta"
                placeholder="ID do pixel Meta"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="token">Token</Label>
              <div className="flex gap-2">
                <Input
                  id="token"
                  name="token"
                  type="text"
                  placeholder="Token de acesso"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="is_active">Status</Label>
              <select
                id="is_active"
                name="is_active"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" name="notes" rows={3} placeholder="Observações..." />
            </div>

            <Button type="submit">Salvar</Button>
          </form>
        )}

        {pixels.length === 0 && !showForm && (
          <p className="text-center text-sm text-muted-foreground">Nenhum pixel configurado</p>
        )}

        {pixels.map((pixel) => (
          <div key={pixel.id} className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-xl transition hover:bg-white/[0.15]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <h4 className="font-medium">Pixel Meta</h4>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      pixel.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {pixel.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                {pixel.pixel_meta && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Pixel ID</Label>
                    <p className="text-sm font-mono">{pixel.pixel_meta}</p>
                  </div>
                )}

                {pixel.token && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Token</Label>
                    <div className="flex items-start gap-2">
                      <p className="flex-1 break-all font-mono text-sm text-white/80 max-w-[600px] leading-relaxed">{pixel.token}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyToken(pixel.token!)}
                        className="shrink-0"
                      >
                        Copiar
                      </Button>
                    </div>
                  </div>
                )}

                {pixel.notes && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Notas</Label>
                    <p className="text-sm text-muted-foreground">{pixel.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleActive(pixel.id, pixel.is_active || false)}
                >
                  {pixel.is_active ? 'Desativar' : 'Ativar'}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(pixel.id)}>
                  Excluir
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
