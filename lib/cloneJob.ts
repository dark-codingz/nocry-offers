import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import archiver from 'archiver'
import { load, type CheerioAPI } from 'cheerio'
import axios from 'axios'
import mime from 'mime-types'
import { detectSpaFramework } from './detectSpaFramework'
import { createEditableStaticHtmlFromSpa } from './sanitizeSpaHtml'

// Detecção centralizada de ambiente
export const IS_VERCEL =
  process.env.VERCEL === '1' ||
  process.env.VERCEL === 'true' ||
  !!process.env.VERCEL_ENV

export const CLONE_JOBS_ROOT = IS_VERCEL
  ? '/tmp/clone-jobs'
  : path.join(process.cwd(), 'public', 'clone-jobs')

export type CloneJobResult = {
  jobId: string
  workDir: string
  finalHtml: string
  publicBasePath: string
  isSpaFramework: boolean
  editableHtml: string
  rawHtml: string // HTML original antes de qualquer processamento
}

/**
 * Resolve todos os caminhos relacionados a um clone job
 * Centraliza a lógica de /tmp vs public/ baseado no ambiente
 */
export function resolveCloneJobPaths(jobId: string) {
  const jobDir = path.join(CLONE_JOBS_ROOT, jobId)
  const zipPath = path.join(CLONE_JOBS_ROOT, `${jobId}.zip`)

  // Caminho público só existe em dev/local (assets em public/)
  const publicBasePath = IS_VERCEL ? '' : `/clone-jobs/${jobId}/`
  const publicZipPath = IS_VERCEL ? '' : `/clone-jobs/${jobId}.zip`

  return {
    jobDir,
    zipPath,
    publicBasePath,
    publicZipPath,
  }
}

function randomId(len = 7) {
  return crypto.randomBytes(Math.ceil(len / 2)).toString('base64url').slice(0, len)
}

function stripQueryAndHash(p: string) {
  const idxQ = p.indexOf('?')
  const idxH = p.indexOf('#')
  let end = p.length
  if (idxQ !== -1) end = Math.min(end, idxQ)
  if (idxH !== -1) end = Math.min(end, idxH)
  return p.slice(0, end)
}

function toLocalPathFromUrl(assetUrl: URL, baseOrigin?: string) {
  let localPath = assetUrl.pathname || '/'
  localPath = stripQueryAndHash(localPath)
  
  if (localPath.startsWith('/')) localPath = localPath.slice(1)
  if (localPath.endsWith('/')) localPath = localPath.slice(0, -1)
  
  // Anti-colisão de hosts externos
  if (baseOrigin && assetUrl.origin !== baseOrigin) {
    localPath = assetUrl.hostname + '/' + (localPath || '')
  }

  if (!localPath) {
    const ext = mime.extension(assetUrl.searchParams.get('format') || '') || 'bin'
    localPath = `file.${ext}`
  }
  return localPath
}

function replaceAttr($: CheerioAPI, el: any, attr: string, newVal: string) {
  const node = $(el)
  if (node.attr(attr)) {
    node.attr(attr, newVal)
  }
}

async function ensureDirForFile(filePath: string) {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true })
}

async function downloadBinary(url: string, timeoutMs = 15000) {
  const res = await axios.get<ArrayBuffer>(url, {
    responseType: 'arraybuffer',
    timeout: timeoutMs,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: '*/*',
    },
    maxRedirects: 5,
    validateStatus: () => true,
  })
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`HTTP ${res.status} on ${url}`)
  }
  return Buffer.from(res.data as any)
}

async function withConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T, idx: number) => Promise<void>
) {
  const results: Promise<void>[] = []
  let i = 0
  async function next(): Promise<void> {
    if (i >= items.length) return
    const idx = i++
    const item = items[idx]
    if (item !== undefined) {
      await worker(item, idx)
    }
    await next()
  }
  for (let c = 0; c < Math.min(limit, items.length); c++) {
    results.push(next())
  }
  await Promise.all(results)
}

