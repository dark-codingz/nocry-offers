'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { createSimplePage, deletePage } from '@/app/actions/offers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { OfferPage } from '@/lib/types'

interface PaginasTabProps {
  offerId: string
}

export function PaginasTab({ offerId }: PaginasTabProps) {
  const supabase = createClient()
  const { showToast } = useToast()
  const [paginas, setPaginas] = useState<OfferPage[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPages()
  }, [offerId])

  const loadPages = async () => {
    try {
      setLoading(true)

      // Log diagnóstico
      console.log('[PAGINAS_LOAD] Iniciando fetch para offerId:', offerId)

      // Query explícita usando campos que existem no schema
      const { data, error } = await supabase
        .schema('offers')
        .from('offer_pages')
        .select('id, offer_id, funnel_type, our_quiz_or_lp, structure_notes, created_at')
        .eq('offer_id', offerId)
        .order('created_at', { ascending: false })

      // Log diagnóstico
      console.log('[PAGINAS_LOAD] Resultado:', {
        error: error?.message,
        count: data?.length || 0,
        data: data?.slice(0, 2),
      })

      if (error) {
        console.error('[PAGINAS_LOAD_ERROR]', error)
        showToast(`⚠️ Erro ao carregar páginas: ${error.message}`, 'error')
      }

      // Mapear dados garantindo campos corretos
      const paginasMapped = (data || []).map((item) => {
        console.log('[PAGINAS_MAP] Page item:', {
          id: item.id,
          funnel_type: item.funnel_type,
          our_quiz_or_lp: item.our_quiz_or_lp,
          has_structure_notes: !!item.structure_notes,
        })

        return {
          id: item.id,
          offer_id: item.offer_id,
          funnel_type: item.funnel_type || undefined,
          our_quiz_or_lp: item.our_quiz_or_lp || undefined,
          structure_notes: item.structure_notes || undefined,
          created_at: item.created_at,
        } as OfferPage
      })

      console.log('[PAGINAS_LOAD] Mapeados:', paginasMapped.length)

      setPaginas(paginasMapped)
    } catch (err) {
      console.error('[PAGINAS_LOAD_EXCEPTION]', err)
      showToast('⚠️ Erro ao carregar páginas', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    try {
      const dto = {
        title: formData.get('title') as string,
        url: (formData.get('url') as string) || undefined,
        notes: (formData.get('notes') as string) || undefined,
      }

      const result = await createSimplePage(offerId, dto)

      if (!result.success) {
        throw new Error(result.error || 'Erro ao salvar')
      }

      showToast('Página salva com sucesso', 'success')
      setShowForm(false)
      loadPages()
      // Reset seguro
      const formEl = e.currentTarget as HTMLFormElement | null
      formEl?.reset()
    } catch (err) {
      console.error('[FUNIL_SAVE]', err)
      showToast(
        `Erro ao salvar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
        'error'
      )
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta página?')) return

    try {
      const result = await deletePage(offerId, id)

      if (!result.success) {
        throw new Error(result.error || 'Erro ao excluir')
      }

      showToast('Página excluída', 'success')
      loadPages()
    } catch (err) {
      console.error('[FUNIL_DELETE]', err)
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
          <CardTitle>Páginas do Funil</CardTitle>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancelar' : 'Adicionar'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <form onSubmit={handleCreate} className="space-y-4 rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-xl">
            <div className="space-y-2">
              <Label htmlFor="title">
                Título <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                name="title"
                placeholder="ex: Landing Page, Quiz Principal, Checkout"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                name="url"
                placeholder="exemplo.com/pagina"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={4}
                placeholder="Observações sobre a página, estrutura, elementos-chave..."
              />
            </div>

            <Button type="submit">Salvar</Button>
          </form>
        )}

        {paginas.length === 0 && !showForm && (
          <p className="text-center text-sm text-muted-foreground">Nenhuma página cadastrada</p>
        )}

        {paginas.map((pagina) => (
          <div key={pagina.id} className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-xl transition hover:bg-white/[0.15]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <h4 className="font-medium text-white/90">{pagina.funnel_type || 'Sem título'}</h4>
                {pagina.our_quiz_or_lp && (
                  <a
                    href={pagina.our_quiz_or_lp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-[#F5C542] hover:underline break-all"
                  >
                    {pagina.our_quiz_or_lp}
                  </a>
                )}
                {pagina.structure_notes && (
                  <p className="whitespace-pre-wrap text-sm text-white/60">
                    {pagina.structure_notes}
                  </p>
                )}
                {!pagina.funnel_type && !pagina.our_quiz_or_lp && !pagina.structure_notes && (
                  <p className="text-sm text-white/40 italic">Sem informações cadastradas</p>
                )}
              </div>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(pagina.id)}>
                Excluir
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
