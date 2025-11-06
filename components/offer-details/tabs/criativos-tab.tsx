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
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, FileImage } from 'lucide-react'
import {
  saCreateCreativeOriginal,
  createCreativeModeled,
  deleteCreativeOriginal,
  deleteCreativeModeled,
} from '@/app/actions/offers'
import { Button } from '@/components/ui/button'
import { CreativeCard } from '@/components/ui/creative-card'
import { CreativeCardSkeleton } from '@/components/ui/creative-card-skeleton'
import { PreviewLightbox } from '@/components/ui/preview-lightbox'
import { DropZone } from '@/components/ui/drop-zone'
import {
  UploadMetadataDialog,
  type FileWithMetadata,
  type FileKind,
} from '@/components/ui/upload-metadata-dialog'
import { uploadFile, extractFileMetadata } from '@/lib/upload'
import type { OfferCreativeOriginal, OfferCreativeModeled } from '@/lib/types'

interface CriativosTabProps {
  offerId: string
}

// Estado de upload (otimista)
interface UploadingFile {
  id: string
  name: string
  progress: number
  error?: string
}

// Wrapper sortable para os cards
function SortableCreativeCard(props: any) {
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
      <CreativeCard {...props} draggable />
    </div>
  )
}

// Função helper para derivar tipo de arquivo a partir da URL
function deriveFileTypeFromUrl(url?: string | null): 'IMG' | 'VID' | 'PDF' | 'ZIP' {
  if (!url) return 'IMG'

  const ext = url.split('.').pop()?.toLowerCase() || ''
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'IMG'
  if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext)) return 'VID'
  if (ext === 'pdf') return 'PDF'
  if (ext === 'zip') return 'ZIP'
  
  // Tentar inferir por MIME type na URL (se houver)
  if (url.includes('/image/') || url.includes('image')) return 'IMG'
  if (url.includes('/video/') || url.includes('video')) return 'VID'
  
  return 'IMG' // Default
}