async function rewriteCssUrls(
  cssContent: string,
  cssUrl: URL,
  base: URL,
  workDir: string
) {
  const urlRegex = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g
  const downloads: Array<{ src: URL; localPath: string }> = []
  const sameOrigin = (u: URL) => u.origin === base.origin

  // Obter o caminho relativo do CSS dentro do workDir para calcular URLs relativas
  const cssLocalPath = toLocalPathFromUrl(cssUrl, base.origin)
  const cssDir = path.dirname(cssLocalPath)

  const replaced = cssContent.replace(urlRegex, (match, _q, p2) => {
    const raw = String(p2).trim()
    if (!raw || raw.startsWith('data:') || raw.startsWith('mailto:') || raw.startsWith('tel:')) {
      return match
    }
    let resolved: URL
    try {
      resolved = new URL(raw, cssUrl)
    } catch {
      return match
    }
    
    // Bypass de sameOrigin liberado para baixar fontes e imagens de dentro de CDN CSS.
    const local = toLocalPathFromUrl(resolved, base.origin)
    downloads.push({ src: resolved, localPath: local })
    
    // Calcular caminho relativo do CSS para o asset
    let relativePath = local
    if (cssDir && cssDir !== '.' && cssDir !== local) {
      // Se o CSS está em um subdiretório, calcular caminho relativo
      const cssDirParts = cssDir.split(path.sep).filter(Boolean)
      const assetDirParts = path.dirname(local).split(path.sep).filter(Boolean)
      
      // Encontrar o caminho comum
      let commonLength = 0
      while (
        commonLength < cssDirParts.length &&
        commonLength < assetDirParts.length &&
        cssDirParts[commonLength] === assetDirParts[commonLength]
      ) {
        commonLength++
      }
      
      // Construir caminho relativo
      const upLevels = cssDirParts.length - commonLength
      const downPath = assetDirParts.slice(commonLength).join(path.sep)
      const fileName = path.basename(local)
      
      if (upLevels > 0) {
        relativePath = '../'.repeat(upLevels) + (downPath ? downPath + path.sep : '') + fileName
      } else if (downPath) {
        relativePath = downPath + path.sep + fileName
      } else {
        relativePath = fileName
      }
    }
    
    return `url(${relativePath})`
  })

  await withConcurrency(downloads, 10, async (d) => {
    const filePath = path.join(workDir, d.localPath)
    await ensureDirForFile(filePath)
    try {
      const data = await downloadBinary(d.src.toString())
      await fs.promises.writeFile(filePath, data)
    } catch {
      // Ignora falhas individuais
    }
  })

  return replaced
}

