'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Package } from 'lucide-react'
import type { OfferCreativeOriginal, OfferCreativeModeled } from '@/lib/types'
import { detectFileType, getFileIcon, downloadFileSmart, resolvePreviewUrl } from '@/lib/file-types'
import { PreviewLightbox } from '@/components/ui/preview-lightbox'
import { deleteCreativeOriginal, deleteCreativeModeled, saCreateCreativeOriginal, createCreativeModeled } from '@/app/actions/offers'
import { DropZone } from '@/components/ui/drop-zone'
import { UploadMetadataDialog, type FileWithMetadata } from '@/components/ui/upload-metadata-dialog'
import { uploadFile, extractFileMetadata } from '@/lib/upload'

interface DetalhesCriativosSectionProps {
  offerId: string
}

export function DetalhesCriativosSection({ offerId }: DetalhesCriativosSectionProps) {
  const supabase = createClient()
  const [originais, setOriginais] = useState<OfferCreativeOriginal[]>([])
  const [modelados, setModelados] = useState<OfferCreativeModeled[]>([])
  const [loading, setLoading] = useState(true)
  const [previewFile, setPreviewFile] = useState<{
    url: string
    name: string
    type: 'image' | 'video' | 'pdf' | 'other'
  } | null>(null)
  const [metadataDialogFiles, setMetadataDialogFiles] = useState<File[] | null>(null)
  const [metadataDialogKind, setMetadataDialogKind] = useState<'original' | 'modeled'>('original')

  useEffect(() => {
    loadCreatives()
  }, [offerId])

  const loadCreatives = async () => {
    try {
      setLoading(true)

      const [originalRes, modeledRes] = await Promise.all([
        supabase
          .schema('offers')
          .from('offer_creatives_original')
          .select('id, offer_id, ref_name, format, ad_link, copy, preview_url, captured_at, notes, created_at')
          .eq('offer_id', offerId)
          .order('created_at', { ascending: false }),
        supabase
          .schema('offers')
          .from('offer_creatives_modeled')
          .select('id, offer_id, internal_name, asset_url, meta_ads_link, copy, status, notes, created_at')
          .eq('offer_id', offerId)
          .order('created_at', { ascending: false }),
      ])

      if (originalRes.error) throw originalRes.error
      if (modeledRes.error) throw modeledRes.error

      const originaisMapped = (originalRes.data || []).map((item) => ({
        id: item.id,
        offer_id: item.offer_id,
        ref_name: item.ref_name || 'Sem nome',
        format: item.format || 'Arquivo',
        ad_link: item.ad_link || undefined,
        copy: item.copy || undefined,
        preview_url: item.preview_url || undefined,
        captured_at: item.captured_at || undefined,
        notes: item.notes || undefined,
        created_at: item.created_at,
      })) as unknown as OfferCreativeOriginal[]

      const modeladosMapped = (modeledRes.data || []).map((item) => ({
        id: item.id,
        offer_id: item.offer_id,
        internal_name: item.internal_name || 'Sem nome',
        asset_url: item.asset_url || undefined,
        meta_ads_link: item.meta_ads_link || undefined,
        copy: item.copy || undefined,
        status: item.status || undefined,
        notes: item.notes || undefined,
        created_at: item.created_at,
      })) as unknown as OfferCreativeModeled[]

      setOriginais(originaisMapped)
      setModelados(modeladosMapped)
    } catch (err) {
      console.error('[CRIATIVOS_LOAD]', err)
      toast.error('Erro ao carregar criativos')
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = async (url: string, name: string, format?: string) => {
    const type = detectFileType(url, format)
    const previewType = type === 'video' ? 'video' : type === 'image' ? 'image' : type === 'pdf' ? 'pdf' : 'other'
    const previewUrl = await resolvePreviewUrl(url)
    setPreviewFile({ url: previewUrl, name, type: previewType })
  }

  const handleDownload = async (url: string, name: string) => {
    await downloadFileSmart(url, name)
  }

  const handleDeleteOriginal = async (id: string, name: string) => {
    if (!confirm(`Excluir "${name}"? Esta ação não pode ser desfeita.`)) return

    try {
      const result = await deleteCreativeOriginal(offerId, id)
      if (!result.success) throw new Error(result.error)
      toast.success('Criativo excluído')
      loadCreatives()
    } catch (err) {
      console.error('[DELETE_ORIGINAL_ERROR]', err)
      toast.error('Erro ao excluir criativo')
    }
  }

  const handleDeleteModeled = async (id: string, name: string) => {
    if (!confirm(`Excluir "${name}"? Esta ação não pode ser desfeita.`)) return

    try {
      const result = await deleteCreativeModeled(offerId, id)
      if (!result.success) throw new Error(result.error)
      toast.success('Criativo excluído')
      loadCreatives()
    } catch (err) {
      console.error('[DELETE_MODELED_ERROR]', err)
      toast.error('Erro ao excluir criativo')
    }
  }

  const handleFilesSelected = (files: File[]) => {
    setMetadataDialogFiles(files)
    setMetadataDialogKind('original')
  }

  const handleModeledFilesSelected = (files: File[]) => {
    setMetadataDialogFiles(files)
    setMetadataDialogKind('modeled')
  }

  const handleUploadWithMetadata = async (filesWithMetadata: FileWithMetadata[]) => {
    setMetadataDialogFiles(null)

    toast.promise(
      Promise.all(
        filesWithMetadata.map(async (fileData) => {
          try {
            const metadata = await extractFileMetadata(fileData.file)
            const category = fileData.kind === 'original' ? 'creatives_original' : 'creatives_modeled'
            
            const result = await uploadFile(fileData.file, offerId, category)
            if (!result.success) throw new Error(result.error || 'Erro ao enviar')

            if (fileData.kind === 'original') {
              const dto = {
                ref_name: fileData.name,
                format: fileData.type === 'video' ? 'Vídeo' : fileData.type === 'image' ? 'Imagem' : fileData.type.toUpperCase(),
                preview_url: result.publicUrl || '', // URL pública completa
              }
              const res = await saCreateCreativeOriginal(offerId, dto)
              if (!res.ok) throw new Error(res.error?.message || 'Erro ao salvar')
            } else {
              const dto = {
                internal_name: fileData.name,
                asset_url: result.publicUrl || '', // URL pública completa
              }
              const res = await createCreativeModeled(offerId, dto)
              if (!res.success) throw new Error(res.error || 'Erro ao salvar')
            }
          } catch (err) {
            console.error('[UPLOAD_ERROR]', err)
            throw err
          }
        })
      ),
      {
        loading: 'Enviando arquivos...',
        success: () => {
          loadCreatives()
          return 'Arquivos enviados com sucesso'
        },
        error: (err) => `Erro ao enviar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
      }
    )
  }

  if (loading) {
    return (
      <section className="card p-4 md:p-6">
        <h3 className="section-title mb-4">Criativos</h3>
        <p className="muted py-8 text-center text-sm">Carregando...</p>
      </section>
    )
  }

  return (
    <section className="card p-4 md:p-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Criativos Originais */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="section-title text-base">Criativos Originais</h4>
            <button
              onClick={() => document.getElementById('upload-original')?.click()}
              className="btn btn-primary text-xs"
            >
              +Adicionar
            </button>
            <input
              id="upload-original"
              type="file"
              className="hidden"
              multiple
              accept="image/*,video/*,.pdf"
              onChange={(e) => {
                const files = Array.from(e.target.files || [])
                if (files.length) handleFilesSelected(files)
                e.target.value = ''
              }}
            />
          </div>

          {originais.length === 0 ? (
            <div className="card flex min-h-[120px] items-center justify-center border-dashed">
              <div className="text-center">
                <Package className="mx-auto h-8 w-8 muted" />
                <p className="muted mt-2 text-xs">Nenhum criativo original</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {originais.map((item) => {
                const fileType = detectFileType(item.preview_url, item.format)
                const fileIcon = getFileIcon(fileType)

                return (
                  <div
                    key={item.id}
                    className="card card--hover flex items-center justify-between gap-3 p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="text-lg shrink-0">{fileIcon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.ref_name}</p>
                        {item.format && <p className="muted text-xs">{item.format}</p>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {fileType !== 'zip' && fileType !== 'file' && item.preview_url && (
                        <button
                          onClick={() => handlePreview(item.preview_url!, item.ref_name, item.format)}
                          className="btn btn-ghost text-xs"
                        >
                          Preview
                        </button>
                      )}
                      {item.preview_url && (
                        <button
                          onClick={() => handleDownload(item.preview_url!, item.ref_name)}
                          className="btn btn-primary text-xs"
                        >
                          Baixar
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteOriginal(item.id, item.ref_name)}
                        className="btn btn-danger text-xs"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Criativos Modelados */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="section-title text-base">Criativos Modelados</h4>
            <button
              onClick={() => document.getElementById('upload-modeled')?.click()}
              className="btn btn-primary text-xs"
            >
              +Adicionar
            </button>
            <input
              id="upload-modeled"
              type="file"
              className="hidden"
              multiple
              accept="image/*,video/*,.pdf"
              onChange={(e) => {
                const files = Array.from(e.target.files || [])
                if (files.length) handleModeledFilesSelected(files)
                e.target.value = ''
              }}
            />
          </div>

          {modelados.length === 0 ? (
            <div className="card flex min-h-[120px] items-center justify-center border-dashed">
              <div className="text-center">
                <Package className="mx-auto h-8 w-8 muted" />
                <p className="muted mt-2 text-xs">Nenhum criativo modelado</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {modelados.map((item) => {
                const fileType = detectFileType(item.asset_url)
                const fileIcon = getFileIcon(fileType)

                return (
                  <div
                    key={item.id}
                    className="card card--hover flex items-center justify-between gap-3 p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="text-lg shrink-0">{fileIcon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.internal_name}</p>
                        {item.status && <p className="muted text-xs">{item.status}</p>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {fileType !== 'zip' && fileType !== 'file' && item.asset_url && (
                        <button
                          onClick={() => handlePreview(item.asset_url!, item.internal_name)}
                          className="btn btn-ghost text-xs"
                        >
                          Preview
                        </button>
                      )}
                      {item.asset_url && (
                        <button
                          onClick={() => handleDownload(item.asset_url!, item.internal_name)}
                          className="btn btn-primary text-xs"
                        >
                          Baixar
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteModeled(item.id, item.internal_name)}
                        className="btn btn-danger text-xs"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Preview */}
      {previewFile && (
        <PreviewLightbox
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          fileType={previewFile.type}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {/* Dialog de metadados */}
      {metadataDialogFiles && (
        <UploadMetadataDialog
          files={metadataDialogFiles}
          defaultKind={metadataDialogKind}
          onConfirm={handleUploadWithMetadata}
          onCancel={() => setMetadataDialogFiles(null)}
        />
      )}
    </section>
  )
}

