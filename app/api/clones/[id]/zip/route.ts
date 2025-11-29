import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase/server'
import * as fs from 'fs'
import * as path from 'path'
import archiver from 'archiver'
import { downloadLandingToDir, getJobPaths } from '@/lib/cloneJob'
import { cleanHtmlForExport } from '@/lib/editorHtml'
import crypto from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function randomId(len = 7) {
  return crypto.randomBytes(Math.ceil(len / 2)).toString('base64url').slice(0, len)
}

/**
 * POST /api/clones/[id]/zip
 * Gera e retorna um ZIP do clone editado COM TODOS OS ASSETS
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 1. Validar autenticação
    const supabase = await getServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // 2. Buscar clone (com original_url)
    const { data: clone, error: fetchError } = await supabase
      .from('cloned_pages')
      .select('id, html, original_url')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !clone) {
      return NextResponse.json({ error: 'Clone não encontrado' }, { status: 404 })
    }

    if (!clone.original_url) {
      return NextResponse.json(
        { error: 'Clone sem URL original' },
        { status: 400 }
      )
    }

    // 3. Limpar HTML (remover <base> e script do editor)
    const cleanHtml = cleanHtmlForExport(clone.html)

    // 4. Criar diretório de trabalho
    const jobId = `edit-${clone.id}-${Date.now()}-${randomId()}`
    const { jobDir } = getJobPaths(jobId)

    // 5. Baixar todos os assets e reescrever HTML
    const { html: rewrittenHtml } = await downloadLandingToDir({
      html: cleanHtml,
      baseUrl: clone.original_url,
      jobDir,
      relativeAssetsPrefix: 'assets',
    })

    // 6. Salvar HTML reescrito como index.html
    await fs.promises.writeFile(path.join(jobDir, 'index.html'), rewrittenHtml, 'utf8')

    // 7. Gerar ZIP em memória
    const chunks: Buffer[] = []
    const archive = archiver('zip', { zlib: { level: 9 } })

    const zipPromise = new Promise<void>((resolve, reject) => {
      archive.on('data', (chunk: Buffer) => chunks.push(chunk))
      archive.on('end', () => resolve())
      archive.on('error', (err: Error) => reject(err))
    })

    // Adicionar todo o diretório ao ZIP, mantendo a estrutura
    // O root do ZIP será o nome do job (ex: clone-123.../)
    archive.directory(jobDir, false)
    await archive.finalize()
    await zipPromise

    const zipBuffer = Buffer.concat(chunks)

    // 8. Limpar pasta temporária
    try {
      await fs.promises.rm(jobDir, { recursive: true, force: true })
    } catch (cleanError) {
      console.warn('[CLONE] Cleanup warning:', cleanError)
    }

    // 9. Retornar ZIP
    return new Response(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="nocry-clone-edited.zip"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[CLONE] ZIP error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao gerar ZIP' },
      { status: 500 }
    )
  }
}