export async function runCloneJob(url: string): Promise<CloneJobResult> {
  const base = new URL(url)
  const sameOrigin = (u: URL) => u.origin === base.origin

  // Buscar HTML
  const response = await fetch(url, {
    headers: { 
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8' 
    },
    redirect: 'follow',
  })

  if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) {
    throw new Error(`Falha ao buscar URL (${response.status})`)
  }

  const html = await response.text()

  // Detectar se é SPA/Next.js/React
  const isSpaFramework = detectSpaFramework(html)
  
  // Gerar versão editável (sem scripts do framework) se for SPA
  const editableHtml = isSpaFramework 
    ? createEditableStaticHtmlFromSpa(html)
    : html

  // Criar diretório de trabalho
  const jobId = `clone-${Date.now()}-${randomId()}`
  
  // Usar função centralizada para resolver paths
  const { jobDir: workDir, publicBasePath } = resolveCloneJobPaths(jobId)
  
  // Garantir que o diretório pai existe
  await fs.promises.mkdir(CLONE_JOBS_ROOT, { recursive: true })
  await fs.promises.mkdir(workDir, { recursive: true })

  // Parse HTML e coleta assets (usar editableHtml para SPA, html original para outros)
  const htmlToProcess = isSpaFramework ? editableHtml : html
  const $ = load(htmlToProcess)
  type AssetRef = {
    url: URL
    attrOwner?: { el: any; attr: string }
    kind: 'script' | 'style' | 'img' | 'media' | 'other'
  }
  const assets: AssetRef[] = []
  const visited = new Set<string>()

  function tryAdd(
    uStr: string | undefined | null,
    el?: any,
    attr?: string,
    kind: AssetRef['kind'] = 'other'
  ) {
    if (!uStr) return
    const trimmed = uStr.trim()
    if (
      !trimmed ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('mailto:') ||
      trimmed.startsWith('tel:')
    )
      return
    let resolved: URL
    try {
      resolved = new URL(trimmed, base)
    } catch {
      return
    }
    // Bypass: Extrai mesmo que origin seja deferente (CDNs externos).
    const key = resolved.toString()
    if (visited.has(key)) return
    visited.add(key)
    assets.push({ url: resolved, attrOwner: el && attr ? { el, attr } : undefined, kind })
  }

  $('link[rel="stylesheet"]').each((_, el) => tryAdd($(el).attr('href'), el, 'href', 'style'))
  $('script[src]').each((_, el) => tryAdd($(el).attr('src'), el, 'src', 'script'))
  $('img[src]').each((_, el) => tryAdd($(el).attr('src'), el, 'src', 'img'))
  $('img[srcset]').each((_, el) => {
    const srcset = ($(el).attr('srcset') || '')
      .split(',')
      .map((p) => p.trim().split(' ')[0])
      .filter(Boolean)
    srcset.forEach((u) => tryAdd(u, el, 'src', 'img'))
  })
  $('source[src]').each((_, el) => tryAdd($(el).attr('src'), el, 'src', 'media'))
  $('video[src]').each((_, el) => tryAdd($(el).attr('src'), el, 'src', 'media'))
  $('audio[src]').each((_, el) => tryAdd($(el).attr('src'), el, 'src', 'media'))
  $('meta[property="og:image"], meta[name="twitter:image"]').each((_, el) =>
    tryAdd($(el).attr('content') || '', undefined, undefined, 'img')
  )

  // Download com concorrência
  const downloads: { src: URL; localPath: string; kind: AssetRef['kind'] }[] = []

  for (const a of assets) {
    const localPath = toLocalPathFromUrl(a.url, base.origin)
    downloads.push({ src: a.url, localPath, kind: a.kind })
  }

  await withConcurrency(downloads, 10, async (item) => {
    const filePath = path.join(workDir, item.localPath)
    await ensureDirForFile(filePath)
    try {
      const data = await downloadBinary(item.src.toString())
      await fs.promises.writeFile(filePath, data)
    } catch (err: any) {
      console.error(`[CloneJob] Falha ao baixar asset base: ${item.src.toString()}`, err?.message)
    }
  })

  // Reescrita básica de CSS url() dentro dos CSS baixados
  const cssFiles = downloads.filter(
    (d) => d.kind === 'style' || d.localPath.toLowerCase().endsWith('.css')
  )
  for (const css of cssFiles) {
    const filePath = path.join(workDir, css.localPath)
    try {
      const content = await fs.promises.readFile(filePath, 'utf8')
      const rewritten = await rewriteCssUrls(content, new URL(css.src.toString()), base, workDir)
      await fs.promises.writeFile(filePath, rewritten, 'utf8')
    } catch {
      // Ignora erros de CSS
    }
  }

  // Reescrever referências no HTML para caminhos locais relativos
  $('link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr('href')
    if (!href) return
    try {
      const resolved = new URL(href, base)
      replaceAttr($, el, 'href', toLocalPathFromUrl(resolved, base.origin))
    } catch {}
  })
  $('script[src]').each((_, el) => {
    const src = $(el).attr('src')
    if (!src) return
    try {
      const resolved = new URL(src, base)
      replaceAttr($, el, 'src', toLocalPathFromUrl(resolved, base.origin))
    } catch {}
  })
  $('img[src]').each((_, el) => {
    const src = $(el).attr('src')
    if (!src) return
    try {
      const resolved = new URL(src, base)
      replaceAttr($, el, 'src', toLocalPathFromUrl(resolved, base.origin))
    } catch {}
  })
  $('img[srcset]').each((_, el) => {
    const srcset = $(el).attr('srcset')
    if (!srcset) return
    const parts = srcset
      .split(',')
      .map((p) => p.trim())
      .map((entry) => {
        const [u, d] = entry.split(' ')
        if (!u) return entry
        try {
          const resolved = new URL(u, base)
          return `${toLocalPathFromUrl(resolved, base.origin)}${d ? ' ' + d : ''}`
        } catch {
          return entry
        }
      })
    $(el).attr('srcset', parts.join(', '))
  })
  ;['video', 'audio', 'source'].forEach((tag) => {
    $(tag + '[src]').each((_, el) => {
      const src = $(el).attr('src')
      if (!src) return
      try {
        const resolved = new URL(src, base)
        replaceAttr($, el, 'src', toLocalPathFromUrl(resolved, base.origin))
      } catch {}
    })
  })

  const finalHtml = $.html()
  await fs.promises.writeFile(path.join(workDir, 'index.html'), finalHtml, 'utf8')

  return {
    jobId,
    workDir,
    finalHtml,
    publicBasePath,
    isSpaFramework,
    editableHtml: isSpaFramework ? editableHtml : finalHtml,
    rawHtml: html, // HTML original antes de qualquer processamento
  }
}

