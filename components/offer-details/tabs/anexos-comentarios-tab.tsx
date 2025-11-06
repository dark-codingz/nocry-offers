'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import {
  saCreateAttachment,
  createComment,
  deleteAttachment,
  deleteComment,
} from '@/app/actions/offers'
import { UploadButton } from '@/components/ui/upload-button'
import { FileDisplay } from '@/components/ui/file-display'
import { ALLOWED_FILE_TYPES } from '@/lib/files'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { OfferAttachment, OfferComment } from '@/lib/types'

interface AnexosComentariosTabProps {
  offerId: string
}

export function AnexosComentariosTab({ offerId }: AnexosComentariosTabProps) {
  const supabase = createClient()
  const { showToast } = useToast()
  const [attachments, setAttachments] = useState<OfferAttachment[]>([])
  const [comments, setComments] = useState<OfferComment[]>([])
  const [showAttachmentForm, setShowAttachmentForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fileKey, setFileKey] = useState('')
  const [commentText, setCommentText] = useState('')
  const [authorName, setAuthorName] = useState('')

  useEffect(() => {
    loadData()
  }, [offerId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [attachmentsRes, commentsRes] = await Promise.all([
        supabase
          .schema('offers')
          .from('offer_attachments')
          .select('*')
          .eq('offer_id', offerId)
          .order('created_at', { ascending: false }),
        supabase
          .schema('offers')
          .from('offer_comments')
          .select('*')
          .eq('offer_id', offerId)
          .order('created_at', { ascending: false }),
      ])

      if (attachmentsRes.data) setAttachments(attachmentsRes.data as OfferAttachment[])
      if (commentsRes.data) setComments(commentsRes.data as OfferComment[])
    } catch (err) {
      console.error('[ANEXOS_LOAD]', err)
      showToast('Erro ao carregar dados', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAttachment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    if (!fileKey) {
      showToast('Faça upload de um arquivo primeiro', 'warning')
      return
    }

    try {
      const dto = {
        file_url: fileKey,
        label: (formData.get('label') as string) || undefined,
      }

      // Usar Server Action com RLS corrigido
      const res = await saCreateAttachment(offerId, dto)

      if (!res.ok) {
        console.error('[CREATE_ATTACHMENT_FAIL]', res.error)
        showToast(res.error.message || 'Erro ao salvar', 'error')
        return
      }

      showToast('Anexo salvo com sucesso', 'success')
      setShowAttachmentForm(false)
      setFileKey('')
      loadData()
      // Reset seguro
      const formEl = e.currentTarget as HTMLFormElement | null
      formEl?.reset()
    } catch (err) {
      console.error('[ANEXO_CLIENT_ERROR]', err)
      showToast(
        `Erro ao salvar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
        'error'
      )
    }
  }

  const handleCreateComment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!commentText.trim() || !authorName.trim()) {
      showToast('Preencha autor e comentário', 'warning')
      return
    }

    try {
      const dto = {
        author: authorName || undefined,
        body: commentText,
      }

      const result = await createComment(offerId, dto)

      if (!result.success) {
        throw new Error(result.error || 'Erro ao salvar')
      }

      showToast('Comentário adicionado', 'success')
      setCommentText('')
      setAuthorName('')
      loadData()
    } catch (err) {
      console.error('[COMMENT_SAVE]', err)
      showToast(
        `Erro ao salvar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
        'error'
      )
    }
  }

  const handleDeleteAttachment = async (id: string) => {
    if (!confirm('Deseja realmente excluir este anexo?')) return

    try {
      const result = await deleteAttachment(offerId, id)

      if (!result.success) {
        throw new Error(result.error || 'Erro ao excluir')
      }

      showToast('Anexo excluído', 'success')
      loadData()
    } catch (err) {
      console.error('[ANEXOS_DELETE]', err)
      showToast('Erro ao excluir', 'error')
    }
  }

  const handleDeleteComment = async (id: string) => {
    if (!confirm('Deseja realmente excluir este comentário?')) return

    try {
      const result = await deleteComment(offerId, id)

      if (!result.success) {
        throw new Error(result.error || 'Erro ao excluir')
      }

      showToast('Comentário excluído', 'success')
      loadData()
    } catch (err) {
      console.error('[COMMENT_DELETE]', err)
      showToast('Erro ao excluir', 'error')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      const form = e.currentTarget.form
      if (form) {
        form.requestSubmit()
      }
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-sm text-muted-foreground">Carregando...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Anexos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Anexos</CardTitle>
            <Button size="sm" onClick={() => setShowAttachmentForm(!showAttachmentForm)}>
              {showAttachmentForm ? 'Cancelar' : 'Adicionar'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAttachmentForm && (
            <form onSubmit={handleCreateAttachment} className="space-y-4 rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-xl">
              <div className="space-y-2">
                <Label>
                  Arquivo <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Faça upload do arquivo..."
                    value={fileKey ? fileKey.split('/').pop() : ''}
                    disabled
                  />
                  <UploadButton
                    offerId={offerId}
                    category="attachments"
                    accept={ALLOWED_FILE_TYPES.attachments}
                    label="Upload"
                    onUploaded={(key) => setFileKey(key)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="label">Rótulo / Nome</Label>
                <Input id="label" name="label" placeholder="Nome do arquivo" />
              </div>

              <Button type="submit" disabled={!fileKey}>
                Salvar
              </Button>
            </form>
          )}

          {attachments.length === 0 && !showAttachmentForm && (
            <p className="text-center text-sm text-muted-foreground">Nenhum anexo cadastrado</p>
          )}

          {attachments.map((attachment) => (
            <div key={attachment.id} className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-xl transition hover:bg-white/[0.15]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  {attachment.label && <h4 className="font-medium">{attachment.label}</h4>}
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      {attachment.file_url.split('/').pop()}
                    </p>
                    <FileDisplay fileKey={attachment.file_url} label="Baixar" />
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteAttachment(attachment.id)}
                >
                  Excluir
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Comentários */}
      <Card>
        <CardHeader>
          <CardTitle>Comentários</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleCreateComment} className="space-y-4 rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-xl">
            <div className="space-y-2">
              <Label htmlFor="author">
                Autor <span className="text-destructive">*</span>
              </Label>
              <Input
                id="author"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Seu nome"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">
                Comentário <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="body"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={4}
                placeholder="Escreva seu comentário... (Ctrl/Cmd+Enter para enviar)"
                required
              />
            </div>

            <Button type="submit">Adicionar Comentário</Button>
          </form>

          {comments.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">Nenhum comentário ainda</p>
          )}

          {comments.map((comment) => (
            <div key={comment.id} className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-xl transition hover:bg-white/[0.15]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{comment.author}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(comment.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteComment(comment.id)}
                >
                  Excluir
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
