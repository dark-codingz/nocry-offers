export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import { runCloneJob, createZipFromDir } from '@/lib/cloneJob'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const url = body?.url?.toString().trim()

    if (!url) {
      return NextResponse.json({ error: 'URL é obrigatória' }, { status: 400 })
    }

    // Usar helper compartilhado
    const result = await runCloneJob(url)

    // Gerar ZIP
    // Na Vercel, usar /tmp; em desenvolvimento, usar public/clone-jobs
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV
    const baseDir = isVercel 
      ? '/tmp/clone-jobs'
      : path.join(process.cwd(), 'public', 'clone-jobs')
    
    const outZip = path.join(baseDir, `${result.jobId}.zip`)
    
    // Garantir que o diretório existe
    await fs.promises.mkdir(baseDir, { recursive: true })
    
    await createZipFromDir(result.workDir, outZip)

    const zipBuffer = await fs.promises.readFile(outZip)

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


