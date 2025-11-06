'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Package } from 'lucide-react'
import { detectFileType, getFileIcon, resolvePreviewUrl } from '@/lib/file-types'
import { PreviewLightbox } from '@/components/ui/preview-lightbox'
import { uploadToOffersFiles } from '@/lib/supabase-storage'
import { STORAGE_BUCKET } from '@/lib/constants'
import { saCreateBonus, deleteBonus } from '@/app/(protected)/ofertas/[id]/actions'

interface Bonus {
  id: string
  offer_id: string
  title: string
  content_type?: string
  file_or_link?: string
  short_desc?: string
  perceived_value?: number
  notes?: string
  created_at: string
}

interface DetalhesEntregaveisSectionProps {
  offerId: string
}

export function DetalhesEntregaveisSection({ offerId }: DetalhesEntregaveisSectionProps) {
  const supabase = createClient()
  const [bonuses, setBonuses] = useState<Bonus[]>([])
  const [loading, setLoading] = useState(true)
  const [previewFile, setPreviewFile] = useState<{
    url: string
    name: string
    type: 'image' | 'video' | 'pdf' | 'other'
  } | null>(null)

  useEffect(() => {
    loadBonuses()
  }, [offerId])

  const loadBonuses = async () => {
    try {
      setLoading(true)
      console.log('[BONUSES_LOAD] Loading from: offers.offer_bonuses, offer_id:', offerId)
      
      const { data, error } = await supabase
        .schema('offers')
        .from('offer_bonuses')
        .select('*')
        .eq('offer_id', offerId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[BONUSES_LOAD_ERROR]', error)
        if (error.code === '42P01') {
          toast.error('Tabela (schema offers) não encontrada. Rode as migrações.')
        } else {
          toast.error(`Erro ao carregar entregáveis: ${error.message}`)
        }
        return
      }

      setBonuses((data || []) as Bonus[])
    } catch (err) {
      console.error('[BONUSES_LOAD]', err)
      toast.error('Erro ao carregar entregáveis')
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = async (url: string, name: string, fileType?: string) => {
    if (!url) return
    const type = detectFileType(url, fileType)
    const previewType = type === 'video' ? 'video' : type === 'image' ? 'image' : type === 'pdf' ? 'pdf' : 'other'
    const previewUrl = await resolvePreviewUrl(url)
    setPreviewFile({ url: previewUrl, name, type: previewType })
  }

  const handleDownload = (url: string, name: string) => {
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Excluir "${title}"? Esta ação não pode ser desfeita.`)) return

    try {
      const result = await deleteBonus(offerId, id)
      if (!result.success) throw new Error(result.error)
      toast.success('Entregável excluído')
      loadBonuses()
    } catch (err) {
      console.error('[DELETE_BONUS_ERROR]', err)
      toast.error('Erro ao excluir entregável')
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    e.target.value = ''

    toast.promise(
      Promise.all(
        Array.from(files).map(async (file) => {
          try {
            // Upload para storage
            const uploadResult = await uploadToOffersFiles(`${offerId}/bonuses`, file)

            // Verificar erro de bucket
            if (!uploadResult.url) {
              throw new Error('BUCKET_NOT_FOUND')
            }

            // Salvar no banco usando offer_bonuses
            const res = await saCreateBonus(offerId, {
              title: file.name.replace(/\.[^/.]+$/, ''),
              content_type: file.type || 'file',
              file_or_link: uploadResult.url,
            })

            if (!res.ok) {
              throw new Error(res.error?.message || 'Erro ao salvar no banco')
            }

            return res
          } catch (err) {
            console.error('[BONUS_UPLOAD_ERROR]', err)
            if (err instanceof Error && err.message === 'BUCKET_NOT_FOUND') {
              console.error('[Storage] Env URL:', process.env.NEXT_PUBLIC_SUPABASE_URL, 'Bucket:', STORAGE_BUCKET)
              toast.error("Bucket 'offers-files' não encontrado. Verifique suas .env (URL/KEY) do projeto atual.")
            }
            throw err
          }
        })
      ),
      {
        loading: 'Enviando arquivos...',
        success: () => {
          loadBonuses()
          return '✅ Arquivos enviados com sucesso'
        },
        error: (err) => {
          if (err instanceof Error && err.message === 'BUCKET_NOT_FOUND') {
            return "Bucket 'offers-files' não encontrado. Verifique suas .env (URL/KEY) do projeto atual."
          }
          return `Erro ao enviar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`
        },
      }
    )
  }

  if (loading) {
    return (
      <section className="card p-4 md:p-6">
        <h3 className="section-title mb-4">Entregáveis</h3>
        <p className="muted py-8 text-center text-sm">Carregando...</p>
      </section>
    )
  }

  return (
    <section className="card p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="section-title">Entregáveis</h3>
        <button
          onClick={() => document.getElementById('upload-bonus')?.click()}
          className="btn btn-primary text-xs"
        >
          +Adicionar
        </button>
        <input
          id="upload-bonus"
          type="file"
          className="hidden"
          multiple
          onChange={handleFileSelect}
        />
      </div>

      {bonuses.length === 0 ? (
        <div className="card flex min-h-[120px] items-center justify-center border-dashed">
          <div className="text-center">
            <Package className="mx-auto h-8 w-8 muted" />
            <p className="muted mt-2 text-sm">Nenhum entregável cadastrado</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {bonuses.map((bonus) => {
            const fileUrl = bonus.file_or_link
            const fileType = detectFileType(fileUrl, bonus.content_type || undefined)
            const fileIcon = getFileIcon(fileType)

            return (
              <div
                key={bonus.id}
                className="card card--hover flex items-center justify-between gap-3 p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {fileUrl && <span className="text-lg shrink-0">{fileIcon}</span>}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{bonus.title}</p>
                    {bonus.content_type && (
                      <p className="muted text-xs uppercase">{bonus.content_type}</p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {fileUrl && fileType !== 'zip' && fileType !== 'file' && (
                    <button
                      onClick={() => handlePreview(fileUrl, bonus.title, bonus.content_type || undefined)}
                      className="btn btn-ghost text-xs"
                    >
                      Preview
                    </button>
                  )}
                  {fileUrl && (
                    <button
                      onClick={() => handleDownload(fileUrl, bonus.title)}
                      className="btn btn-primary text-xs"
                    >
                      Baixar
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(bonus.id, bonus.title)}
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
