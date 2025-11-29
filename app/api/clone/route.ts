export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import fs from 'node:fs'
import { runCloneJob, createZipFromDir, resolveCloneJobPaths, CLONE_JOBS_ROOT } from '@/lib/cloneJob'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const url = body?.url?.toString().trim()

    if (!url) {
      return NextResponse.json({ error: 'URL é obrigatória' }, { status: 400 })
    }

    // Usar helper compartilhado
    const result = await runCloneJob(url)

    // Gerar ZIP usando função centralizada
    const { zipPath } = resolveCloneJobPaths(result.jobId)
    
    // Garantir que o diretório existe
    await fs.promises.mkdir(CLONE_JOBS_ROOT, { recursive: true })
    
    await createZipFromDir(result.workDir, zipPath)

    const zipBuffer = await fs.promises.readFile(zipPath)

    return new Response(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="cloned-page.zip"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    const message = err?.message || 'Erro inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


