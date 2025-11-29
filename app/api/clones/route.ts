import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase/server'
import { runCloneJob, injectBaseHref } from '@/lib/cloneJob'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/clones
 * Cria um novo clone usando o clonador completo (com assets)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Validar autenticação
    const supabase = await getServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // 2. Parse do body
    const body = await request.json()
    const { url } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL é obrigatória' }, { status: 400 })
    }

    // 3. Validar URL
    try {
      const parsedUrl = new URL(url)
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Protocolo inválido')
      }
    } catch {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
    }

    // 4. Executar clonagem completa (com assets)
    let result
    try {
      result = await runCloneJob(url)
    } catch (error) {
      console.error('[CLONE] Job error:', error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Falha ao clonar página' },
        { status: 502 }
      )
    }

    // 5. Injetar <base href> no HTML para que assets carreguem corretamente
    const htmlWithBase = injectBaseHref(result.finalHtml, result.publicBasePath)

    // 6. Inserir no banco (com job_id)
    const { data: clone, error: insertError } = await supabase
      .from('cloned_pages')
      .insert({
        user_id: user.id,
        original_url: url,
        html: htmlWithBase,
        css: null,
        js: null,
        job_id: result.jobId,
      })
      .select('id')
      .single()

    if (insertError || !clone) {
      console.error('[CLONE] Insert error:', insertError)
      return NextResponse.json(
        { error: 'Falha ao salvar clone no banco' },
        { status: 500 }
      )
    }

    return NextResponse.json({ cloneId: clone.id }, { status: 201 })
  } catch (error) {
    console.error('[CLONE] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

