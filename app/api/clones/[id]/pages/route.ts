import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/clones/[id]/pages
 * Retorna todas as páginas de um clone (root + subpáginas)
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

    // 2. Buscar a página pelo ID para obter o clone_group_id
    const { data: page, error: pageError } = await supabase
      .from('cloned_pages')
      .select('id, clone_group_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (pageError || !page) {
      return NextResponse.json({ error: 'Clone não encontrado' }, { status: 404 })
    }

    // 3. Buscar todas as páginas do mesmo grupo
    const cloneGroupId = (page as any).clone_group_id

    let query = supabase
      .from('cloned_pages')
      .select('id, original_url, path, is_root, order_index, is_spa_framework, created_at, updated_at')
      .eq('user_id', user.id)

    // Se clone_group_id existe, filtrar por ele
    if (cloneGroupId) {
      query = query.eq('clone_group_id', cloneGroupId)
    } else {
      // Fallback: se não tem clone_group_id, retorna só a página atual
      query = query.eq('id', id)
    }

    const { data: pages, error: pagesError } = await query.order('order_index', { ascending: true })

    if (pagesError) {
      console.error('[CLONE] Pages fetch error:', pagesError)
      return NextResponse.json(
        { error: 'Erro ao buscar páginas' },
        { status: 500 }
      )
    }

    // 4. Mapear para formato de resposta
    const pagesList = (pages || []).map((p: any) => ({
      id: p.id,
      originalUrl: p.original_url,
      path: p.path || '/',
      isRoot: p.is_root || false,
      orderIndex: p.order_index || 0,
      isSpaFramework: p.is_spa_framework || false,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }))

    return NextResponse.json({
      cloneId: id,
      cloneGroupId: cloneGroupId,
      pages: pagesList,
    })
  } catch (error) {
    console.error('[CLONE] GET pages error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

