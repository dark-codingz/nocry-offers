import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase/server'
import { runCloneJob, injectBaseHref } from '@/lib/cloneJob'
import { discoverSubpageLinks } from '@/lib/discoverSubpages'
import { cloneSubpage } from '@/lib/cloneSubpage'
import crypto from 'node:crypto'

/**
 * Normaliza um path de forma consistente (remove trailing slash, garante / para root)
 */
function normalizePath(path: string): string {
  if (!path) return '/'
  let normalized = path
  // Remover trailing slash (exceto se for só "/")
  if (normalized !== '/' && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1)
  }
  // Se vazio, normalizar para "/"
  if (!normalized) {
    normalized = '/'
  }
  return normalized
}

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

    // 5. Criar clone_group_id único para agrupar todas as páginas deste clone
    const cloneGroupId = crypto.randomUUID()

    // 6. Injetar <base href> no HTML para que assets carreguem corretamente
    // Para SPA: salvar rawHtml original como html, editableHtml sanitizado como editable_html
    // Para não-SPA: salvar finalHtml processado como html, editableHtml = html
    const rawHtmlWithBase = injectBaseHref(result.rawHtml, result.publicBasePath)
    const editableHtmlWithBase = injectBaseHref(result.editableHtml, result.publicBasePath)
    const finalHtmlWithBase = injectBaseHref(result.finalHtml, result.publicBasePath)
    
    // HTML para salvar no campo html (rawHtml para SPA, finalHtml para outros)
    const htmlToSave = result.isSpaFramework ? rawHtmlWithBase : finalHtmlWithBase

    // Normalizar path da página root de forma consistente
    const baseUrl = new URL(url)
    const normalizedRootPath = normalizePath(baseUrl.pathname || '/')

    // 7. Inserir página root no banco
    let insertData: any = {
      user_id: user.id,
      original_url: url,
      html: htmlToSave,
      css: null,
      js: null,
      job_id: result.jobId,
      editable_html: editableHtmlWithBase,
      is_spa_framework: result.isSpaFramework,
      clone_group_id: cloneGroupId,
      path: normalizedRootPath,
      is_root: true,
      order_index: 0,
    }

    let { data: rootPage, error: insertError } = await supabase
      .from('cloned_pages')
      .insert(insertData)
      .select('id')
      .single()

    // Se falhou por causa das colunas novas não existirem, tenta sem elas (fallback)
    if (insertError && (insertError.message?.includes('editable_html') || insertError.message?.includes('is_spa_framework') || insertError.message?.includes('clone_group_id'))) {
      console.warn('[CLONE] Campos novos não encontrados, inserindo sem eles. Execute as migrations necessárias.')
      const { data: cloneFallback, error: insertErrorFallback } = await supabase
        .from('cloned_pages')
        .insert({
          user_id: user.id,
          original_url: url,
          html: htmlToSave,
          css: null,
          js: null,
          job_id: result.jobId,
        })
        .select('id')
        .single()
      
      rootPage = cloneFallback
      insertError = insertErrorFallback
    }

    if (insertError || !rootPage) {
      console.error('[CLONE] Insert error:', insertError)
      return NextResponse.json(
        { error: 'Falha ao salvar clone no banco' },
        { status: 500 }
      )
    }

    // 8. Clonagem recursiva de subpáginas em múltiplos níveis
    // Sistema recursivo que:
    // - Clona links da página root (nível 1)
    // - Para cada subpágina clonada, descobre seus links e clona (nível 2)
    // - Continua até atingir profundidade máxima ou limite de páginas
    // - Evita duplicatas e ciclos usando Set de paths clonados
    const clonedPaths = new Set<string>([normalizedRootPath]) // Evitar duplicatas e ciclos
    console.log(`[CLONE] Iniciando clonagem recursiva. Root path: ${normalizedRootPath}`)
    const subpageResults: Array<{ id: string; path: string }> = []
    let orderIndex = 1
    const maxPages = 15 // Limite total de páginas (root + subpáginas)
    const maxDepth = 3 // Profundidade máxima de recursão (níveis)

    // Função recursiva para clonar subpáginas
    async function clonePageRecursive(
      pageUrl: string,
      pagePath: string,
      depth: number,
      parentPath: string
    ): Promise<void> {
      // Normalizar path antes de processar
      const normalizedPagePath = normalizePath(pagePath)
      
      // Verificar limites
      if (depth > maxDepth) {
        console.log(`[CLONE] Profundidade máxima atingida para ${normalizedPagePath} (depth: ${depth})`)
        return
      }

      if (clonedPaths.size >= maxPages) {
        console.log(`[CLONE] Limite de páginas atingido (${maxPages})`)
        return
      }

      // Verificar se já foi clonado (usando path normalizado)
      if (clonedPaths.has(normalizedPagePath)) {
        console.log(`[CLONE] Página ${normalizedPagePath} já foi clonada, pulando`)
        return
      }

      try {
        console.log(`[CLONE] Clonando página (depth ${depth}): ${normalizedPagePath} <- ${parentPath}`)
        console.log(`[CLONE] URL da página: ${pageUrl}`)
        console.log(`[CLONE] Path original: ${pagePath}, normalizado: ${normalizedPagePath}`)
        
        // Fetch e normalização da subpágina
        const subpageResult = await cloneSubpage(pageUrl)
        
        // Injetar base href
        const subpageRawHtmlWithBase = injectBaseHref(subpageResult.rawHtml, result.publicBasePath)
        const subpageEditableHtmlWithBase = injectBaseHref(subpageResult.editableHtml, result.publicBasePath)
        const subpageFinalHtmlWithBase = injectBaseHref(subpageResult.rawHtml, result.publicBasePath)
        
        const subpageHtmlToSave = subpageResult.isSpaFramework 
          ? subpageRawHtmlWithBase 
          : subpageFinalHtmlWithBase

        // Inserir subpágina no banco (usando path normalizado)
        const subpageInsertData: any = {
          user_id: user.id,
          original_url: pageUrl,
          html: subpageHtmlToSave,
          css: null,
          js: null,
          job_id: result.jobId, // Mesmo job_id (assets compartilhados)
          editable_html: subpageEditableHtmlWithBase,
          is_spa_framework: subpageResult.isSpaFramework,
          clone_group_id: cloneGroupId,
          path: normalizedPagePath, // Usar path normalizado
          is_root: false,
          order_index: orderIndex++,
        }

        const { data: subpage, error: subpageError } = await supabase
          .from('cloned_pages')
          .insert(subpageInsertData)
          .select('id')
          .single()

        if (subpageError || !subpage) {
          console.error(`[CLONE] Erro ao salvar subpágina ${normalizedPagePath}:`, subpageError)
          return
        }

        // Marcar como clonada (usando path normalizado)
        clonedPaths.add(normalizedPagePath)
        subpageResults.push({ id: subpage.id, path: normalizedPagePath })
        console.log(`[CLONE] Página ${normalizedPagePath} salva com sucesso (ID: ${subpage.id})`)

        // Descobrir links nesta subpágina e clonar recursivamente
        if (depth < maxDepth && clonedPaths.size < maxPages) {
          const discoveredLinks = discoverSubpageLinks(subpageResult.rawHtml, pageUrl, maxPages)
          
          console.log(`[CLONE] Página ${normalizedPagePath} (depth ${depth}) descobriu ${discoveredLinks.length} links:`)
          discoveredLinks.forEach(link => {
            const normalizedLinkPath = normalizePath(link.path)
            console.log(`  - ${link.path} -> normalizado: ${normalizedLinkPath} (URL: ${link.originalUrl})`)
          })
          console.log(`[CLONE] Paths já clonados:`, Array.from(clonedPaths))
          
          for (const link of discoveredLinks) {
            // Normalizar path do link antes de verificar
            const normalizedLinkPath = normalizePath(link.path)
            
            // Verificar se ainda não foi clonado e não excedeu limite
            if (clonedPaths.size >= maxPages) {
              console.log(`[CLONE] Limite de páginas atingido (${clonedPaths.size}/${maxPages}), parando descoberta em ${normalizedPagePath}`)
              break
            }
            if (clonedPaths.has(normalizedLinkPath)) {
              console.log(`[CLONE] Link ${normalizedLinkPath} já foi clonado, pulando`)
              continue
            }

            console.log(`[CLONE] Iniciando clonagem recursiva: ${normalizedLinkPath} (depth ${depth + 1}) <- ${normalizedPagePath}`)
            // Clonar recursivamente (passar path normalizado)
            await clonePageRecursive(link.originalUrl, normalizedLinkPath, depth + 1, normalizedPagePath)
          }
        }
      } catch (error) {
        console.error(`[CLONE] Erro ao clonar página ${pagePath}:`, error)
        // Continua sem quebrar o fluxo
      }
    }

    // 9. Descobrir links na página root e clonar recursivamente
    const rootLinks = discoverSubpageLinks(result.rawHtml, url, maxPages)
    console.log(`[CLONE] Root descobriu ${rootLinks.length} links:`)
    rootLinks.forEach(link => {
      const normalizedLinkPath = normalizePath(link.path)
      console.log(`  - ${link.path} -> normalizado: ${normalizedLinkPath} (URL: ${link.originalUrl})`)
    })
    
    for (const link of rootLinks) {
      if (clonedPaths.size >= maxPages) {
        console.log(`[CLONE] Limite de páginas atingido, parando clonagem`)
        break
      }
      const normalizedLinkPath = normalizePath(link.path)
      console.log(`[CLONE] Iniciando clonagem do root: ${normalizedLinkPath} (depth 1)`)
      await clonePageRecursive(link.originalUrl, normalizedLinkPath, 1, normalizedRootPath)
    }

    console.log(`[CLONE] Clone completo: root + ${subpageResults.length} subpáginas (profundidade máxima: ${maxDepth})`)

    return NextResponse.json({ 
      cloneId: rootPage.id,
      cloneGroupId: cloneGroupId,
      pagesCount: 1 + subpageResults.length,
    }, { status: 201 })
  } catch (error) {
    console.error('[CLONE] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