export async function createZipFromDir(inputDir: string, outPath: string) {
  await fs.promises.mkdir(path.dirname(outPath), { recursive: true })

  const output = fs.createWriteStream(outPath)
  const archive = archiver('zip', { zlib: { level: 9 } })

  const finalizePromise = new Promise<void>((resolve, reject) => {
    output.on('close', () => resolve())
    output.on('error', (err) => reject(err))
    archive.on('warning', (err) => {
      if ((err as any).code !== 'ENOENT') reject(err)
    })
    archive.on('error', (err) => reject(err))
  })

  archive.pipe(output)
  archive.directory(inputDir, false)
  await archive.finalize()

  await finalizePromise
}

export function injectBaseHref(html: string, baseHref: string): string {
  // Se baseHref estiver vazio (ex: na Vercel), não injeta base tag
  // Mantém URLs originais
  if (!baseHref || baseHref.trim() === '') {
    return html
  }
  
  const baseTag = `<base href="${baseHref}">`
  if (html.includes('<head')) {
    return html.replace('<head', `<head>${baseTag}`)
  }
  if (html.includes('<html')) {
    return html.replace('<html', `<html><head>${baseTag}</head>`)
  }
  return `${baseTag}${html}`
}

/**
 * Copia recursivamente um diretório
 */
export async function copyDirRecursive(src: string, dest: string): Promise<void> {
  await fs.promises.mkdir(dest, { recursive: true })

  const entries = await fs.promises.readdir(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      await copyDirRecursive(srcPath, destPath)
    } else {
      await fs.promises.copyFile(srcPath, destPath)
    }
  }
}

/**
 * Helper para obter paths de um job
 */
export function getJobPaths(jobId: string) {
  const baseFsDir = CLONE_JOBS_ROOT
  const jobDir = path.join(baseFsDir, jobId)
  return { baseFsDir, jobDir }
}

/**
 * Reconstrói uma URL absoluta a partir de um path potencialmente já processado com toLocalPathFromUrl.
 * Resolve colisão de pastas duplas (/PV01/PV01/) e reconhece CDNs externos ("cdn.utmify.com/...").
 */
