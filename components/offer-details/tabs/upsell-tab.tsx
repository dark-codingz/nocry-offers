'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { createUpsell, deleteUpsell } from '@/app/actions/offers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { OfferUpsell } from '@/lib/types'

interface UpsellTabProps {
  offerId: string
}

export function UpsellTab({ offerId }: UpsellTabProps) {
  const supabase = createClient()
  const { showToast } = useToast()
  const [upsells, setUpsells] = useState<OfferUpsell[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUpsells()
  }, [offerId])

  const loadUpsells = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .schema('offers')
        .from('offer_upsells')
        .select('*')
        .eq('offer_id', offerId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setUpsells((data as OfferUpsell[]) || [])
    } catch (err) {
      console.error('[UPSELL_LOAD]', err)
      showToast('Erro ao carregar upsells', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    try {
      const price = formData.get('price') as string

      const dto = {
        name: formData.get('name') as string,
        price: price ? parseFloat(price) : undefined,
        page_link: (formData.get('page_link') as string) || undefined,
        short_desc: (formData.get('short_desc') as string) || undefined,
        notes: (formData.get('notes') as string) || undefined,
      }

      const result = await createUpsell(offerId, dto)

      if (!result.success) {
        throw new Error(result.error || 'Erro ao salvar')
      }

      showToast('Upsell salvo com sucesso', 'success')
      setShowForm(false)
      loadUpsells()
      
      // Reset seguro do formulário
      const form = e.currentTarget as HTMLFormElement | null
      form?.reset()
    } catch (err) {
      console.error('[UPSELL_SAVE]', err)
      showToast(
        `Erro ao salvar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
        'error'
      )
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este upsell?')) return

    try {
      const result = await deleteUpsell(offerId, id)

      if (!result.success) {
        throw new Error(result.error || 'Erro ao excluir')
      }

      showToast('Upsell excluído', 'success')
      loadUpsells()
    } catch (err) {
      console.error('[UPSELL_DELETE]', err)
      showToast('Erro ao excluir', 'error')
    }
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
          <CardTitle>Upsells</CardTitle>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancelar' : 'Adicionar'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <form onSubmit={handleCreate} className="space-y-4 rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-xl">
            <div className="space-y-2">
              <Label htmlFor="name">
                Nome do Upsell <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="ex: Upsell 1, Oferta Especial"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Preço (R$)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                placeholder="97.00"
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="page_link">Link da Página</Label>
              <Input
                id="page_link"
                name="page_link"
                placeholder="upsell.example.com/oferta"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="short_desc">Descrição Curta</Label>
              <Textarea
                id="short_desc"
                name="short_desc"
                rows={3}
                placeholder="Descreva o upsell..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" name="notes" rows={2} placeholder="Observações..." />
            </div>

            <Button type="submit">Salvar</Button>
          </form>
        )}

        {upsells.length === 0 && !showForm && (
          <p className="text-center text-sm text-muted-foreground">Nenhum upsell cadastrado</p>
        )}

        {upsells.map((upsell) => (
          <div key={upsell.id} className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-xl transition hover:bg-white/[0.15]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <h4 className="font-medium">{upsell.upsell_name}</h4>
                  {upsell.price !== null && upsell.price !== undefined && (
                    <span className="text-sm font-medium text-green-600">
                      R$ {upsell.price.toFixed(2)}
                    </span>
                  )}
                </div>
                {upsell.description && (
                  <p className="text-sm text-muted-foreground">{upsell.description}</p>
                )}
              </div>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(upsell.id)}>
                Excluir
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
