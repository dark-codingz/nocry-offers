'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { createUpsell, deleteUpsell } from '@/app/actions/offers'
import { uploadToOffersFiles, getSignedUrl } from '@/lib/storage'
import { insertRecord } from '@/lib/supabase-insert'
import { STORAGE_BUCKET } from '@/lib/constants'
import { detectFileType, getFileIcon } from '@/lib/file-types'
import { PreviewLightbox } from '@/components/ui/preview-lightbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { OfferUpsell } from '@/lib/types'

interface UpsellPage {
  id: string
  upsell_id: string
  name: string
  page_link: string | null
  file_path: string | null
  file_url: string | null // Legado
  file_type: string | null
  created_at: string
}

interface UpsellDeliverable {
  id: string
  upsell_id: string
  name: string
  file_path: string | null
  file_url: string | null // Legado
  file_type: string | null
  created_at: string
}

interface UpsellCreative {
  id: string
  upsell_id: string
  name: string
  file_path: string | null
  file_url: string | null // Legado
  file_type: string | null
  created_at: string
}

interface UpsellWithSubsections extends OfferUpsell {
  pages: UpsellPage[]
  deliverables: UpsellDeliverable[]
  creatives: UpsellCreative[]
}

interface DetalhesUpsellsSectionProps {
  offerId: string
}

