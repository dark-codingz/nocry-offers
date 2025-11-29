import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/clones/[id]
 * Retorna um clone específico do usuário logado
 */
export async function GET(
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

    // 2. Buscar clone
    const { data: clone, error: fetchError } = await supabase
      .from('cloned_pages')
      .select('id, original_url, html, css, js, created_at, updated_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !clone) {
      return NextResponse.json({ error: 'Clone não encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      id: clone.id,
      original_url: clone.original_url,
      html: clone.html,
      css: clone.css,
      js: clone.js,
      created_at: clone.created_at,
      updated_at: clone.updated_at,
    })
  } catch (error) {
    console.error('[CLONE] GET error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/clones/[id]
 * Atualiza o HTML de um clone
 */
export async function PUT(
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

    // 2. Parse do body
    const body = await request.json()
    const { html } = body

    if (!html || typeof html !== 'string') {
      return NextResponse.json({ error: 'HTML é obrigatório' }, { status: 400 })
    }

    // 3. Verificar se o clone pertence ao usuário
    const { data: existing } = await supabase
      .from('cloned_pages')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Clone não encontrado' }, { status: 404 })
    }

    // 4. Atualizar
    const { error: updateError } = await supabase
      .from('cloned_pages')
      .update({
        html,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('[CLONE] Update error:', updateError)
      return NextResponse.json(
        { error: 'Falha ao atualizar clone' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[CLONE] PUT error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

