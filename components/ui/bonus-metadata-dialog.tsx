'use client'

import { useState, useEffect } from 'react'
import { X, Upload } from 'lucide-react'
import { Button } from './button'
import { Input } from './input'
import { Label } from './label'
import { Select } from './select'

// Função para detectar tipo do arquivo
function detectFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  if (ext === 'pdf') return 'PDF'
  if (ext === 'zip') return 'ZIP'
  if (['doc', 'docx'].includes(ext)) return 'DOC'
  return 'FILE'
}

interface BonusMetadataDialogProps {
  files: File[]
  onConfirm: (filesWithMetadata: Array<{ file: File; title: string; content_type: string; short_desc?: string }>) => void
  onCancel: () => void
}

export function BonusMetadataDialog({ files, onConfirm, onCancel }: BonusMetadataDialogProps) {
  const [fileMetadatas, setFileMetadatas] = useState<
    Array<{ file: File; title: string; content_type: string; short_desc?: string }>
  >([])

  // Inicializar metadados
  useEffect(() => {
    const initial = files.map((file) => ({
      file,
      title: file.name.replace(/\.[^/.]+$/, ''), // Nome sem extensão
      content_type: detectFileType(file.name),
      short_desc: '',
    }))
    setFileMetadatas(initial)
  }, [files])

  // Atualizar metadados de um arquivo
  const updateFileMetadata = (
    index: number,
    field: 'title' | 'content_type' | 'short_desc',
    value: string
  ) => {
    setFileMetadatas((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  // Validar antes de confirmar
  const handleConfirm = () => {
    // Validar títulos não vazios
    const hasEmptyTitle = fileMetadatas.some((f) => !f.title.trim())
    if (hasEmptyTitle) {
      alert('Todos os entregáveis devem ter um título')
      return
    }

    onConfirm(fileMetadatas)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-3xl border border-white/15 bg-[#0f1115] p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-white/90">Nomear Entregáveis</h2>
            <p className="mt-1 text-sm text-white/60">
              {fileMetadatas.length} arquivo(s) selecionado(s)
            </p>
          </div>
          <button
            onClick={onCancel}
            className="rounded-xl border border-white/10 bg-white/5 p-2 transition hover:bg-white/10"
          >
            <X className="h-5 w-5 text-white/70" />
          </button>
        </div>

        {/* Lista de arquivos */}
        <div className="space-y-3">
          {fileMetadatas.map((fileMetadata, index) => (
            <div
              key={index}
              className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3"
            >
              <div className="grid grid-cols-12 gap-3">
                {/* Ícone */}
                <div className="col-span-1 flex items-center justify-center">
                  <div className="text-2xl">
                    {fileMetadata.content_type === 'PDF' && '📄'}
                    {fileMetadata.content_type === 'ZIP' && '📦'}
                    {fileMetadata.content_type === 'DOC' && '📝'}
                    {fileMetadata.content_type === 'FILE' && '📁'}
                  </div>
                </div>

                {/* Título */}
                <div className="col-span-7">
                  <Label className="mb-1 text-xs text-white/50">Título</Label>
                  <Input
                    value={fileMetadata.title}
                    onChange={(e) => updateFileMetadata(index, 'title', e.target.value)}
                    className="h-9 rounded-xl border-white/15 bg-white/5 text-sm"
                    placeholder="Ex: Cardápio Anti-Estresse"
                  />
                </div>

                {/* Tipo */}
                <div className="col-span-4">
                  <Label className="mb-1 text-xs text-white/50">Tipo</Label>
                  <select
                    value={fileMetadata.content_type}
                    onChange={(e) => updateFileMetadata(index, 'content_type', e.target.value)}
                    className="h-9 w-full rounded-xl border border-white/15 bg-white/5 px-2 text-sm text-white/90"
                  >
                    <option value="PDF">PDF</option>
                    <option value="ZIP">ZIP</option>
                    <option value="DOC">DOC</option>
                    <option value="FILE">Arquivo</option>
                  </select>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <Label className="mb-1 text-xs text-white/50">Descrição (opcional)</Label>
                <textarea
                  value={fileMetadata.short_desc || ''}
                  onChange={(e) => updateFileMetadata(index, 'short_desc', e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/90 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#F5C542]/30"
                  placeholder="Breve descrição do entregável..."
                  rows={2}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
          <div className="text-sm text-white/50">
            <p>
              <strong>Tipos suportados:</strong> PDF, ZIP, DOC, DOCX
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
              Enviar {fileMetadatas.length} entregável(is)
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

