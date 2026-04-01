'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Upload, Link as LinkIcon, Image as ImageIcon, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { uploadToOffersFiles } from '@/lib/supabase-storage'
import { STORAGE_BUCKET } from '@/lib/constants'

interface MediaLibraryModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectImage: (url: string) => void
  currentImageUrl?: string | null
}

type TabType = 'library' | 'upload' | 'external'

export function MediaLibraryModal({
  isOpen,
  onClose,
  onSelectImage,
  currentImageUrl,
}: MediaLibraryModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('library')
  const [libraryImages, setLibraryImages] = useState<Array<{ path: string; url: string; name: string }>>([])
  const [loadingLibrary, setLoadingLibrary] = useState(false)
  const [selectedImagePath, setSelectedImagePath] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [externalUrl, setExternalUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  // Carregar imagens da biblioteca
  useEffect(() => {
    if (isOpen && activeTab === 'library') {
      loadLibraryImages()
    }
  }, [isOpen, activeTab])

  async function loadLibraryImages() {
    setLoadingLibrary(true)
    try {
      // Obter userId
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('Usuário não autenticado')
      }

      const userId = user.id
      const folderPath = `editor-images/${userId}`

      // Listar arquivos no storage (listagem não-recursiva por padrão)
      // Se houver subpastas, precisamos listar recursivamente
      const { data: files, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .list(folderPath, {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' },
        })

      if (error) {
        // Se a pasta não existir, retorna array vazio (normal para primeiro uso)
        if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
          setLibraryImages([])
          return
        }
        console.error('[MEDIA_LIBRARY] Erro ao listar imagens:', error)
        setLibraryImages([])
        return
      }

      // Função auxiliar para processar arquivos (suporta recursão futura)
      const processFiles = async (fileList: any[], basePath: string): Promise<Array<{ path: string; url: string; name: string }>> => {
        const images: Array<{ path: string; url: string; name: string }> = []
        
        for (const file of fileList) {
          // Se for uma pasta (não tem extensão), poderia listar recursivamente
          // Por enquanto, ignoramos pastas e focamos apenas em arquivos
          if (file.id) {
            // É um arquivo
            const fullPath = `${basePath}/${file.name}`
            
            // Filtrar apenas imagens
            if (file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) && !file.name.endsWith('.tmp')) {
              // CRÍTICO: Sempre usar getPublicUrl para garantir URL pública completa
              const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fullPath)
              const publicUrl = data?.publicUrl || ''
              
              // Garantir que é URL absoluta (https://...)
              if (publicUrl.startsWith('http://') || publicUrl.startsWith('https://')) {
                images.push({
                  path: fullPath,
                  url: publicUrl, // URL pública completa garantida
                  name: file.name,
                })
              } else {
                console.warn('[MEDIA_LIBRARY] URL não é absoluta, ignorando:', publicUrl)
              }
            }
          }
        }
        
        return images
      }

      const imagesWithUrls = await processFiles(files || [], folderPath)
      setLibraryImages(imagesWithUrls)
    } catch (err) {
      console.error('[MEDIA_LIBRARY] Erro ao carregar biblioteca:', err)
      setLibraryImages([])
    } finally {
      setLoadingLibrary(false)
    }
  }

  async function handleUpload(file: File) {
    // Validar tipo
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Tipo de arquivo não permitido. Use PNG, JPG, WEBP ou GIF.')
      return
    }

    // Validar tamanho (máx. 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      setUploadError('Arquivo muito grande. Tamanho máximo: 10MB.')
      return
    }

    setUploading(true)
    setUploadError(null)

    try {
      // Obter userId
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('Usuário não autenticado. Faça login novamente.')
      }

      const userId = user.id
      
      // Gerar nome único: ${userId}/${timestamp}-${filename}
      const timestamp = Date.now()
      const sanitizedName = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w.\-]+/g, '_')
      
      // Formato: editor-images/${userId}/${timestamp}-${filename}
      const fullPath = `editor-images/${userId}/${timestamp}-${sanitizedName}`

      // Fazer upload diretamente (não usar uploadToOffersFiles para ter controle do nome)
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(fullPath, file, {
          upsert: false, // Não sobrescrever se já existir
        })

      if (uploadError) {
        if (uploadError.message?.includes('Bucket not found')) {
          throw new Error('BUCKET_NOT_FOUND')
        }
        throw uploadError
      }

      // CRÍTICO: Obter URL pública completa
      const { data: uploadPublicData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fullPath)
      const finalUrl = uploadPublicData?.publicUrl || null

      if (!finalUrl) {
        throw new Error('Erro ao obter URL pública da imagem.')
      }
      
      // Validar que é URL absoluta (https://...)
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        throw new Error('URL pública inválida. Tente novamente.')
      }

      // Trocar para aba Galeria e atualizar lista
      setActiveTab('library')
      await loadLibraryImages()
      
      // Selecionar a imagem recém-upada na galeria
      setSelectedImagePath(fullPath)
      
      // Selecionar automaticamente com URL pública garantida
      handleSelectImage(finalUrl)
    } catch (err) {
      console.error('[MEDIA_LIBRARY] Erro no upload:', err)
      setUploadError(
        err instanceof Error
          ? err.message
          : 'Erro ao fazer upload da imagem. Tente novamente.'
      )
    } finally {
      setUploading(false)
    }
  }

  function handleSelectImage(url: string) {
    onSelectImage(url)
    onClose()
  }

  function handleExternalUrlSubmit() {
    if (externalUrl.trim()) {
      handleSelectImage(externalUrl.trim())
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-6 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-main)' }}>
            Biblioteca de Mídia
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:bg-opacity-10"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-6 pt-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'library' ? 'border-b-2' : 'opacity-60 hover:opacity-100'
            }`}
            style={{
              borderBottomColor: activeTab === 'library' ? 'var(--gold)' : 'transparent',
              color: activeTab === 'library' ? 'var(--text-main)' : 'var(--text-muted)',
            }}
          >
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Biblioteca
            </div>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'upload' ? 'border-b-2' : 'opacity-60 hover:opacity-100'
            }`}
            style={{
              borderBottomColor: activeTab === 'upload' ? 'var(--gold)' : 'transparent',
              color: activeTab === 'upload' ? 'var(--text-main)' : 'var(--text-muted)',
            }}
          >
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload
            </div>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('external')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'external' ? 'border-b-2' : 'opacity-60 hover:opacity-100'
            }`}
            style={{
              borderBottomColor: activeTab === 'external' ? 'var(--gold)' : 'transparent',
              color: activeTab === 'external' ? 'var(--text-main)' : 'var(--text-muted)',
            }}
          >
            <div className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              Link Externo
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Aba Biblioteca */}
          {activeTab === 'library' && (
            <div>
              {loadingLibrary ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--gold)' }} />
                </div>
              ) : libraryImages.length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-soft)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Nenhuma imagem na biblioteca
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-soft)' }}>
                    Faça upload de imagens na aba "Upload"
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-4">
                  {libraryImages.map((img) => {
                    const isSelected = selectedImagePath === img.path
                    const isCurrent = currentImageUrl === img.url
                    return (
                      <div
                        key={img.path}
                        onClick={() => setSelectedImagePath(img.path)}
                        className={`
                          relative aspect-square rounded-lg overflow-hidden cursor-pointer
                          border-2 transition-all
                          ${isSelected ? 'ring-2' : 'hover:border-opacity-60'}
                        `}
                        style={{
                          borderColor: isSelected ? 'var(--gold)' : 'var(--border-subtle)',
                          boxShadow: isSelected ? '0 0 0 2px var(--gold)' : 'none',
                        }}
                      >
                        <img
                          src={img.url}
                          alt={img.name}
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div
                            className="absolute inset-0 flex items-center justify-center"
                            style={{ backgroundColor: 'rgba(250, 204, 21, 0.2)' }}
                          >
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: 'var(--gold)' }}
                            >
                              <Check className="w-5 h-5" style={{ color: '#000' }} />
                            </div>
                          </div>
                        )}
                        {isCurrent && !isSelected && (
                          <div
                            className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium"
                            style={{
                              backgroundColor: 'var(--bg-elevated)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            Atual
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Aba Upload */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUpload(file)
                }}
              />

              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onDragLeave={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (uploading) return

                  const file = e.dataTransfer.files[0]
                  if (file && file.type.startsWith('image/')) {
                    handleUpload(file)
                  }
                }}
                className={`
                  border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
                  transition-all
                  ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-solid'}
                `}
                style={{
                  borderColor: uploadError ? 'var(--danger)' : 'var(--border-subtle)',
                }}
              >
                {uploading ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--gold)' }} />
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      Enviando imagem...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="w-12 h-12 mx-auto" style={{ color: 'var(--text-soft)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                      Clique para escolher ou arraste uma imagem
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-soft)' }}>
                      PNG, JPG, WEBP ou GIF (máx. 10MB)
                    </p>
                  </div>
                )}
              </div>

              {uploadError && (
                <div
                  className="text-sm rounded-lg p-3"
                  style={{
                    color: 'var(--danger)',
                    backgroundColor: 'rgba(248, 113, 113, 0.1)',
                    border: '1px solid rgba(248, 113, 113, 0.3)',
                  }}
                >
                  {uploadError}
                </div>
              )}
            </div>
          )}

          {/* Aba Link Externo */}
          {activeTab === 'external' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                  URL da Imagem
                </label>
                <input
                  type="text"
                  className="editor-input w-full"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleExternalUrlSubmit()
                    }
                  }}
                />
                <p className="text-xs mt-2" style={{ color: 'var(--text-soft)' }}>
                  Cole a URL completa da imagem (ex: Google Images, Unsplash, etc.)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 p-6 border-t"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg transition-colors"
            style={{
              color: 'var(--text-muted)',
              backgroundColor: 'var(--bg-subtle)',
            }}
          >
            Cancelar
          </button>
          {activeTab === 'library' && selectedImagePath && (
            <button
              onClick={() => {
                const selected = libraryImages.find((img) => img.path === selectedImagePath)
                if (selected) {
                  // CRÍTICO: Garantir URL pública completa antes de retornar
                  const { data: publicUrlData } = supabase.storage
                    .from(STORAGE_BUCKET)
                    .getPublicUrl(selected.path)
                  const finalUrl = publicUrlData?.publicUrl || selected.url
                  
                  // Validar que é URL absoluta
                  if (finalUrl.startsWith('http://') || finalUrl.startsWith('https://')) {
                    handleSelectImage(finalUrl)
                  } else {
                    console.error('[MEDIA_LIBRARY] URL inválida:', finalUrl)
                    alert('Erro: URL da imagem inválida. Tente novamente.')
                  }
                }
              }}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              style={{
                color: '#000',
                backgroundColor: 'var(--gold)',
              }}
            >
              Selecionar
            </button>
          )}
          {activeTab === 'external' && (
            <button
              onClick={handleExternalUrlSubmit}
              disabled={!externalUrl.trim()}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                color: '#000',
                backgroundColor: 'var(--gold)',
              }}
            >
              Usar URL
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

