'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { uploadToOffersFiles, getSignedUrl } from '@/lib/storage'
import { insertRecord, deleteRecord } from '@/lib/supabase-insert'
import { STORAGE_BUCKET } from '@/lib/constants'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface OfferPage {
  id: string
  offer_id: string
  name: string
  page_link: string | null
  file_path: string | null
  file_url: string | null // Legado, para compatibilidade
  file_type: string | null
  created_at: string
}

interface DetalhesPaginasSectionProps {
  offerId: string
}

export function DetalhesPaginasSection({ offerId }: DetalhesPaginasSectionProps) {
  const supabase = createClient()
  const [pages, setPages] = useState<OfferPage[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pageLink, setPageLink] = useState<string>('') // Estado controlado para page_link

  useEffect(() => {
    loadPages()
  }, [offerId])

  const loadPages = async () => {
    try {
      setLoading(true)
      console.log('[PAGES_LOAD] Loading from: offers.offer_pages, offer_id:', offerId)
      const { data, error } = await supabase
        .schema('offers')
        .from('offer_pages')
        .select('id, offer_id, name, page_link, file_path, file_url, file_type, created_at')
        .eq('offer_id', offerId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[PAGES_LOAD_ERROR]', error)
        if (error.code === '42P01') {
          toast.error('Tabela (schema offers) não encontrada. Rode as migrações.')
        } else {
          toast.error(`Erro ao carregar páginas: ${error.message}`)
        }
        return
      }

      setPages((data || []) as OfferPage[])
    } catch (err) {
      console.error('[PAGES_LOAD]', err)
      toast.error('Erro ao carregar páginas')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta página?')) return

    try {
      const { error } = await supabase.schema('offers').from('offer_pages').delete().eq('id', id)

      if (error) {
        toast.error(error.message || 'Erro ao excluir página')
      } else {
        toast.success('Página excluída')
        loadPages()
      }
    } catch (err) {
      console.error('[PAGE_DELETE]', err)
      toast.error('Erro ao excluir página')
    }
  }

  const handleDownload = async (page: OfferPage) => {
    try {
      let url: string

      if (page.file_path) {
        // Usar signed URL do path
        url = await getSignedUrl(page.file_path, 60 * 60)
      } else if (page.file_url) {
        // Fallback para URL legada
        url = page.file_url
      } else {
        toast.error('Arquivo não encontrado')
        return
      }

      const a = document.createElement('a')
      a.href = url
      a.download = page.name
      a.click()
    } catch (err) {
      console.error('[DOWNLOAD_ERROR]', err)
      toast.error('Erro ao baixar arquivo')
    }
  }

  const handlePreview = async (page: OfferPage) => {
    try {
      let url: string

      if (page.file_path) {
        // Usar signed URL do path
        url = await getSignedUrl(page.file_path, 60 * 60)
      } else if (page.file_url) {
        // Fallback para URL legada
        url = page.file_url
      } else {
        toast.error('Arquivo não encontrado')
        return
      }

      window.open(url, '_blank')
    } catch (err) {
      console.error('[PREVIEW_ERROR]', err)
      toast.error('Erro ao abrir preview')
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    try {
      setModalLoading(true)
      const formData = new FormData(e.currentTarget)
      const name = formData.get('name') as string
      const pageLinkValue = (formData.get('page_link') as string)?.trim() || null
      const file = fileInputRef.current?.files?.[0]

      let filePath: string | null = null
      let fileType: string | null = null

      if (file) {
        // Upload do arquivo - retorna apenas path
        const uploadResult = await uploadToOffersFiles(`${offerId}/pages`, file)
        filePath = uploadResult.path
        fileType = file.type
      }

      // Salvar no banco com file_path
      const result = await insertRecord('offers', 'offer_pages', {
        offer_id: offerId,
        name,
        page_link: pageLinkValue, // Garantir que vem do estado/formData
        file_path: filePath,
        file_type: fileType,
      })

      if (!result.success) throw new Error(result.error || 'Erro ao salvar página')

      toast.success('Página criada com sucesso')
      setShowModal(false)
      setPageLink('') // Reset estado
      formRef.current?.reset()
      loadPages()
    } catch (err) {
      console.error('[CREATE_PAGE_ERROR]', err)
      if (err instanceof Error && err.message === 'BUCKET_NOT_FOUND') {
        console.error('[Storage] Env URL:', process.env.NEXT_PUBLIC_SUPABASE_URL, 'Bucket:', STORAGE_BUCKET)
        toast.error("Bucket 'offers-files' não encontrado. Verifique suas .env (URL/KEY) do projeto atual.")
      } else if (err instanceof Error && err.message.includes('42P01')) {
        toast.error('Tabela não encontrada (schema offers). Rode o SQL de migração das tabelas offer_pages.')
      } else {
        toast.error(err instanceof Error ? err.message : 'Erro ao criar página')
      }
    } finally {
      setModalLoading(false)
    }
  }

  if (loading) {
    return (
      <section className="card p-4 md:p-6">
        <h3 className="section-title mb-4">Páginas</h3>
        <p className="muted text-center text-sm">Carregando...</p>
      </section>
    )
  }

  return (
    <section className="card p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="section-title">Páginas</h3>
        <button
          onClick={() => {
            setPageLink('') // Reset ao abrir modal
            setShowModal(true)
          }}
          className="btn btn-primary text-xs"
        >
          +Adicionar
        </button>
      </div>

      {pages.length === 0 ? (
        <p className="muted py-8 text-center text-sm">Nenhuma página cadastrada</p>
      ) : (
        <ul className="space-y-3">
          {pages.map((page) => {
            const hasFile = page.file_path || page.file_url

            return (
              <li key={page.id} className="card card--hover flex items-start justify-between gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{page.name}</div>
                  {page.page_link && (
                    <a
                      href={page.page_link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block text-xs text-[var(--brand)] underline underline-offset-2 hover:text-[var(--brand-strong)] break-all"
                    >
                      Visitar
                    </a>
                  )}
                  {page.file_type && (
                    <p className="muted mt-1 text-xs">{page.file_type}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {hasFile && (
                    <>
                      <button onClick={() => handlePreview(page)} className="btn btn-ghost text-xs">
                        Preview
                      </button>
                      <button onClick={() => handleDownload(page)} className="btn btn-primary text-xs">
                        Baixar
                      </button>
                    </>
                  )}
                  <button onClick={() => handleDelete(page.id)} className="btn btn-danger text-xs">
                    Excluir
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Modal Adicionar Página */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="modal w-full max-w-md">
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 p-6">
              <h3 className="section-title mb-4">Adicionar Página</h3>

              <div className="space-y-2">
                <Label htmlFor="name" className="subtitle block">Nome da página</Label>
                <Input id="name" name="name" placeholder="Ex: Landing Page Principal" required className="input w-full" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="page_link" className="subtitle block">Link da Página (opcional)</Label>
                <Input
                  id="page_link"
                  name="page_link"
                  type="url"
                  placeholder="https://exemplo.com"
                  value={pageLink}
                  onChange={(e) => setPageLink(e.target.value)}
                  className="input w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file" className="subtitle block">Arquivo (opcional)</Label>
                <Input
                  ref={fileInputRef}
                  id="file"
                  name="file"
                  type="file"
                  accept=".html,.css,.js,.zip,text/html,text/css,application/javascript,application/zip"
                  className="input w-full"
                />
                <p className="muted text-xs">Aceita HTML, CSS, JS ou ZIP</p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowModal(false)
                    setPageLink('')
                    formRef.current?.reset()
                  }}
                  className="btn btn-ghost"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={modalLoading} className="btn btn-primary">
                  {modalLoading ? 'Criando...' : 'Criar Página'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
