import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase/server'
import * as fs from 'fs'
import * as path from 'path'
import { createZipFromDir, copyDirRecursive } from '@/lib/cloneJob'
import { cleanHtmlForExport } from '@/lib/editorHtml'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

    // 2. Buscar clone (com job_id)
    const { data: clone, error: fetchError } = await supabase
      .from('cloned_pages')
      .select('id, html, job_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !clone) {
      return NextResponse.json({ error: 'Clone não encontrado' }, { status: 404 })
    }

    // Na Vercel, usar /tmp; em desenvolvimento, usar public/
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV
    const baseDir = isVercel ? '/tmp' : path.join(process.cwd(), 'public')
    
    let editDir: string
    let zipPath: string

    if (clone.job_id) {
      // CASO 1: Tem job_id - copiar assets e sobrescrever HTML
      const originalDir = isVercel
        ? path.join('/tmp', 'clone-jobs', clone.job_id)
        : path.join(process.cwd(), 'public', 'clone-jobs', clone.job_id)

      // Verificar se a pasta original existe
      const originalExists = await fs.promises
        .access(originalDir)
        .then(() => true)
        .catch(() => false)

      if (!originalExists) {
        console.warn(`[CLONE] Original dir not found: ${originalDir}, falling back to HTML only`)
        // Fallback: criar pasta só com HTML limpo
        const jobId = `edit-${clone.id}-${Date.now()}`
        editDir = path.join(baseDir, 'clone-edited-jobs', jobId)
        await fs.promises.mkdir(editDir, { recursive: true })
        
        // Limpar HTML antes de salvar
        const cleanHtml = cleanHtmlForExport(clone.html)
        await fs.promises.writeFile(path.join(editDir, 'index.html'), cleanHtml, 'utf8')
        
        zipPath = path.join(baseDir, 'clone-edited-jobs', `${jobId}.zip`)
      } else {
        // Copiar todos os assets
        const editJobId = `edit-${clone.job_id}-${Date.now()}`
        editDir = path.join(baseDir, 'clone-edited-jobs', editJobId)

        // Copiar recursivamente
        await copyDirRecursive(originalDir, editDir)

        // Limpar HTML (remover <base> e script do editor) antes de salvar
        const cleanHtml = cleanHtmlForExport(clone.html)
        await fs.promises.writeFile(path.join(editDir, 'index.html'), cleanHtml, 'utf8')

        zipPath = path.join(baseDir, 'clone-edited-jobs', `${editJobId}.zip`)
      }
    } else {
      // CASO 2: Sem job_id - fallback (só HTML limpo)
      const jobId = `edit-${clone.id}-${Date.now()}`
      editDir = path.join(baseDir, 'clone-edited-jobs', jobId)
      await fs.promises.mkdir(editDir, { recursive: true })
      
      // Limpar HTML antes de salvar
      const cleanHtml = cleanHtmlForExport(clone.html)
      await fs.promises.writeFile(path.join(editDir, 'index.html'), cleanHtml, 'utf8')
      
      zipPath = path.join(baseDir, 'clone-edited-jobs', `${jobId}.zip`)
    }

    // 3. Criar ZIP
    await createZipFromDir(editDir, zipPath)

    // 4. Ler ZIP como buffer
    const zipBuffer = await fs.promises.readFile(zipPath)

    // 5. Limpar pasta temporária (mantém ZIP)
    try {
      await fs.promises.rm(editDir, { recursive: true, force: true })
    } catch (cleanError) {
      console.warn('[CLONE] Cleanup warning:', cleanError)
    }

    // 6. Retornar ZIP
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
    return NextResponse.json({ error: 'Erro ao gerar ZIP' }, { status: 500 })
  }
}