function reconstructAbsoluteUrl(trimmed: string, base: URL): URL {
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('//')) {
    return new URL(trimmed, base)
  }
  
  // Caminhos com origin duplicado (ex: origin.com/styles.css)
  const firstSlash = trimmed.indexOf('/')
  const firstPart = firstSlash > -1 ? trimmed.slice(0, firstSlash) : trimmed
  
  // Se a primeira pasta possui ponto, não é css/js/png, presumimos que é um hostname de CDN externo
  if (firstPart.includes('.') && 
      firstPart.length > 4 && 
      !firstPart.endsWith('.css') && 
      !firstPart.endsWith('.js') && 
      !firstPart.endsWith('.html') &&
      !firstPart.endsWith('.png') &&
      !firstPart.endsWith('.jpg')) {
    return new URL(`https://${trimmed}`)
  }
  
  // Se for path interno que perdeu o slash inicial, restauramos para amarrar direto no origin
  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return new URL(normalizedPath, base.origin)
}

/**
 * Baixa todos os assets de uma landing page e reescreve o HTML para usar caminhos relativos
 * @param options - Opções de download
 * @returns HTML reescrito com caminhos relativos
 */
export async function downloadLandingToDir(options: {
  html: string
  baseUrl: string
  jobDir: string
  relativeAssetsPrefix: string // ex: 'assets'
}): Promise<{ html: string }> {
  const { html, baseUrl, jobDir, relativeAssetsPrefix } = options

  // 1. Criar jobDir se não existir
  await fs.promises.mkdir(jobDir, { recursive: true })

  // 2. Parsear HTML e encontrar assets
  const base = new URL(baseUrl)
  const sameOrigin = (u: URL) => u.origin === base.origin
  const $ = load(html)

  type AssetRef = {
    url: URL
    attrOwner?: { el: any; attr: string }
    kind: 'script' | 'style' | 'img' | 'media' | 'other'
  }
  const assets: AssetRef[] = []
  const visited = new Set<string>()

  function tryAdd(
    uStr: string | undefined | null,
    el?: any,
    attr?: string,
    kind: AssetRef['kind'] = 'other'
  ) {
    if (!uStr) return
    const trimmed = uStr.trim()
    if (
      !trimmed ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('mailto:') ||
      trimmed.startsWith('tel:')
    )
      return
    let resolved: URL
    try {
      resolved = reconstructAbsoluteUrl(trimmed, base)
    } catch {
      return
    }
    // Bypass liberado para download de CDNs em ZIPs
    const key = resolved.toString()
    if (visited.has(key)) return
    visited.add(key)
    assets.push({ url: resolved, attrOwner: el && attr ? { el, attr } : undefined, kind })
  }

  // Coletar todos os assets
  $('link[rel="stylesheet"]').each((_, el) => tryAdd($(el).attr('href'), el, 'href', 'style'))
  $('script[src]').each((_, el) => tryAdd($(el).attr('src'), el, 'src', 'script'))
  $('img[src]').each((_, el) => tryAdd($(el).attr('src'), el, 'src', 'img'))
  $('img[srcset]').each((_, el) => {
    const srcset = ($(el).attr('srcset') || '')
      .split(',')
      .map((p) => p.trim().split(' ')[0])
      .filter(Boolean)
    srcset.forEach((u) => tryAdd(u, el, 'src', 'img'))
  })
  $('source[src]').each((_, el) => tryAdd($(el).attr('src'), el, 'src', 'media'))
  $('video[src]').each((_, el) => tryAdd($(el).attr('src'), el, 'src', 'media'))
  $('audio[src]').each((_, el) => tryAdd($(el).attr('src'), el, 'src', 'media'))
  $('meta[property="og:image"], meta[name="twitter:image"]').each((_, el) =>
    tryAdd($(el).attr('content') || '', undefined, undefined, 'img')
  )

  // 3. Download com concorrência
  const downloads: { src: URL; localPath: string; kind: AssetRef['kind'] }[] = []

  for (const a of assets) {
    const localPath = toLocalPathFromUrl(a.url, base.origin)
    downloads.push({ src: a.url, localPath, kind: a.kind })
  }

  // Criar diretório de assets
  const assetsDir = path.join(jobDir, relativeAssetsPrefix)
  await fs.promises.mkdir(assetsDir, { recursive: true })

  await withConcurrency(downloads, 10, async (item) => {
    const filePath = path.join(assetsDir, item.localPath)
    await ensureDirForFile(filePath)
    try {
      const data = await downloadBinary(item.src.toString())
      await fs.promises.writeFile(filePath, data)
    } catch (err: any) {
      console.error(`[ZIP Engine] Falha ao baixar asset do ZIP: ${item.src.toString()}`, err?.message)
    }
  })

  // 4. Reescrita de CSS url() dentro dos CSS baixados
  const cssFiles = downloads.filter(
    (d) => d.kind === 'style' || d.localPath.toLowerCase().endsWith('.css')
  )
  for (const css of cssFiles) {
    const filePath = path.join(assetsDir, css.localPath)
    try {
      const content = await fs.promises.readFile(filePath, 'utf8')
      const rewritten = await rewriteCssUrls(
        content,
        new URL(css.src.toString()),
        base,
        assetsDir
      )
      await fs.promises.writeFile(filePath, rewritten, 'utf8')
    } catch {
      // Ignora erros de CSS
    }
  }

  // 5. Reescrever referências no HTML para usar caminhos relativos com prefixo
  $('link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr('href')
    if (!href) return
    try {
      const resolved = reconstructAbsoluteUrl(href, base)
      const localPath = toLocalPathFromUrl(resolved, base.origin)
      replaceAttr($, el, 'href', `${relativeAssetsPrefix}/${localPath}`)
    } catch {}
  })
  $('script[src]').each((_, el) => {
    const src = $(el).attr('src')
    if (!src) return
    try {
      const resolved = reconstructAbsoluteUrl(src, base)
      const localPath = toLocalPathFromUrl(resolved, base.origin)
      replaceAttr($, el, 'src', `${relativeAssetsPrefix}/${localPath}`)
    } catch {}
  })
  $('img[src]').each((_, el) => {
    const src = $(el).attr('src')
    if (!src) return
    
    // Ignorar imagens que já apontam para assets/ (imagens editadas já processadas)
    if (src.startsWith('assets/') || src.startsWith('./assets/') || src.includes('/assets/')) {
      return
    }
    
    try {
      const resolved = reconstructAbsoluteUrl(src, base)
      const localPath = toLocalPathFromUrl(resolved, base.origin)
      replaceAttr($, el, 'src', `${relativeAssetsPrefix}/${localPath}`)
    } catch {}
  })
  $('img[srcset]').each((_, el) => {
    const srcset = $(el).attr('srcset')
    if (!srcset) return
    const parts = srcset
      .split(',')
      .map((p) => p.trim())
      .map((entry) => {
        const [u, d] = entry.split(' ')
        if (!u) return entry
        try {
          const resolved = reconstructAbsoluteUrl(u, base)
          const localPath = toLocalPathFromUrl(resolved, base.origin)
          return `${relativeAssetsPrefix}/${localPath}${d ? ' ' + d : ''}`
        } catch {
          return entry
        }
      })
    $(el).attr('srcset', parts.join(', '))
  })
  ;['video', 'audio', 'source'].forEach((tag) => {
    $(tag + '[src]').each((_, el) => {
      const src = $(el).attr('src')
      if (!src) return
      try {
        const resolved = reconstructAbsoluteUrl(src, base)
        const localPath = toLocalPathFromUrl(resolved, base.origin)
        replaceAttr($, el, 'src', `${relativeAssetsPrefix}/${localPath}`)
      } catch {}
    })
  })

  // 6. Retornar HTML reescrito
  return { html: $.html() }
}

