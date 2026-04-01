import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase/server'
import * as fs from 'fs'
import * as path from 'path'
import archiver from 'archiver'
import { downloadLandingToDir, getJobPaths } from '@/lib/cloneJob'
import { cleanHtmlForExport, fixNextImageUrls } from '@/lib/editorHtml'
import { filenameForPath, rewriteInternalLinks, rewriteLegacyHtmlAssetLinks, rewriteFileProtocolLinks, type ExportPage } from '@/lib/exportHelpers'
import crypto from 'node:crypto'
import { load } from 'cheerio'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function randomId(len = 7) {
  return crypto.randomBytes(Math.ceil(len / 2)).toString('base64url').slice(0, len)
}

/**
 * Processa imagens editadas do Supabase no HTML
 * Detecta imagens do Supabase, baixa e inclui localmente no ZIP
 */
async function processEditedSupabaseImages(
  html: string,
  jobDir: string,
  originalOrigin: string
): Promise<{ html: string; downloadedImages: Map<string, string> }> {
  // Validação: Verificar se o HTML contém links do Supabase
  console.log('[ZIP] Verificando HTML de entrada para processamento de imagens editadas...')
  const hasSupabaseLinks = html.includes('supabase.co') || html.includes('supabase')
  if (hasSupabaseLinks) {
    console.log('✅ HTML contém links do Supabase. Prosseguindo com processamento.')
  } else {
    console.warn('⚠️ ALERTA: O HTML recebido NÃO tem links do Supabase. Pode estar processando versão desatualizada ou não há imagens editadas.')
  }
  
  const $ = load(html)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    console.warn('[ZIP] NEXT_PUBLIC_SUPABASE_URL não configurado, pulando processamento de imagens editadas')
    return { html, downloadedImages: new Map() }
  }

  const supabaseOrigin = new URL(supabaseUrl).origin
  const assetsDir = path.join(jobDir, 'assets')
  await fs.promises.mkdir(assetsDir, { recursive: true })

  const downloadedImages = new Map<string, string>() // URL original -> caminho local
  let imageCounter = 0

  // Função para baixar uma imagem
  async function downloadImage(imageUrl: string): Promise<string | null> {
    try {
      console.log('[ZIP] Baixando imagem editada:', imageUrl)
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NoCry-Editor/1.0)',
        },
      })

      if (!response.ok) {
        console.warn('[ZIP] Falha ao baixar imagem:', imageUrl, response.status)
        return null
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg'
      let extension = 'jpg'
      if (contentType.includes('png')) extension = 'png'
      else if (contentType.includes('gif')) extension = 'gif'
      else if (contentType.includes('webp')) extension = 'webp'
      else if (contentType.includes('svg')) extension = 'svg'

      // Gerar nome único para a imagem
      imageCounter++
      const filename = `edited-image-${imageCounter}.${extension}`
      const localPath = path.join(assetsDir, filename)
      const relativePath = `assets/${filename}`

      // Salvar imagem no disco
      const buffer = Buffer.from(await response.arrayBuffer())
      await fs.promises.writeFile(localPath, buffer)

      console.log('[ZIP] Imagem editada salva:', {
        localPath,
        relativePath,
        assetsDir,
        fileExists: await fs.promises.access(localPath).then(() => true).catch(() => false),
      })
      return relativePath
    } catch (error) {
      console.error('[ZIP] Erro ao baixar imagem:', imageUrl, error)
      return null
    }
  }

  // Processar todas as tags <img>
  const imagePromises: Promise<void>[] = []

  $('img').each((_, el) => {
    const $img = $(el)
    const src = $img.attr('src')
    if (!src) return

    // Ignorar data URIs e caminhos relativos que já foram processados
    // Verificar tanto com "./" quanto sem, e também caminhos absolutos que já apontam para assets
    if (
      src.startsWith('data:') || 
      src.startsWith('./assets/') || 
      src.startsWith('assets/') ||
      src.includes('/assets/') // Caminhos que já apontam para assets (ex: "assets/imagem.png")
    ) {
      console.debug('[ZIP] Ignorando imagem já processada:', src)
      return
    }

    // Verificar se é uma imagem do Supabase ou de outro domínio externo
    try {
      // Tentar resolver como URL absoluta
      let imageUrl: URL
      if (src.startsWith('http://') || src.startsWith('https://')) {
        imageUrl = new URL(src)
      } else {
        // Se for relativa, tentar resolver com base no Supabase (pode ser do storage)
        imageUrl = new URL(src, supabaseUrl)
      }

      const isSupabaseImage = imageUrl.origin === supabaseOrigin
      const isNotOriginalDomain = imageUrl.origin !== originalOrigin

      // Processar se:
      // 1. É uma imagem do Supabase (editada pelo usuário)
      // 2. É de um domínio externo diferente do original (também pode ser editada)
      if (isSupabaseImage || (isNotOriginalDomain && (src.startsWith('http://') || src.startsWith('https://')))) {
        const promise = downloadImage(imageUrl.toString()).then((localPath) => {
          if (localPath) {
            // Garantir que o caminho seja relativo e correto
            // localPath já vem como "assets/filename.ext"
            // Usar caminho relativo simples (sem ./ no início para ser consistente)
            const finalPath = localPath.startsWith('./') ? localPath.slice(2) : localPath
            
            // Reescrever src para caminho relativo
            $img.attr('src', finalPath)
            // Remover atributos conflitantes
            $img.removeAttr('srcset')
            $img.removeAttr('sizes')
            $img.removeAttr('loading')
            $img.removeAttr('data-nimg')
            downloadedImages.set(imageUrl.toString(), finalPath)
            console.log('[ZIP] Imagem editada processada:', {
              original: imageUrl.toString(),
              saved: localPath,
              htmlPath: finalPath,
            })
          }
        })
        imagePromises.push(promise)
      }
    } catch (error) {
      // Se não for uma URL válida, ignorar (pode ser caminho relativo que será processado depois)
      console.debug('[ZIP] URL de imagem inválida ou relativa (será processada depois):', src)
    }
  })

  // Aguardar todos os downloads
  await Promise.all(imagePromises)

  return {
    html: $.html(),
    downloadedImages,
  }
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

    // 1.1. Tentar obter HTML editado do body (se fornecido pelo frontend)
    let editedPagesFromRequest: Array<{ id: string; html: string }> | null = null
    try {
      const body = await request.json().catch(() => null)
      if (body && Array.isArray(body.editedPages)) {
        const pages = body.editedPages as Array<{ id: string; html: string }>
        editedPagesFromRequest = pages
        console.log('[ZIP] HTML editado recebido do frontend:', {
          pagesCount: pages.length,
          firstPageHasSupabase: pages[0]?.html?.includes('supabase.co') || false,
        })
      }
    } catch {
      // Se não conseguir parsear o body, continua com o fluxo normal
      console.log('[ZIP] Nenhum HTML editado fornecido, usando do banco de dados')
    }

    // 2. Verificar se o ID é um clone_group_id ou um id de página
    // Primeiro, tenta buscar como id de página
    const { data: pageById, error: pageByIdError } = await supabase
      .from('cloned_pages')
      .select('id, clone_group_id, original_url')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    let cloneGroupId: string | null = null
    let rootPage: any = null

    // Se encontrou uma página pelo ID, usa o clone_group_id dela
    if (pageById && !pageByIdError) {
      rootPage = pageById
      cloneGroupId = (pageById as any).clone_group_id || null
    } else {
      // Se não encontrou, tenta buscar como clone_group_id
      const { data: pagesByGroup, error: groupError } = await supabase
        .from('cloned_pages')
        .select('id, clone_group_id, original_url, is_root')
        .eq('clone_group_id', id)
        .eq('user_id', user.id)
        .order('order_index', { ascending: true })

      if (groupError || !pagesByGroup || pagesByGroup.length === 0) {
        return NextResponse.json({ error: 'Clone não encontrado' }, { status: 404 })
      }

      // Encontrou páginas pelo clone_group_id
      cloneGroupId = id
      rootPage = (pagesByGroup as any[]).find((p: any) => p.is_root) || pagesByGroup[0]
    }

    if (!rootPage || !rootPage.original_url) {
      return NextResponse.json(
        { error: 'Clone sem URL original' },
        { status: 400 }
      )
    }

    // 3. Buscar todas as páginas do mesmo grupo
    let query = supabase
      .from('cloned_pages')
      .select('id, original_url, path, html, editable_html, is_spa_framework')
      .eq('user_id', user.id)

    // Se clone_group_id existe, filtrar por ele
    if (cloneGroupId) {
      query = query.eq('clone_group_id', cloneGroupId)
    } else {
      // Fallback: se não tem clone_group_id, retorna só a página atual
      query = query.eq('id', rootPage.id)
    }

    const { data: allPages, error: pagesError } = await query.order('order_index', { ascending: true })

    if (pagesError || !allPages || allPages.length === 0) {
      return NextResponse.json({ error: 'Páginas não encontradas' }, { status: 404 })
    }

    // 4. Obter origin da URL original
    const origin = new URL(rootPage.original_url).origin

    // 5. Montar lista de ExportPage
    // Normalizar paths antes de gerar filenames
    const normalizePath = (path: string): string => {
      if (!path || path === '/') return '/'
      let normalized = path
      if (!normalized.startsWith('/')) normalized = '/' + normalized
      if (normalized !== '/' && normalized.endsWith('/')) {
        normalized = normalized.slice(0, -1)
      }
      return normalized
    }

    // Criar mapa de HTML editado por ID de página (se fornecido)
    const editedHtmlMap = new Map<string, string>()
    if (editedPagesFromRequest) {
      for (const editedPage of editedPagesFromRequest) {
        editedHtmlMap.set(editedPage.id, editedPage.html)
      }
    }

    const exportPages: ExportPage[] = allPages.map((p: any) => {
      // PRIORIDADE: Usar HTML editado do frontend se disponível, senão usar do banco
      let htmlBase: string
      if (editedHtmlMap.has(p.id)) {
        htmlBase = editedHtmlMap.get(p.id)!
        console.log(`[ZIP] Usando HTML editado do frontend para página ${p.id}`)
      } else {
        // Fallback: usar editable_html se existir, senão html (que é o raw_html)
        htmlBase = p.editable_html || p.html || ''
        console.log(`[ZIP] Usando HTML do banco para página ${p.id} (nenhum HTML editado fornecido)`)
      }
      
      const normalizedPath = normalizePath(p.path || '/')

      return {
        id: p.id,
        originalUrl: p.original_url,
        path: normalizedPath,
        filename: filenameForPath(normalizedPath),
        html: htmlBase,
      }
    })

    // Log para debug
    console.log('[ZIP] Páginas para exportar:', exportPages.map((p: ExportPage) => ({ path: p.path, filename: p.filename })))

    // 6. Criar diretório de trabalho
    const jobId = `edit-${rootPage.id}-${Date.now()}-${randomId()}`
    const { jobDir } = getJobPaths(jobId)

    // 7. Processar cada página: corrigir imagens Next.js, limpar HTML, reescrever links
    // E aplicar processamento de assets (CSS/JS/imagens) para TODAS as páginas
    const processedPages: Array<{ filename: string; html: string }> = []

    for (const exportPage of exportPages) {
      // 7.1. Corrigir URLs de imagens Next.js
      let htmlForExport = fixNextImageUrls(exportPage.html, exportPage.originalUrl)

      // 7.2. Limpar HTML (remover <base> e script do editor)
      htmlForExport = cleanHtmlForExport(htmlForExport)

      // 7.3. PROCESSAR IMAGENS EDITADAS DO SUPABASE (ANTES de processar assets originais)
      // Isso garante que imagens editadas sejam baixadas e incluídas localmente
      const { html: htmlWithEditedImages, downloadedImages } = await processEditedSupabaseImages(
        htmlForExport,
        jobDir,
        origin
      )
      htmlForExport = htmlWithEditedImages

      if (downloadedImages.size > 0) {
        console.log(`[ZIP] ${downloadedImages.size} imagem(ns) editada(s) processada(s) para ${exportPage.filename}`)
      }

      // 7.4. Reescrever links internos (ANTES de processar assets, para não interferir)
      htmlForExport = rewriteInternalLinks(htmlForExport, exportPages, origin)

      // 7.4.1. Reescrever links legados (product/.../index.htm → product.html)
      htmlForExport = rewriteLegacyHtmlAssetLinks(htmlForExport, exportPages)

      // 7.4.2. Remover links file:// e converter para caminhos relativos
      htmlForExport = rewriteFileProtocolLinks(htmlForExport, exportPages)

      // 7.5. Processar assets originais (CSS/JS/imagens) - mesma lógica que era aplicada só na root
      // Isso baixa os assets originais e reescreve as referências no HTML para caminhos locais
      // NOTA: Imagens editadas já foram processadas acima, então não serão sobrescritas
      // (downloadLandingToDir ignora caminhos que já apontam para assets/)
      
      // Log para debug: verificar caminhos de imagens antes de processar assets originais
      const $check = load(htmlForExport)
      const editedImagePaths: string[] = []
      $check('img[src]').each((_, el) => {
        const src = $check(el).attr('src')
        if (src && (src.startsWith('assets/') || src.includes('/assets/'))) {
          editedImagePaths.push(src)
        }
      })
      if (editedImagePaths.length > 0) {
        console.log(`[ZIP] Imagens editadas no HTML antes de processar assets originais:`, editedImagePaths)
      }
      
      const { html: htmlWithAssets } = await downloadLandingToDir({
        html: htmlForExport,
        baseUrl: exportPage.originalUrl,
        jobDir,
        relativeAssetsPrefix: 'assets',
      })
      
      // Log para debug: verificar caminhos de imagens depois de processar assets originais
      const $checkAfter = load(htmlWithAssets)
      const finalImagePaths: string[] = []
      $checkAfter('img[src]').each((_, el) => {
        const src = $checkAfter(el).attr('src')
        if (src) {
          finalImagePaths.push(src)
        }
      })
      console.log(`[ZIP] Caminhos finais de imagens no HTML:`, finalImagePaths)

      processedPages.push({
        filename: exportPage.filename,
        html: htmlWithAssets,
      })
    }

    // 8. Gerar ZIP em memória
    const chunks: Buffer[] = []
    const archive = archiver('zip', { zlib: { level: 9 } })

    const zipPromise = new Promise<void>((resolve, reject) => {
      archive.on('data', (chunk: Buffer) => chunks.push(chunk))
      archive.on('end', () => resolve())
      archive.on('error', (err: Error) => reject(err))
    })

    // Adicionar APENAS os arquivos HTML que criamos explicitamente (usando filenameForPath)
    // Usar o conteúdo em memória diretamente, sem salvar em disco primeiro
    for (const processedPage of processedPages) {
      archive.append(Buffer.from(processedPage.html, 'utf8'), { name: processedPage.filename })
    }

    // Adicionar a pasta assets/ recursivamente (se existir)
    // downloadLandingToDir já criou os assets em jobDir/assets/
    const assetsDir = path.join(jobDir, 'assets')
    try {
      const assetsExists = await fs.promises.access(assetsDir).then(() => true).catch(() => false)
      if (assetsExists) {
        archive.directory(assetsDir, 'assets')
      }
    } catch {
      // Se não existir assets, continua sem ela
    }

    await archive.finalize()
    await zipPromise

    const zipBuffer = Buffer.concat(chunks)

    // 9. Limpar pasta temporária
    try {
      await fs.promises.rm(jobDir, { recursive: true, force: true })
    } catch (cleanError) {
      console.warn('[CLONE] Cleanup warning:', cleanError)
    }

    // 10. Retornar ZIP
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

