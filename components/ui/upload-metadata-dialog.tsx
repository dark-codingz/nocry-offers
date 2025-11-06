'use client'

import { useState, useEffect } from 'react'
import { X, Upload } from 'lucide-react'
import { Button } from './button'
import { Input } from './input'
import { Select } from './select'
import { Label } from './label'

export type FileKind = 'original' | 'modeled'
export type FileType = 'image' | 'video' | 'pdf' | 'file'

export interface FileWithMetadata {
  file: File
  name: string
  type: FileType
  kind: FileKind
}

interface UploadMetadataDialogProps {
  files: File[]
  onConfirm: (filesWithMetadata: FileWithMetadata[]) => void
  onCancel: () => void
  defaultKind?: FileKind
}

// Tipos suportados
const SUPPORTED_TYPES = {
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/mov', 'video/avi', 'video/webm'],
  pdf: ['application/pdf'],
  file: ['application/zip', 'application/x-zip-compressed'],
}

// Auto-detectar tipo por MIME
function detectFileType(file: File): FileType {
  if (SUPPORTED_TYPES.image.some((t) => file.type === t)) return 'image'
  if (SUPPORTED_TYPES.video.some((t) => file.type === t)) return 'video'
  if (SUPPORTED_TYPES.pdf.some((t) => file.type === t)) return 'pdf'
  if (SUPPORTED_TYPES.file.some((t) => file.type === t)) return 'file'

  // Fallback por extensão
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return 'image'
  if (['mp4', 'mov', 'avi', 'webm'].includes(ext || '')) return 'video'
  if (ext === 'pdf') return 'pdf'
  if (ext === 'zip') return 'file'

  return 'file'
}