export function CriativosTab({ offerId }: CriativosTabProps) {
  const supabase = createClient()
  const [originais, setOriginais] = useState<OfferCreativeOriginal[]>([])
  const [modelados, setModelados] = useState<OfferCreativeModeled[]>([])
  const [uploadingOriginais, setUploadingOriginais] = useState<UploadingFile[]>([])
  const [uploadingModelados, setUploadingModelados] = useState<UploadingFile[]>([])
  const [loading, setLoading] = useState(true)
  const [showOriginalUpload, setShowOriginalUpload] = useState(false)
  const [showModeledUpload, setShowModeledUpload] = useState(false)
  const [previewFile, setPreviewFile] = useState<{
    url: string
    name: string
    type: 'image' | 'video' | 'pdf' | 'other'
  } | null>(null)
  const [metadataDialogFiles, setMetadataDialogFiles] = useState<File[] | null>(null)
  const [metadataDialogKind, setMetadataDialogKind] = useState<FileKind>('original')

  // Drag & drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    loadCreatives()
  }, [offerId])

  const loadCreatives = async () => {
    try {
      setLoading(true)

      // Log diagnóstico: offer_id
      console.log('[CRIATIVOS_LOAD] Iniciando fetch para offerId:', offerId)

      // Queries explícitas usando APENAS campos que existem no schema
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

      // Log diagnóstico: resultados
      console.log('[CRIATIVOS_LOAD] Resultado Originais:', {
        error: originalRes.error,
        count: originalRes.data?.length || 0,
        data: originalRes.data?.slice(0, 2), // Primeiros 2 itens
      })

      console.log('[CRIATIVOS_LOAD] Resultado Modelados:', {
        error: modeledRes.error,
        count: modeledRes.data?.length || 0,
        data: modeledRes.data?.slice(0, 2), // Primeiros 2 itens
      })

      // Verificar erros
      if (originalRes.error) {
        console.error('[CRIATIVOS_LOAD_ORIGINAIS_ERROR]', originalRes.error)
        toast.error(`⚠️ Erro ao carregar originais: ${originalRes.error.message}`)
      }

      if (modeledRes.error) {
        console.error('[CRIATIVOS_LOAD_MODELADOS_ERROR]', modeledRes.error)
        toast.error(`⚠️ Erro ao carregar modelados: ${modeledRes.error.message}`)
      }

      // Mapear dados usando apenas campos que existem
      const originaisMapped = (originalRes.data || []).map((item) => {
        console.log('[CRIATIVOS_MAP] Original item:', {
          id: item.id,
          ref_name: item.ref_name,
          format: item.format,
          preview_url: item.preview_url,
          has_preview: !!item.preview_url,
        })

        return {
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
        } as OfferCreativeOriginal
      })

      const modeladosMapped = (modeledRes.data || []).map((item) => {
        console.log('[CRIATIVOS_MAP] Modelado item:', {
          id: item.id,
          internal_name: item.internal_name,
          asset_url: item.asset_url,
          has_asset: !!item.asset_url,
        })

        return {
          id: item.id,
          offer_id: item.offer_id,
          internal_name: item.internal_name || 'Sem nome',
          asset_url: item.asset_url || undefined,
          meta_ads_link: item.meta_ads_link || undefined,
          copy: item.copy || undefined,
          status: item.status || undefined,
          notes: item.notes || undefined,
          created_at: item.created_at,
        } as OfferCreativeModeled
      })

      console.log('[CRIATIVOS_LOAD] Mapeados:', {
        originais: originaisMapped.length,
        modelados: modeladosMapped.length,
      })

      setOriginais(originaisMapped)
      setModelados(modeladosMapped)
    } catch (err) {
      console.error('[CRIATIVOS_LOAD_EXCEPTION]', err)
      toast.error('⚠️ Erro ao carregar criativos')
    } finally {
      setLoading(false)
    }
  }

  // Abrir dialog para selecionar metadados (originais)
  const handleOriginalFilesSelected = (files: File[]) => {
    setMetadataDialogFiles(files)
    setMetadataDialogKind('original')
    setShowOriginalUpload(false)
  }

  // Abrir dialog para selecionar metadados (modelados)
  const handleModeledFilesSelected = (files: File[]) => {
    setMetadataDialogFiles(files)
    setMetadataDialogKind('modeled')
    setShowModeledUpload(false)
  }

  // Upload unificado com metadados
  const handleUploadWithMetadata = async (filesWithMetadata: FileWithMetadata[]) => {
    setMetadataDialogFiles(null)

    const uploadIds = filesWithMetadata.map(() => `temp-${Date.now()}-${Math.random()}`)

    // Separar por kind
    const originalsToUpload = filesWithMetadata.filter((f) => f.kind === 'original')
    const modeledsToUpload = filesWithMetadata.filter((f) => f.kind === 'modeled')

    // Criar placeholders para originais
    if (originalsToUpload.length > 0) {
      const placeholders: UploadingFile[] = originalsToUpload
        .map((fileData, idx) => {
          if (!fileData || !uploadIds[idx]) return null
          return {
            id: uploadIds[idx],
            name: fileData.name,
            progress: 0,
          }
        })
        .filter((p): p is UploadingFile => p !== null)
      setUploadingOriginais((prev) => [...prev, ...placeholders])
    }

    // Criar placeholders para modelados
    if (modeledsToUpload.length > 0) {
      const startIdx = originalsToUpload.length
      const placeholders: UploadingFile[] = modeledsToUpload
        .map((fileData, idx) => {
          if (!fileData || !uploadIds[startIdx + idx]) return null
          return {
            id: uploadIds[startIdx + idx],
            name: fileData.name,
            progress: 0,
          }
        })
        .filter((p): p is UploadingFile => p !== null)
      setUploadingModelados((prev) => [...prev, ...placeholders])
    }

    // Upload cada arquivo com seus metadados
    for (let i = 0; i < filesWithMetadata.length; i++) {
      const fileData = filesWithMetadata[i]
      if (!fileData) continue
      const uploadId = uploadIds[i]
      if (!uploadId) continue
      const isOriginal = fileData.kind === 'original'

      try {
        // Extrair metadados do arquivo real
        const metadata = await extractFileMetadata(fileData.file)

        // Upload para storage
        const category = isOriginal ? 'creatives_original' : 'creatives_modeled'
        const result = await uploadFile(fileData.file, offerId, category, (progress) => {
          if (isOriginal) {
            setUploadingOriginais((prev) =>
              prev.map((u) => (u.id === uploadId ? { ...u, progress: progress.percentage } : u))
            )
          } else {
            setUploadingModelados((prev) =>
              prev.map((u) => (u.id === uploadId ? { ...u, progress: progress.percentage } : u))
            )
          }
        })

        if (!result.success) {
          // Erro de bucket ou storage
          if (result.error?.includes('Bucket')) {
            throw new Error(
              'Bucket não encontrado. Verifique nome do bucket e ambiente (SUPABASE_URL)'
            )
          }
          throw new Error(result.error || 'Erro ao enviar')
        }

        // Salvar no banco com metadados personalizados
        if (isOriginal) {
          const dto = {
            ref_name: fileData.name, // Nome personalizado do dialog
            format: fileData.type === 'video' ? 'Vídeo' : fileData.type === 'image' ? 'Imagem' : fileData.type.toUpperCase(),
            preview_url: result.publicUrl || '', // URL pública completa
          }

          const res = await saCreateCreativeOriginal(offerId, dto)

          if (!res.ok) {
            throw new Error(res.error?.message || 'Erro ao salvar no banco')
          }

          setUploadingOriginais((prev) => prev.filter((u) => u.id !== uploadId))
        } else {
          const dto = {
            internal_name: fileData.name, // Nome personalizado do dialog
            asset_url: result.publicUrl || '', // URL pública completa
          }

          const res = await createCreativeModeled(offerId, dto)

          if (!res.success) {
            throw new Error(res.error || 'Erro ao salvar no banco')
          }

          setUploadingModelados((prev) => prev.filter((u) => u.id !== uploadId))
        }

        await loadCreatives()
        toast.success(`✅ ${fileData.name} enviado`)
      } catch (err) {
        console.error('[UPLOAD_ERROR]', err)
        const errorMsg = err instanceof Error ? err.message : 'Erro ao enviar'

        if (isOriginal) {
          setUploadingOriginais((prev) =>
            prev.map((u) => (u.id === uploadId ? { ...u, error: errorMsg } : u))
          )
        } else {
          setUploadingModelados((prev) =>
            prev.map((u) => (u.id === uploadId ? { ...u, error: errorMsg } : u))
          )
        }

        toast.error(`⚠️ ${errorMsg}`)
      }
    }
  }

  // Alterar Kind (Original ↔ Modelado)
  const handleChangeKind = async (id: string, currentKind: 'original' | 'modeled') => {
    const newKind = currentKind === 'original' ? 'modeled' : 'original'

    try {
      if (currentKind === 'original') {
        // Buscar dados do original
        const original = originais.find((o) => o.id === id)
        if (!original) return

        // Criar no modelados (usando apenas campos que existem)
        const dto = {
          internal_name: original.ref_name,
          asset_url: original.preview_url,
          copy: original.copy || undefined,
        }

        const res = await createCreativeModeled(offerId, dto)

        if (!res.success) {
          throw new Error(res.error || 'Erro ao mover')
        }

        // Excluir do original
        await deleteCreativeOriginal(offerId, id)
      } else {
        // Buscar dados do modelado
        const modeled = modelados.find((m) => m.id === id)
        if (!modeled) return

        // Criar no originais (usando apenas campos que existem)
        // Derivar format do tipo inferido pela URL
        const inferredType = deriveFileTypeFromUrl(modeled.asset_url)
        const dto = {
          ref_name: modeled.internal_name,
          format: inferredType === 'VID' ? 'Vídeo' : inferredType === 'IMG' ? 'Imagem' : inferredType === 'PDF' ? 'PDF' : 'Arquivo',
          preview_url: modeled.asset_url,
          copy: modeled.copy || undefined,
        }

        const res = await saCreateCreativeOriginal(offerId, dto)

        if (!res.ok) {
          throw new Error(res.error?.message || 'Erro ao mover')
        }

        // Excluir do modelado
        await deleteCreativeModeled(offerId, id)
      }

      await loadCreatives()
      toast.success(`✅ Movido para ${newKind === 'original' ? 'Originais' : 'Modelados'}`)
    } catch (err) {
      console.error('[CHANGE_KIND_ERROR]', err)
      toast.error('⚠️ Erro ao alterar kind')
    }
  }

  // Preview de arquivo
  const handlePreview = (fileUrl: string, fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    let type: 'image' | 'video' | 'pdf' | 'other' = 'other'

    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) type = 'image'
    else if (['mp4', 'mov', 'avi', 'webm'].includes(ext || '')) type = 'video'
    else if (ext === 'pdf') type = 'pdf'

    setPreviewFile({ url: fileUrl, name: fileName, type })
  }

  // Renomear (originais)
  const handleRenameOriginal = async (id: string, newName: string) => {
    try {
      const { error } = await supabase
        .schema('offers')
        .from('offer_creatives_original')
        .update({ ref_name: newName })
        .eq('id', id)

      if (error) throw error

      setOriginais((prev) => prev.map((o) => (o.id === id ? { ...o, ref_name: newName } : o)))
    } catch (err) {
      console.error('[RENAME_ORIGINAL_ERROR]', err)
      toast.error('⚠️ Erro ao renomear')
    }
  }

  // Renomear (modelados)
  const handleRenameModeled = async (id: string, newName: string) => {
    try {
      const { error } = await supabase
        .schema('offers')
        .from('offer_creatives_modeled')
        .update({ internal_name: newName })
        .eq('id', id)

      if (error) throw error

      setModelados((prev) => prev.map((m) => (m.id === id ? { ...m, internal_name: newName } : m)))
    } catch (err) {
      console.error('[RENAME_MODELED_ERROR]', err)
      toast.error('⚠️ Erro ao renomear')
    }
  }

  // Duplicar (originais)
  const handleDuplicateOriginal = async (id: string) => {
    const original = originais.find((o) => o.id === id)
    if (!original) return

    try {
      const dto = {
        ref_name: `${original.ref_name}_copy`,
        format: original.format || 'Arquivo',
        preview_url: original.preview_url,
        copy: original.copy,
        notes: original.notes,
      }

      const res = await saCreateCreativeOriginal(offerId, dto)

      if (!res.ok) {
        throw new Error(res.error?.message || 'Erro ao duplicar')
      }

      await loadCreatives()
    } catch (err) {
      console.error('[DUPLICATE_ORIGINAL_ERROR]', err)
      toast.error('⚠️ Erro ao duplicar')
    }
  }

  // Duplicar (modelados)
  const handleDuplicateModeled = async (id: string) => {
    const modeled = modelados.find((m) => m.id === id)
    if (!modeled) return

    try {
      const dto = {
        internal_name: `${modeled.internal_name}_copy`,
        asset_url: modeled.asset_url,
        copy: modeled.copy,
        status: modeled.status,
        notes: modeled.notes,
      }

      const res = await createCreativeModeled(offerId, dto)

      if (!res.success) {
        throw new Error(res.error || 'Erro ao duplicar')
      }

      await loadCreatives()
    } catch (err) {
      console.error('[DUPLICATE_MODELED_ERROR]', err)
      toast.error('⚠️ Erro ao duplicar')
    }
  }

  // Excluir com desfazer (originais)
  const handleDeleteOriginal = (id: string) => {
    const item = originais.find((o) => o.id === id)
    if (!item) return

    setOriginais((prev) => prev.filter((o) => o.id !== id))

    toast('Criativo excluído', {
      duration: 5000,
      action: {
        label: 'Desfazer',
        onClick: () => {
          setOriginais((prev) => [...prev, item])
          toast.info('Ação desfeita')
        },
      },
    })

    setTimeout(async () => {
      const result = await deleteCreativeOriginal(offerId, id)
      if (!result.success) {
        toast.error('⚠️ Erro ao excluir')
        setOriginais((prev) => [...prev, item])
      }
    }, 5100)
  }

  // Excluir com desfazer (modelados)
  const handleDeleteModeled = (id: string) => {
    const item = modelados.find((m) => m.id === id)
    if (!item) return

    setModelados((prev) => prev.filter((m) => m.id !== id))

    toast('Criativo excluído', {
      duration: 5000,
      action: {
        label: 'Desfazer',
        onClick: () => {
          setModelados((prev) => [...prev, item])
          toast.info('Ação desfeita')
        },
      },
    })

    setTimeout(async () => {
      const result = await deleteCreativeModeled(offerId, id)
      if (!result.success) {
        toast.error('⚠️ Erro ao excluir')
        setModelados((prev) => [...prev, item])
      }
    }, 5100)
  }

  // Reordenar (drag & drop)
  const handleDragEnd = async (event: DragEndEvent, isOriginal: boolean) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    if (isOriginal) {
      setOriginais((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        const reordered = arrayMove(items, oldIndex, newIndex)

        // Persistir ordem
        reordered.forEach((item, idx) => {
          supabase
            .schema('offers')
            .from('offer_creatives_original')
            .update({ order: idx })
            .eq('id', item.id)
            .then()
        })

        return reordered
      })
    } else {
      setModelados((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        const reordered = arrayMove(items, oldIndex, newIndex)

        reordered.forEach((item, idx) => {
          supabase
            .schema('offers')
            .from('offer_creatives_modeled')
            .update({ order: idx })
            .eq('id', item.id)
            .then()
        })

        return reordered
      })
    }

    toast.success('✅ Ordem atualizada')
  }

  // Retry upload
  const handleRetryUpload = (id: string, isOriginal: boolean) => {
    if (isOriginal) {
      setUploadingOriginais((prev) => prev.filter((u) => u.id !== id))
    } else {
      setUploadingModelados((prev) => prev.filter((u) => u.id !== id))
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-[#F5C542]" />
          <p className="mt-3 text-sm text-white/60">Carregando criativos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Layout horizontal: Originais | Modelados */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Coluna: Criativos Originais */}
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white/90">Criativos Originais</h3>
              <p className="text-sm text-white/50">{originais.length} item(ns)</p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowOriginalUpload(!showOriginalUpload)}
              className="gap-2 rounded-xl border border-white/15 bg-white/10 hover:bg-white/15"
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>

          {/* Upload Zone */}
          {showOriginalUpload && (
            <DropZone
              onFilesAdded={handleOriginalFilesSelected}
              accept="image/*,video/*,.pdf"
              multiple
            />
          )}

          {/* Grid de Cards */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => handleDragEnd(e, true)}
          >
            <SortableContext
              items={originais.map((o) => o.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid grid-cols-2 gap-4">
                {/* Skeletons de upload */}
                {uploadingOriginais.map((upload) => (
                  <CreativeCardSkeleton
                    key={upload.id}
                    name={upload.name}
                    progress={upload.progress}
                    error={upload.error}
                    onRetry={() => handleRetryUpload(upload.id, true)}
                    onCancel={() => handleRetryUpload(upload.id, true)}
                  />
                ))}

                {/* Cards reais */}
                {originais.map((criativo) => (
                  <SortableCreativeCard
                    key={criativo.id}
                    id={criativo.id}
                    name={criativo.ref_name}
                    fileUrl={criativo.preview_url || undefined}
                    fileKey={criativo.preview_url || undefined}
                    fileType={deriveFileTypeFromUrl(criativo.preview_url)}
                    onPreview={() => {
                      if (criativo.preview_url) {
                        handlePreview(criativo.preview_url, criativo.ref_name)
                      }
                    }}
                    kind="original"
                    onDelete={() => handleDeleteOriginal(criativo.id)}
                    onRename={(newName: string) => handleRenameOriginal(criativo.id, newName)}
                    onDuplicate={() => handleDuplicateOriginal(criativo.id)}
                    onChangeKind={() => handleChangeKind(criativo.id, 'original')}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Estado vazio */}
          {originais.length === 0 && uploadingOriginais.length === 0 && !showOriginalUpload && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 p-12 text-center">
              <FileImage className="h-12 w-12 text-white/30" />
              <h4 className="mt-4 font-medium text-white/70">Nenhum criativo original</h4>
              <p className="mt-1 text-sm text-white/40">
                Clique em &quot;Adicionar&quot; para enviar arquivos
              </p>
            </div>
          )}
        </div>

        {/* Coluna: Criativos Modelados */}
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white/90">Criativos Modelados</h3>
              <p className="text-sm text-white/50">{modelados.length} item(ns)</p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowModeledUpload(!showModeledUpload)}
              className="gap-2 rounded-xl border border-white/15 bg-white/10 hover:bg-white/15"
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>

          {/* Upload Zone */}
          {showModeledUpload && (
            <DropZone
              onFilesAdded={handleModeledFilesSelected}
              accept="image/*,video/*,.pdf,.zip"
              multiple
            />
          )}

          {/* Grid de Cards */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => handleDragEnd(e, false)}
          >
            <SortableContext
              items={modelados.map((m) => m.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid grid-cols-2 gap-4">
                {/* Skeletons de upload */}
                {uploadingModelados.map((upload) => (
                  <CreativeCardSkeleton
                    key={upload.id}
                    name={upload.name}
                    progress={upload.progress}
                    error={upload.error}
                    onRetry={() => handleRetryUpload(upload.id, false)}
                    onCancel={() => handleRetryUpload(upload.id, false)}
                  />
                ))}

                {/* Cards reais */}
                {modelados.map((criativo) => (
                  <SortableCreativeCard
                    key={criativo.id}
                    id={criativo.id}
                    name={criativo.internal_name}
                    fileUrl={criativo.asset_url || undefined}
                    fileKey={criativo.asset_url || undefined}
                    fileType={deriveFileTypeFromUrl(criativo.asset_url)}
                    kind="modeled"
                    onPreview={() => {
                      if (criativo.asset_url) {
                        handlePreview(criativo.asset_url, criativo.internal_name)
                      }
                    }}
                    onDelete={() => handleDeleteModeled(criativo.id)}
                    onRename={(newName: string) => handleRenameModeled(criativo.id, newName)}
                    onDuplicate={() => handleDuplicateModeled(criativo.id)}
                    onChangeKind={() => handleChangeKind(criativo.id, 'modeled')}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Estado vazio */}
          {modelados.length === 0 && uploadingModelados.length === 0 && !showModeledUpload && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 p-12 text-center">
              <FileImage className="h-12 w-12 text-white/30" />
              <h4 className="mt-4 font-medium text-white/70">Nenhum criativo modelado</h4>
              <p className="mt-1 text-sm text-white/40">
                Modele a partir dos originais ou adicione novos
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Dialog de Metadados */}
      {metadataDialogFiles && (
        <UploadMetadataDialog
          files={metadataDialogFiles}
          defaultKind={metadataDialogKind}
          onConfirm={handleUploadWithMetadata}
          onCancel={() => setMetadataDialogFiles(null)}
        />
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

