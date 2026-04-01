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

    // 2. Buscar clone e obter clone_group_id
    let { data: clone, error: fetchError } = await supabase
      .from('cloned_pages')
      .select('id, clone_group_id, original_url, html, editable_html, is_spa_framework, path, is_root, order_index, css, js, created_at, updated_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    // Se falhou por causa das colunas novas, tenta buscar sem elas
    if (fetchError && (fetchError.message?.includes('editable_html') || fetchError.message?.includes('is_spa_framework') || fetchError.message?.includes('clone_group_id'))) {
      const { data: cloneFallback, error: fetchErrorFallback } = await supabase
        .from('cloned_pages')
        .select('id, original_url, html, css, js, created_at, updated_at')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()
      
      clone = cloneFallback
      fetchError = fetchErrorFallback
    }

    if (fetchError || !clone) {
      return NextResponse.json({ error: 'Clone não encontrado' }, { status: 404 })
    }

    // 3. Buscar todas as páginas do mesmo grupo
    const cloneGroupId = (clone as any).clone_group_id || clone.id // Fallback: se não tem grupo, usa o próprio ID

    let pagesQuery = supabase
      .from('cloned_pages')
      .select('id, original_url, path, html, editable_html, is_spa_framework, is_root, order_index')
      .eq('user_id', user.id)

    if (cloneGroupId) {
      pagesQuery = pagesQuery.eq('clone_group_id', cloneGroupId)
    } else {
      pagesQuery = pagesQuery.eq('id', id)
    }

    const { data: allPages, error: pagesError } = await pagesQuery.order('order_index', { ascending: true })

    if (pagesError) {
      console.error('[CLONE] Pages fetch error:', pagesError)
    }

    // 4. Montar lista de páginas
    const pages = (allPages || []).map((p: any) => ({
      id: p.id,
      originalUrl: p.original_url,
      path: p.path || '/',
      isRoot: p.is_root || false,
      orderIndex: p.order_index || 0,
      isSpaFramework: p.is_spa_framework || false,
      editableHtml: p.editable_html || p.html || '',
      html: p.html || '',
    }))

    // 5. Obter origin
    const origin = new URL(clone.original_url).origin

    // 6. Usar editable_html se existir e for SPA, senão usar html normal
    const htmlToUse = (clone as any).is_spa_framework && (clone as any).editable_html 
      ? (clone as any).editable_html 
      : clone.html

    return NextResponse.json({
      id: clone.id,
      cloneGroupId: cloneGroupId,
      origin: origin,
      original_url: clone.original_url,
      html: htmlToUse,
      isSpaFramework: (clone as any).is_spa_framework || false,
      pages: pages,
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

    // 4. Verificar se é SPA para decidir o que atualizar
    const { data: existingClone } = await supabase
      .from('cloned_pages')
      .select('is_spa_framework')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    const isSpaFramework = (existingClone as any)?.is_spa_framework || false

    // 5. Atualizar
    // Para SPA: atualizar apenas editable_html (não tocar no html/rawHtml)
    // Para não-SPA: atualizar html normalmente
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (isSpaFramework) {
      // Para SPA, salvar edições apenas em editable_html
      updateData.editable_html = html
    } else {
      // Para não-SPA, atualizar html normalmente
      updateData.html = html
    }

    const { error: updateError } = await supabase
      .from('cloned_pages')
      .update(updateData)
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