export function UploadMetadataDialog({
  files,
  onConfirm,
  onCancel,
  defaultKind = 'original',
}: UploadMetadataDialogProps) {
  const [filesMetadata, setFilesMetadata] = useState<FileWithMetadata[]>([])
  const [batchType, setBatchType] = useState<FileType | ''>('')
  const [batchKind, setBatchKind] = useState<FileKind | ''>(defaultKind)

  // Inicializar metadados
  useEffect(() => {
    const initialMetadata = files.map((file) => ({
      file,
      name: file.name,
      type: detectFileType(file),
      kind: defaultKind,
    }))
    setFilesMetadata(initialMetadata)
  }, [files, defaultKind])

  // Aplicar Tipo em lote
  const applyBatchType = () => {
    if (!batchType) return
    setFilesMetadata((prev) => prev.map((f) => ({ ...f, type: batchType })))
  }

  // Aplicar Kind em lote
  const applyBatchKind = () => {
    if (!batchKind) return
    setFilesMetadata((prev) => prev.map((f) => ({ ...f, kind: batchKind })))
  }

  // Atualizar metadados de um arquivo
  const updateFileMetadata = (
    index: number,
    field: keyof Omit<FileWithMetadata, 'file'>,
    value: string
  ) => {
    setFilesMetadata((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [field]: value } : f))
    )
  }

  // Validar antes de confirmar
  const handleConfirm = () => {
    // Validar nomes não vazios
    const hasEmptyName = filesMetadata.some((f) => !f.name.trim())
    if (hasEmptyName) {
      alert('Todos os arquivos devem ter um nome')
      return
    }

    onConfirm(filesMetadata)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-3xl border border-white/15 bg-[#0f1115] p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-white/90">Metadados de Upload</h2>
            <p className="mt-1 text-sm text-white/60">
              {filesMetadata.length} arquivo(s) selecionado(s)
            </p>
          </div>
          <button
            onClick={onCancel}
            className="rounded-xl border border-white/10 bg-white/5 p-2 transition hover:bg-white/10"
          >
            <X className="h-5 w-5 text-white/70" />
          </button>
        </div>

        {/* Aplicação em lote */}
        <div className="mb-6 grid grid-cols-2 gap-4 rounded-2xl border border-[#F5C542]/20 bg-[#F5C542]/5 p-4">
          <div>
            <Label className="mb-2 text-sm text-white/70">Aplicar Tipo em Lote</Label>
            <div className="flex gap-2">
              <select
                value={batchType}
                onChange={(e) => setBatchType(e.target.value as FileType | '')}
                className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/90"
              >
                <option value="">Selecione...</option>
                <option value="image">Imagem</option>
                <option value="video">Vídeo</option>
                <option value="pdf">PDF</option>
                <option value="file">Arquivo</option>
              </select>
              <Button
                size="sm"
                onClick={applyBatchType}
                disabled={!batchType}
                className="rounded-xl bg-[#F5C542]/20 hover:bg-[#F5C542]/30"
              >
                Aplicar
              </Button>
            </div>
          </div>

          <div>
            <Label className="mb-2 text-sm text-white/70">Aplicar Kind em Lote</Label>
            <div className="flex gap-2">
              <select
                value={batchKind}
                onChange={(e) => setBatchKind(e.target.value as FileKind | '')}
                className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/90"
              >
                <option value="">Selecione...</option>
                <option value="original">Original</option>
                <option value="modeled">Modelado</option>
              </select>
              <Button
                size="sm"
                onClick={applyBatchKind}
                disabled={!batchKind}
                className="rounded-xl bg-[#F5C542]/20 hover:bg-[#F5C542]/30"
              >
                Aplicar
              </Button>
            </div>
          </div>
        </div>

        {/* Lista de arquivos */}
        <div className="space-y-3">
          {filesMetadata.map((fileMetadata, index) => (
            <div
              key={index}
              className="grid grid-cols-12 gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
            >
              {/* Ícone */}
              <div className="col-span-1 flex items-center justify-center">
                <div className="text-2xl">
                  {fileMetadata.type === 'image' && '🖼️'}
                  {fileMetadata.type === 'video' && '🎥'}
                  {fileMetadata.type === 'pdf' && '📄'}
                  {fileMetadata.type === 'file' && '📦'}
                </div>
              </div>

              {/* Nome */}
              <div className="col-span-5">
                <Label className="mb-1 text-xs text-white/50">Nome</Label>
                <Input
                  value={fileMetadata.name}
                  onChange={(e) => updateFileMetadata(index, 'name', e.target.value)}
                  className="h-9 rounded-xl border-white/15 bg-white/5 text-sm"
                  placeholder="Nome do arquivo..."
                />
              </div>

              {/* Tipo */}
              <div className="col-span-3">
                <Label className="mb-1 text-xs text-white/50">Tipo</Label>
                <select
                  value={fileMetadata.type}
                  onChange={(e) => updateFileMetadata(index, 'type', e.target.value)}
                  className="h-9 w-full rounded-xl border border-white/15 bg-white/5 px-2 text-sm text-white/90"
                >
                  <option value="image">Imagem</option>
                  <option value="video">Vídeo</option>
                  <option value="pdf">PDF</option>
                  <option value="file">Arquivo</option>
                </select>
              </div>

              {/* Kind */}
              <div className="col-span-3">
                <Label className="mb-1 text-xs text-white/50">Kind</Label>
                <select
                  value={fileMetadata.kind}
                  onChange={(e) => updateFileMetadata(index, 'kind', e.target.value)}
                  className="h-9 w-full rounded-xl border border-white/15 bg-white/5 px-2 text-sm text-white/90"
                >
                  <option value="original">Original</option>
                  <option value="modeled">Modelado</option>
                </select>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
          <div className="text-sm text-white/50">
            <p>
              <strong>Tipos suportados:</strong> IMG (jpg, png, webp), VID (mp4, mov, webm), PDF,
              ZIP
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
              className="rounded-xl border-white/15 bg-white/5 hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              className="gap-2 rounded-xl bg-gradient-to-r from-[#FFD36A] to-[#F5C542] font-semibold text-[#1f1f1f] hover:brightness-110"
            >
              <Upload className="h-4 w-4" />
              Enviar {filesMetadata.length} arquivo(s)
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}