export function DetalhesUpsellsSection({ offerId }: DetalhesUpsellsSectionProps) {
  const supabase = createClient()
  const [upsells, setUpsells] = useState<UpsellWithSubsections[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [expandedUpsell, setExpandedUpsell] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<{
    url: string
    name: string
    type: 'image' | 'video' | 'pdf' | 'other'
  } | null>(null)

  useEffect(() => {
    loadUpsells()
  }, [offerId])

  const loadUpsells = async () => {
    try {
      setLoading(true)
      console.log('[UPSELLS_LOAD] Loading from: offers.offer_upsells, offer_id:', offerId)
      const { data: upsellsData, error: upsellsError } = await supabase
        .schema('offers')
        .from('offer_upsells')
        .select('id, offer_id, name, created_at')
        .eq('offer_id', offerId)
        .order('created_at', { ascending: false })

      if (upsellsError) {
        console.error('[UPSELLS_LOAD_ERROR]', upsellsError)
        if (upsellsError.code === '42P01') {
          toast.error('Tabela (schema offers) não encontrada. Rode as migrações.')
        } else {
          toast.error(`Erro ao carregar upsells: ${upsellsError.message}`)
        }
        return
      }

      // Carregar subseções para cada upsell
      const upsellsWithSubsections = await Promise.all(
        (upsellsData || []).map(async (upsell) => {
          const [pagesRes, deliverablesRes, creativesRes] = await Promise.all([
            supabase
              .schema('offers')
              .from('upsell_pages')
              .select('id, upsell_id, name, page_link, file_path, file_url, file_type, created_at')
              .eq('upsell_id', upsell.id)
              .order('created_at', { ascending: false }),
            supabase
              .schema('offers')
              .from('upsell_deliverables')
              .select('id, upsell_id, name, file_path, file_url, file_type, created_at')
              .eq('upsell_id', upsell.id)
              .order('created_at', { ascending: false }),
            supabase
              .schema('offers')
              .from('upsell_creatives')
              .select('id, upsell_id, name, file_path, file_url, file_type, created_at')
              .eq('upsell_id', upsell.id)
              .order('created_at', { ascending: false }),
          ])

          return {
            id: upsell.id,
            offer_id: upsell.offer_id,
            upsell_name: upsell.name || 'Sem nome',
            name: upsell.name || 'Sem nome',
            created_at: upsell.created_at,
            pages: (pagesRes.data || []) as UpsellPage[],
            deliverables: (deliverablesRes.data || []) as UpsellDeliverable[],
            creatives: (creativesRes.data || []) as UpsellCreative[],
          } as UpsellWithSubsections
        })
      )

      setUpsells(upsellsWithSubsections)
    } catch (err) {
      console.error('[UPSELLS_LOAD]', err)
      toast.error('Erro ao carregar upsells')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    try {
      setCreateLoading(true)
      const name = formData.get('name') as string

      const result = await createUpsell(offerId, { name })

      if (!result.success) throw new Error(result.error || 'Erro ao criar')

      toast.success('Upsell criado com sucesso')
      setShowCreateModal(false)
      loadUpsells()
      e.currentTarget.reset()
    } catch (err) {
      console.error('[CREATE_UPSELL_ERROR]', err)
      toast.error(err instanceof Error ? err.message : 'Erro ao criar upsell')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir o upsell "${name}"? Esta ação não pode ser desfeita.`)) return

    try {
      const result = await deleteUpsell(offerId, id)
      if (!result.success) throw new Error(result.error)
      toast.success('Upsell excluído')
      loadUpsells()
    } catch (err) {
      console.error('[DELETE_UPSELL_ERROR]', err)
      toast.error('Erro ao excluir upsell')
    }
  }

  const handleUploadPage = async (upsellId: string, name: string, pageLink: string | null, file: File | null) => {
    try {
      let filePath: string | null = null
      let fileType: string | null = null

      if (file) {
        const uploadResult = await uploadToOffersFiles(`${offerId}/upsells/${upsellId}/pages`, file)
        filePath = uploadResult.path
        fileType = file.type
      }

      const result = await insertRecord('offers', 'upsell_pages', {
        upsell_id: upsellId,
        name,
        page_link: pageLink,
        file_path: filePath,
        file_type: fileType,
      })

      if (!result.success) {
        if (result.error.includes('42P01')) {
          throw new Error('TABLE_NOT_FOUND:upsell_pages')
        }
        throw new Error(result.error)
      }

      toast.success('Página adicionada com sucesso')
      loadUpsells()
    } catch (err) {
      console.error('[UPSELL_PAGE_UPLOAD_ERROR]', err)
      if (err instanceof Error && err.message === 'BUCKET_NOT_FOUND') {
        console.error('[Storage] Env URL:', process.env.NEXT_PUBLIC_SUPABASE_URL, 'Bucket:', STORAGE_BUCKET)
        toast.error("Bucket 'offers-files' não encontrado. Verifique suas .env (URL/KEY) do projeto atual.")
      } else if (err instanceof Error && err.message.includes('42P01')) {
        toast.error('Tabela (schema offers) não encontrada. Rode as migrações.')
      } else {
        toast.error(err instanceof Error ? err.message : 'Erro ao enviar página')
      }
    }
  }

  const handleUploadDeliverable = async (upsellId: string, file: File) => {
    try {
      const uploadResult = await uploadToOffersFiles(`${offerId}/upsells/${upsellId}/deliverables`, file)

      const result = await insertRecord('offers', 'upsell_deliverables', {
        upsell_id: upsellId,
        name: file.name,
        file_path: uploadResult.path,
        file_type: file.type || null,
      })

      if (!result.success) {
        if (result.error.includes('42P01')) {
          throw new Error('TABLE_NOT_FOUND:upsell_deliverables')
        }
        throw new Error(result.error)
      }

      toast.success('Entregável adicionado com sucesso')
      loadUpsells()
    } catch (err) {
      console.error('[UPSELL_DELIVERABLE_UPLOAD_ERROR]', err)
      if (err instanceof Error && err.message === 'BUCKET_NOT_FOUND') {
        console.error('[Storage] Env URL:', process.env.NEXT_PUBLIC_SUPABASE_URL, 'Bucket:', STORAGE_BUCKET)
        toast.error("Bucket 'offers-files' não encontrado. Verifique suas .env (URL/KEY) do projeto atual.")
      } else if (err instanceof Error && err.message.includes('42P01')) {
        toast.error('Tabela (schema offers) não encontrada. Rode as migrações.')
      } else {
        toast.error(err instanceof Error ? err.message : 'Erro ao enviar entregável')
      }
    }
  }

  const handleUploadCreative = async (upsellId: string, file: File) => {
    try {
      const uploadResult = await uploadToOffersFiles(`${offerId}/upsells/${upsellId}/images`, file)

      const result = await insertRecord('offers', 'upsell_creatives', {
        upsell_id: upsellId,
        name: file.name,
        file_path: uploadResult.path,
        file_type: file.type || null,
      })

      if (!result.success) {
        if (result.error.includes('42P01')) {
          throw new Error('TABLE_NOT_FOUND:upsell_creatives')
        }
        throw new Error(result.error)
      }

      toast.success('Imagem adicionada com sucesso')
      loadUpsells()
    } catch (err) {
      console.error('[UPSELL_CREATIVE_UPLOAD_ERROR]', err)
      if (err instanceof Error && err.message === 'BUCKET_NOT_FOUND') {
        console.error('[Storage] Env URL:', process.env.NEXT_PUBLIC_SUPABASE_URL, 'Bucket:', STORAGE_BUCKET)
        toast.error("Bucket 'offers-files' não encontrado. Verifique suas .env (URL/KEY) do projeto atual.")
      } else if (err instanceof Error && err.message.includes('42P01')) {
        toast.error('Tabela (schema offers) não encontrada. Rode as migrações.')
      } else {
        toast.error(err instanceof Error ? err.message : 'Erro ao enviar imagem')
      }
    }
  }

  const handleDeleteSubsection = async (
    upsellId: string,
    type: 'pages' | 'deliverables' | 'creatives',
    id: string,
    name: string
  ) => {
    if (!confirm(`Excluir "${name}"?`)) return

    try {
      const tableName = `upsell_${type}` as 'upsell_pages' | 'upsell_deliverables' | 'upsell_creatives'
      const { error } = await supabase.schema('offers').from(tableName).delete().eq('id', id)

      if (error) {
        toast.error(error.message || 'Erro ao excluir item')
      } else {
        toast.success('Item excluído')
        loadUpsells()
      }
    } catch (err) {
      console.error('[DELETE_SUBSECTION_ERROR]', err)
      toast.error('Erro ao excluir item')
    }
  }

  const handlePreview = async (item: UpsellPage | UpsellDeliverable | UpsellCreative) => {
    try {
      let url: string

      if (item.file_path) {
        // Usar signed URL do path
        url = await getSignedUrl(item.file_path, 60 * 60)
      } else if (item.file_url) {
        // Fallback para URL legada
        url = item.file_url
      } else {
        toast.error('Arquivo não encontrado')
        return
      }

      const type = detectFileType(url, item.file_type || undefined)
      const previewType = type === 'video' ? 'video' : type === 'image' ? 'image' : type === 'pdf' ? 'pdf' : 'other'
      setPreviewFile({ url, name: item.name, type: previewType })
    } catch (err) {
      console.error('[PREVIEW_ERROR]', err)
      toast.error('Erro ao abrir preview')
    }
  }

  const handleDownload = async (item: UpsellPage | UpsellDeliverable | UpsellCreative) => {
    try {
      let url: string

      if (item.file_path) {
        // Usar signed URL do path
        url = await getSignedUrl(item.file_path, 60 * 60)
      } else if (item.file_url) {
        // Fallback para URL legada
        url = item.file_url
      } else {
        toast.error('Arquivo não encontrado')
        return
      }

      const a = document.createElement('a')
      a.href = url
      a.download = item.name
      a.click()
    } catch (err) {
      console.error('[DOWNLOAD_ERROR]', err)
      toast.error('Erro ao baixar arquivo')
    }
  }

  if (loading) {
    return (
      <section className="card p-4 md:p-6">
        <h3 className="section-title mb-4">Upsells</h3>
        <p className="muted py-8 text-center text-sm">Carregando...</p>
      </section>
    )
  }

  return (
    <section className="card p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="section-title">Upsells</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary text-xs"
        >
          +Adicionar Upsell
        </button>
      </div>

      {upsells.length === 0 ? (
        <div className="card flex min-h-[120px] items-center justify-center border-dashed">
          <div className="text-center">
            <p className="muted text-sm">Nenhum upsell cadastrado</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {upsells.map((upsell) => (
            <div key={upsell.id} className="card p-4">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="section-title text-base">{upsell.upsell_name}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExpandedUpsell(expandedUpsell === upsell.id ? null : upsell.id)}
                    className="btn btn-ghost text-xs"
                  >
                    {expandedUpsell === upsell.id ? 'Ocultar' : 'Expandir'}
                  </button>
                  <button
                    onClick={() => handleDelete(upsell.id, upsell.upsell_name)}
                    className="btn btn-danger text-xs"
                  >
                    Excluir
                  </button>
                </div>
              </div>

              {expandedUpsell === upsell.id && (
                <div className="mt-4 space-y-4 border-t sep pt-4">
                  {/* Páginas */}
                  <UpsellSubsection
                    title="Páginas"
                    items={upsell.pages}
                    upsellId={upsell.id}
                    type="pages"
                    onUploadPage={(name, link, file) => handleUploadPage(upsell.id, name, link, file)}
                    onDelete={(id, name) => handleDeleteSubsection(upsell.id, 'pages', id, name)}
                    onPreview={handlePreview}
                    onDownload={handleDownload}
                  />

                  {/* Entregáveis */}
                  <UpsellSubsection
                    title="Entregáveis"
                    items={upsell.deliverables}
                    upsellId={upsell.id}
                    type="deliverables"
                    onUpload={(file) => handleUploadDeliverable(upsell.id, file)}
                    onDelete={(id, name) => handleDeleteSubsection(upsell.id, 'deliverables', id, name)}
                    onPreview={handlePreview}
                    onDownload={handleDownload}
                  />

                  {/* Imagens */}
                  <UpsellSubsection
                    title="Imagens"
                    items={upsell.creatives}
                    upsellId={upsell.id}
                    type="creatives"
                    onUpload={(file) => handleUploadCreative(upsell.id, file)}
                    onDelete={(id, name) => handleDeleteSubsection(upsell.id, 'creatives', id, name)}
                    onPreview={handlePreview}
                    onDownload={handleDownload}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar Upsell */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="modal w-full max-w-md">
            <form onSubmit={handleCreate} className="space-y-4 p-6">
              <h3 className="section-title mb-4">Criar Upsell</h3>

              <div className="space-y-2">
                <Label htmlFor="upsell-name" className="subtitle block">Nome</Label>
                <Input id="upsell-name" name="name" placeholder="Ex: Upsell Premium" required className="input w-full" />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="btn btn-ghost">
                  Cancelar
                </Button>
                <Button type="submit" disabled={createLoading} className="btn btn-primary">
                  {createLoading ? 'Criando...' : 'Criar Upsell'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Preview */}
      {previewFile && (
        <PreviewLightbox
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          fileType={previewFile.type}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </section>
  )
}

interface UpsellSubsectionProps {
  title: string
  items: UpsellPage[] | UpsellDeliverable[] | UpsellCreative[]
  upsellId: string
  type: 'pages' | 'deliverables' | 'creatives'
  onUploadPage?: (name: string, link: string | null, file: File | null) => void
  onUpload?: (file: File) => void
  onDelete: (id: string, name: string) => void
  onPreview: (item: UpsellPage | UpsellDeliverable | UpsellCreative) => void
  onDownload: (item: UpsellPage | UpsellDeliverable | UpsellCreative) => void
}

function UpsellSubsection({
  title,
  items,
  upsellId,
  type,
  onUploadPage,
  onUpload,
  onDelete,
  onPreview,
  onDownload,
}: UpsellSubsectionProps) {
  const [showModal, setShowModal] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const acceptMap = {
    pages: '.html,.css,.js,.zip',
    deliverables: '.pdf,.zip,.rar',
    creatives: 'image/*,video/*',
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    if (type === 'pages' && onUploadPage) {
      const name = formData.get('name') as string
      const pageLink = (formData.get('page_link') as string)?.trim() || null
      const file = fileInputRef.current?.files?.[0] || null
      await onUploadPage(name, pageLink, file)
    } else if (onUpload) {
      const file = fileInputRef.current?.files?.[0]
      if (file) await onUpload(file)
    }

    setShowModal(false)
    formRef.current?.reset()
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h5 className="subtitle">{title}</h5>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary text-xs"
        >
          +Adicionar
        </button>
      </div>

      {items.length === 0 ? (
        <p className="muted text-xs italic">Nenhum item cadastrado</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => {
            const hasFile = item.file_path || item.file_url
            const fileType = detectFileType(item.file_path || item.file_url || '', item.file_type || undefined)
            const fileIcon = getFileIcon(fileType)
            const isPage = 'page_link' in item

            return (
              <div
                key={item.id}
                className="card card--hover flex items-center justify-between gap-2 p-2 text-xs"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {hasFile && <span>{fileIcon}</span>}
                  <div className="min-w-0 flex-1">
                    <span className="truncate block">{item.name}</span>
                    {isPage && item.page_link && (
                      <a
                        href={item.page_link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--brand)] hover:text-[var(--brand-strong)] hover:underline text-[10px]"
                      >
                        Visitar
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {hasFile && fileType !== 'zip' && fileType !== 'file' && (
                    <button
                      onClick={() => onPreview(item)}
                      className="btn btn-ghost text-xs px-1.5 py-0.5"
                    >
                      Preview
                    </button>
                  )}
                  {hasFile && (
                    <button
                      onClick={() => onDownload(item)}
                      className="btn btn-primary text-xs px-1.5 py-0.5"
                    >
                      Baixar
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(item.id, item.name)}
                    className="btn btn-danger text-xs px-1.5 py-0.5"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Adicionar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="modal w-full max-w-md">
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 p-6">
              <h3 className="section-title mb-4">Adicionar {title}</h3>

              {type === 'pages' ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name" className="subtitle block">Nome (obrigatório)</Label>
                    <Input id="name" name="name" required className="input w-full" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="page_link" className="subtitle block">Link da Página (opcional)</Label>
                    <Input id="page_link" name="page_link" type="url" placeholder="https://exemplo.com" className="input w-full" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="file" className="subtitle block">Arquivo (opcional)</Label>
                    <Input
                      ref={fileInputRef}
                      id="file"
                      name="file"
                      type="file"
                      accept={acceptMap[type]}
                      className="input w-full"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="file" className="subtitle block">Arquivo</Label>
                  <Input
                    ref={fileInputRef}
                    id="file"
                    name="file"
                    type="file"
                    accept={acceptMap[type]}
                    required
                    className="input w-full"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="btn btn-ghost">
                  Cancelar
                </Button>
                <Button type="submit" className="btn btn-primary">Adicionar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
