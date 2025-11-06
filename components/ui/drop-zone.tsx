'use client'

import { useCallback, useState } from 'react'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'

interface DropZoneProps {
  onFilesAdded: (files: File[]) => void
  accept?: string
  maxSize?: number // em MB
  multiple?: boolean
}

export function DropZone({
  onFilesAdded,
  accept = 'image/*,video/*,.pdf,.zip',
  maxSize = 50,
  multiple = true,
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const validateFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return []

      const validFiles: File[] = []
      const maxBytes = maxSize * 1024 * 1024

      Array.from(files).forEach((file) => {
        if (file.size > maxBytes) {
          toast.error(`⚠️ ${file.name} é muito grande (máx: ${maxSize}MB)`)
          return
        }

        // Validar tipo básico
        const acceptedTypes = accept.split(',').map((t) => t.trim())
        const isValid = acceptedTypes.some((type) => {
          if (type.startsWith('.')) {
            return file.name.toLowerCase().endsWith(type.toLowerCase())
          }
          if (type.endsWith('/*')) {
            return file.type.startsWith(type.replace('/*', ''))
          }
          return file.type === type
        })

        if (!isValid) {
          toast.error(`⚠️ Formato não suportado: ${file.name}`)
          return
        }

        validFiles.push(file)
      })

      return validFiles
    },
    [accept, maxSize]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const files = validateFiles(e.dataTransfer.files)
      if (files.length > 0) {
        onFilesAdded(files)
      }
    },
    [validateFiles, onFilesAdded]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = validateFiles(e.target.files)
      if (files.length > 0) {
        onFilesAdded(files)
      }
      // Reset input para permitir re-upload do mesmo arquivo
      e.target.value = ''
    },
    [validateFiles, onFilesAdded]
  )

  return (
    <div
      className={`relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed p-8 text-center transition ${
        isDragging
          ? 'border-[#F5C542] bg-[#F5C542]/10'
          : 'border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/8'
      }`}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => document.getElementById('file-input')?.click()}
    >
      <input
        id="file-input"
        type="file"
        className="hidden"
        accept={accept}
        multiple={multiple}
        onChange={handleFileInput}
      />

      <div className="flex flex-col items-center gap-3">
        <div
          className={`rounded-full p-4 transition ${
            isDragging ? 'bg-[#F5C542]/20' : 'bg-white/10'
          }`}
        >
          <Upload className={`h-8 w-8 ${isDragging ? 'text-[#F5C542]' : 'text-white/60'}`} />
        </div>

        <div>
          <p className="text-sm font-medium text-white/90">
            {isDragging ? 'Solte os arquivos aqui' : 'Arraste arquivos ou clique para selecionar'}
          </p>
          <p className="mt-1 text-xs text-white/50">
            {accept.includes('image') && 'IMG, '}
            {accept.includes('video') && 'VID, '}
            {accept.includes('pdf') && 'PDF, '}
            {accept.includes('zip') && 'ZIP '}
            (máx: {maxSize}MB)
          </p>
        </div>
      </div>
    </div>
  )
}



