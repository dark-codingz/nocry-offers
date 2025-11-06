'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Package, Check } from 'lucide-react'
import { saCreateBonus, deleteBonus } from '@/app/actions/offers'
import { Button } from '@/components/ui/button'
import { PreviewLightbox } from '@/components/ui/preview-lightbox'
import { DropZone } from '@/components/ui/drop-zone'
import { BonusMetadataDialog } from '@/components/ui/bonus-metadata-dialog'
import { uploadFile } from '@/lib/upload'
import type { OfferBonus } from '@/lib/types'

interface EntregaveisTabProps {
  offerId: string
}

// Função helper para derivar tipo de arquivo a partir da URL
function deriveFileTypeFromUrl(url?: string | null): 'PDF' | 'ZIP' | 'DOC' | 'FILE' {
  if (!url) return 'FILE'

  const ext = url.split('.').pop()?.toLowerCase() || ''
  
  if (ext === 'pdf') return 'PDF'
  if (ext === 'zip') return 'ZIP'
  if (['doc', 'docx'].includes(ext)) return 'DOC'
  
  return 'FILE'
}

// Wrapper sortable para os cards de entregáveis
function SortableBonusCard(props: {
  id: string
  name: string
  fileUrl?: string
  fileType?: 'PDF' | 'ZIP' | 'DOC' | 'FILE'
  onPreview: () => void
  onDelete: () => void
  onCopyLink?: () => void
  onDownload?: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/15 bg-white/8 shadow-lg backdrop-blur-xl transition hover:border-white/25 hover:bg-white/10 hover:shadow-xl">
        {/* Preview / Thumbnail */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-white/5">
          {props.fileUrl ? (
            <div className="relative h-full w-full">
              {props.fileType === 'PDF' ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl opacity-30">📄</div>
                    <p className="mt-2 text-xs text-white/40">PDF</p>
                  </div>
                </div>
              ) : props.fileType === 'ZIP' ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl opacity-30">📦</div>
                    <p className="mt-2 text-xs text-white/40">ZIP</p>
                  </div>
                </div>
              ) : props.fileType === 'DOC' ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl opacity-30">📝</div>
                    <p className="mt-2 text-xs text-white/40">DOC</p>
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl opacity-30">📁</div>
                    <p className="mt-2 text-xs text-white/40">Arquivo</p>
                  </div>
                </div>
              )}

              {/* Actions Overlay */}
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={props.onPreview}
                  className="h-9 w-9 rounded-xl border border-white/20 bg-white/10 p-0 hover:bg-white/20"
                  title="Preview"
                >
                  👁️
                </Button>
                {props.onCopyLink && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={props.onCopyLink}
                    className="h-9 w-9 rounded-xl border border-white/20 bg-white/10 p-0 hover:bg-white/20"
                    title="Copiar link"
                  >
                    🔗
                  </Button>
                )}
                {props.onDownload && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={props.onDownload}
                    className="h-9 w-9 rounded-xl border border-white/20 bg-white/10 p-0 hover:bg-white/20"
                    title="Baixar"
                  >
                    ↓
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={props.onDelete}
                  className="h-9 w-9 rounded-xl border border-red-500/30 bg-red-500/20 p-0 hover:bg-red-500/30"
                  title="Excluir"
                >
                  🗑️
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <Package className="h-12 w-12 text-white/30" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <h4 className="truncate text-sm font-medium text-white/90" title={props.name}>
            {props.name}
          </h4>
          {props.fileType && (
            <span className="mt-2 inline-block rounded-md bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-300">
              {props.fileType}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function EntregaveisTab({ offerId }: EntregaveisTabProps) {
  const supabase = createClient()
  const [bonuses, setBonuses] = useState<OfferBonus[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [metadataDialogFiles, setMetadataDialogFiles] = useState<File[] | null>(null)
  const [previewFile, setPreviewFile] = useState<{
    url: string
    name: string
    type: 'image' | 'video' | 'pdf' | 'other'
  } | null>(null)

  // Drag & drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    loadBonuses()
  }, [offerId])

  const loadBonuses = async () => {
    try {
      setLoading(true)

      // Log diagnóstico
      console.log('[ENTREGAVEIS_LOAD] Iniciando fetch para offerId:', offerId)

      // Query explícita usando APENAS campos que existem no schema
      const { data, error } = await supabase
        .schema('offers')
        .from('offer_bonuses')
        .select('id, offer_id, title, content_type, file_or_link, short_desc, perceived_value, notes, created_at')
        .eq('offer_id', offerId)
        .order('created_at', { ascending: false })

      // Log diagnóstico
      console.log('[ENTREGAVEIS_LOAD] Resultado:', {
        error: error?.message,
        count: data?.length || 0,
        data: data?.slice(0, 2), // Primeiros 2 itens
      })

      if (error) {
        console.error('[ENTREGAVEIS_LOAD_ERROR]', error)
        toast.error(`⚠️ Erro ao carregar entregáveis: ${error.message}`)
      }

      // Mapear dados garantindo campos obrigatórios
      const bonusesMapped = (data || []).map((item) => {
        console.log('[ENTREGAVEIS_MAP] Bonus item:', {
          id: item.id,
          title: item.title,
          content_type: item.content_type,
          file_or_link: item.file_or_link,
          has_file: !!item.file_or_link,
        })

        return {
          id: item.id,
          offer_id: item.offer_id,
          title: item.title || 'Sem título',
          content_type: item.content_type || undefined,
          file_or_link: item.file_or_link || undefined,
          short_desc: item.short_desc || undefined,
          perceived_value: item.perceived_value || undefined,
          notes: item.notes || undefined,
          created_at: item.created_at,
        } as OfferBonus
      })

      console.log('[ENTREGAVEIS_LOAD] Mapeados:', bonusesMapped.length)

      setBonuses(bonusesMapped)
    } catch (err) {
      console.error('[ENTREGAVEIS_LOAD_EXCEPTION]', err)
      toast.error('⚠️ Erro ao carregar entregáveis')
    } finally {
      setLoading(false)
    }
  }

  // Abrir dialog de metadados ao selecionar arquivos
  const handleFilesSelected = (files: File[]) => {
    setMetadataDialogFiles(files)
    setShowUpload(false)
  }

  // Upload com metadados
  const handleUploadWithMetadata = async (
    filesWithMetadata: Array<{ file: File; title: string; content_type: string; short_desc?: string }>
  ) => {
    setMetadataDialogFiles(null)

    toast.promise(
      Promise.all(
        filesWithMetadata.map(async ({ file, title, content_type, short_desc }) => {
          try {
            // Upload para storage
            const result = await uploadFile(file, offerId, 'bonuses', undefined)

            if (!result.success) {
              throw new Error(result.error || 'Erro ao enviar')
            }

            // Salvar no banco
            const dto = {
              title,
              content_type,
              file_or_link: result.publicUrl || '', // URL pública completa
              short_desc: short_desc?.trim() || undefined,
            }

            const res = await saCreateBonus(offerId, dto)

            if (!res.ok) {
              throw new Error(res.error?.message || 'Erro ao salvar')
            }

            return res
          } catch (err) {
            console.error('[BONUS_UPLOAD_ERROR]', err)
            throw err
          }
        })
      ),
      {
        loading: 'Enviando arquivos...',
        success: () => {
          loadBonuses()
          return `✅ ${filesWithMetadata.length} entregável(is) enviado(s)`
        },
        error: '⚠️ Falha ao enviar',
      }
    )
  }

  // Preview de arquivo
  const handlePreview = (fileUrl: string, fileName: string) => {
    const ext = fileUrl.split('.').pop()?.toLowerCase()
    let type: 'image' | 'video' | 'pdf' | 'other' = 'other'

    if (ext === 'pdf') type = 'pdf'
    else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) type = 'image'
    else if (['mp4', 'mov', 'avi', 'webm'].includes(ext || '')) type = 'video'

    setPreviewFile({ url: fileUrl, name: fileName, type })
  }

  // Copiar link
  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url)
    toast.success('✅ Link copiado')
  }

  // Baixar arquivo
  const handleDownload = (url: string, name: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.target = '_blank'
    a.click()
  }

  // Excluir com desfazer
  const handleDelete = (id: string) => {
    const item = bonuses.find((b) => b.id === id)
    if (!item) return

    setBonuses((prev) => prev.filter((b) => b.id !== id))

    toast('Entregável excluído', {
      duration: 5000,
      action: {
        label: 'Desfazer',
        onClick: () => {
          setBonuses((prev) => [...prev, item])
          toast.info('Ação desfeita')
        },
      },
    })

    setTimeout(async () => {
      const result = await deleteBonus(offerId, id)
      if (!result.success) {
        toast.error('⚠️ Erro ao excluir')
        setBonuses((prev) => [...prev, item])
      }
    }, 5100)
  }

  // Reordenar (drag & drop)
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setBonuses((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id)
      const newIndex = items.findIndex((i) => i.id === over.id)
      return arrayMove(items, oldIndex, newIndex)
    })

    toast.success('✅ Ordem atualizada')
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-[#F5C542]" />
          <p className="mt-3 text-sm text-white/60">Carregando entregáveis...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white/90">Entregáveis / Bônus</h3>
          <p className="text-sm text-white/50">{bonuses.length} item(ns)</p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowUpload(!showUpload)}
          className="gap-2 rounded-xl border border-white/15 bg-white/10 hover:bg-white/15"
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </div>

      {/* Upload Zone */}
      {showUpload && (
        <DropZone onFilesAdded={handleFilesSelected} accept=".pdf,.zip,.doc,.docx" multiple />
      )}

      {/* Dialog de Metadados */}
      {metadataDialogFiles && (
        <BonusMetadataDialog
          files={metadataDialogFiles}
          onConfirm={handleUploadWithMetadata}
          onCancel={() => setMetadataDialogFiles(null)}
        />
      )}

      {/* Grid de Cards */}
      {bonuses.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={bonuses.map((b) => b.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {bonuses.map((bonus) => {
                const fileType = deriveFileTypeFromUrl(bonus.file_or_link) || 
                  (bonus.content_type as 'PDF' | 'ZIP' | 'DOC' | 'FILE' | undefined)

                return (
                  <SortableBonusCard
                    key={bonus.id}
                    id={bonus.id}
                    name={bonus.title}
                    fileUrl={bonus.file_or_link || undefined}
                    fileType={fileType}
                    onPreview={() => {
                      if (bonus.file_or_link) {
                        handlePreview(bonus.file_or_link, bonus.title)
                      }
                    }}
                    onCopyLink={() => {
                      if (bonus.file_or_link) {
                        handleCopyLink(bonus.file_or_link)
                      }
                    }}
                    onDownload={() => {
                      if (bonus.file_or_link) {
                        handleDownload(bonus.file_or_link, bonus.title)
                      }
                    }}
                    onDelete={() => handleDelete(bonus.id)}
                  />
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        !showUpload && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 p-16 text-center">
            <Package className="h-16 w-16 text-white/30" />
            <h4 className="mt-4 text-lg font-medium text-white/70">Nenhum entregável cadastrado</h4>
            <p className="mt-1 text-sm text-white/40">
              Clique em &quot;Adicionar&quot; para enviar PDFs, ZIPs ou documentos
            </p>
          </div>
        )
      )}

      {/* Preview Lightbox */}
      {previewFile && (
        <PreviewLightbox
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          fileType={previewFile.type}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  )
}
