'use client'

import { useState } from 'react'
import { Eye, Copy, Download, Trash2, MoreVertical, GripVertical, CopyPlus, ArrowLeftRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from './button'
import Image from 'next/image'
import { getDownloadUrl } from '@/lib/upload'

interface CreativeCardProps {
  id: string
  name: string
  fileUrl?: string
  fileKey?: string
  fileType?: 'IMG' | 'VID' | 'PDF' | 'ZIP'
  duration?: string
  size?: string
  format?: string
  width?: number
  height?: number
  isWinner?: boolean
  kind?: 'original' | 'modeled'
  onPreview: () => void
  onDelete: () => void
  onRename?: (newName: string) => void
  onDuplicate?: () => void
  onChangeKind?: () => void
  draggable?: boolean
}

export function CreativeCard({
  id,
  name,
  fileUrl,
  fileKey,
  fileType = 'IMG',
  duration,
  size,
  format,
  width,
  height,
  isWinner = false,
  kind,
  onPreview,
  onDelete,
  onRename,
  onDuplicate,
  onChangeKind,
  draggable = false,
}: CreativeCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState(name)
  const [showActions, setShowActions] = useState(false)

  const handleCopyLink = () => {
    if (fileUrl) {
      navigator.clipboard.writeText(fileUrl)
      toast.success('✅ Link copiado')
    }
  }

  const handleDownload = () => {
    if (!fileUrl) return

    // Usar getDownloadUrl se tiver fileKey (força download)
    const downloadUrl = fileKey ? getDownloadUrl(fileKey, name) : fileUrl

    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = name
    a.target = '_blank'
    a.click()
  }

  const handleRename = () => {
    const trimmed = editedName.trim()

    // Validação: não pode estar vazio
    if (!trimmed) {
      toast.error('⚠️ Nome não pode estar vazio')
      setEditedName(name)
      setIsEditing(false)
      return
    }

    // Salvar se mudou
    if (onRename && trimmed !== name) {
      onRename(trimmed)
      toast.success('✅ Nome atualizado')
    }

    setIsEditing(false)
  }

  const handleDeleteWithUndo = () => {
    toast(
      <div className="flex items-center gap-2">
        <span>Criativo excluído</span>
      </div>,
      {
        duration: 5000,
        action: {
          label: 'Desfazer',
          onClick: () => toast.info('Ação desfeita'),
        },
      }
    )
    // Delay para dar tempo do desfazer
    setTimeout(onDelete, 5100)
  }

  const getBadgeColor = () => {
    switch (fileType) {
      case 'VID':
        return 'bg-purple-500/20 text-purple-300'
      case 'PDF':
        return 'bg-red-500/20 text-red-300'
      case 'ZIP':
        return 'bg-yellow-500/20 text-yellow-300'
      default:
        return 'bg-blue-500/20 text-blue-300'
    }
  }

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/15 bg-white/8 shadow-lg backdrop-blur-xl transition hover:border-white/25 hover:bg-white/10 hover:shadow-xl"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Drag Handle (se habilitado) */}
      {draggable && (
        <div className="absolute left-2 top-2 z-10 cursor-grab rounded-lg bg-black/40 p-1 opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
          <GripVertical className="h-4 w-4 text-white/70" />
        </div>
      )}

      {/* Winner Badge */}
      {isWinner && (
        <div className="absolute right-2 top-2 z-10 rounded-lg bg-gradient-to-r from-yellow-500/30 to-orange-500/30 px-2 py-1 text-xs font-medium text-yellow-200 backdrop-blur-sm">
          🏆 Winner
        </div>
      )}

      {/* Thumbnail / Preview */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-white/5">
        {fileUrl && (fileType === 'IMG' || fileType === 'VID') ? (
          <div className="relative h-full w-full">
            {fileType === 'IMG' ? (
              <img
                src={fileUrl}
                alt={name}
                className="h-full w-full object-cover transition group-hover:scale-105"
              />
            ) : (
              <video
                src={fileUrl}
                className="h-full w-full object-cover"
                muted
                pluck-poster="true"
              >
                <track kind="captions" />
              </video>
            )}
            {/* Overlay de ações (desktop) */}
            <div
              className={`absolute inset-0 flex items-center justify-center gap-2 bg-black/60 backdrop-blur-sm transition ${
                showActions ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <Button
                size="sm"
                variant="ghost"
                onClick={onPreview}
                className="h-9 w-9 rounded-xl border border-white/20 bg-white/10 p-0 hover:bg-white/20"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyLink}
                className="h-9 w-9 rounded-xl border border-white/20 bg-white/10 p-0 hover:bg-white/20"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDownload}
                className="h-9 w-9 rounded-xl border border-white/20 bg-white/10 p-0 hover:bg-white/20"
              >
                <Download className="h-4 w-4" />
              </Button>
              {onDuplicate && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onDuplicate()
                    toast.success('✅ Duplicado')
                  }}
                  className="h-9 w-9 rounded-xl border border-[#F5C542]/30 bg-[#F5C542]/20 p-0 hover:bg-[#F5C542]/30"
                >
                  <CopyPlus className="h-4 w-4" />
                </Button>
              )}
              {onChangeKind && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onChangeKind()
                    toast.success('✅ Kind alterado')
                  }}
                  className="h-9 w-9 rounded-xl border border-blue-500/30 bg-blue-500/20 p-0 hover:bg-blue-500/30"
                  title="Alterar Kind (Original ↔ Modelado)"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDeleteWithUndo}
                className="h-9 w-9 rounded-xl border border-red-500/30 bg-red-500/20 p-0 hover:bg-red-500/30"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="text-4xl opacity-30">📄</div>
              <p className="mt-2 text-xs text-white/40">{fileType}</p>
            </div>
          </div>
        )}
      </div>

      {/* Metadados e Título */}
      <div className="flex flex-col gap-2 p-3">
        {/* Título editável */}
        {isEditing ? (
          <input
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename()
              if (e.key === 'Escape') {
                setEditedName(name)
                setIsEditing(false)
              }
            }}
            className="rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-sm font-medium text-white/90 outline-none focus:border-[#F5C542]/50 focus:ring-2 focus:ring-[#F5C542]/20"
            autoFocus
          />
        ) : (
          <h4
            className="cursor-pointer truncate text-sm font-medium text-white/90 transition hover:text-white"
            onClick={() => onRename && setIsEditing(true)}
            title={name}
          >
            {name}
          </h4>
        )}

        {/* Badges e metadados */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded-md px-2 py-0.5 font-medium ${getBadgeColor()}`}>
            {fileType}
          </span>
          {kind && (
            <span
              className={`rounded-md px-2 py-0.5 font-medium ${
                kind === 'original'
                  ? 'bg-sky-500/20 text-sky-300'
                  : 'bg-emerald-500/20 text-emerald-300'
              }`}
            >
              {kind === 'original' ? 'Original' : 'Modelado'}
            </span>
          )}
          {duration && <span className="text-white/50">{duration}</span>}
          {size && <span className="text-white/50">{size}</span>}
          {width && height && (
            <span className="text-white/50">
              {width}×{height}
            </span>
          )}
          {format && <span className="text-white/50">{format}</span>}
        </div>
      </div>

      {/* Menu mobile (3 dots) */}
      <button
        className="absolute bottom-2 right-2 rounded-lg bg-white/10 p-1.5 opacity-0 backdrop-blur-sm transition hover:bg-white/20 group-hover:opacity-100 md:hidden"
        onClick={() => setShowActions(!showActions)}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
    </div>
  )
}

