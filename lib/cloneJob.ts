import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import archiver from 'archiver'
import { load, type CheerioAPI } from 'cheerio'
import axios from 'axios'
import mime from 'mime-types'

export type CloneJobResult = {
  jobId: string
  workDir: string
  finalHtml: string
  publicBasePath: string
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

function toLocalPathFromUrl(assetUrl: URL) {
  let localPath = assetUrl.pathname || '/'
  localPath = stripQueryAndHash(localPath)
  if (localPath.startsWith('/')) localPath = localPath.slice(1)
  if (localPath.endsWith('/')) localPath = localPath.slice(0, -1)
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
      'User-Agent': 'NoCryCloneBot/1.0',
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
    if (!sameOrigin(resolved)) return match
    const local = toLocalPathFromUrl(resolved)
    downloads.push({ src: resolved, localPath: local })
    return `url(${local})`
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
    headers: { 'User-Agent': 'NoCryCloneBot/1.0', Accept: 'text/html,*/*' },
    redirect: 'follow',
  })

  if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) {
    throw new Error(`Falha ao buscar URL (${response.status})`)
  }

  const html = await response.text()

  // Criar diretório de trabalho
  const jobId = `clone-${Date.now()}-${randomId()}`
  
  // Na Vercel, usar /tmp (único diretório writable)
  // Em desenvolvimento/local, usar public/clone-jobs
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV
  const baseDir = isVercel 
    ? path.join('/tmp', 'clone-jobs')
    : path.join(process.cwd(), 'public', 'clone-jobs')
  
  const workDir = path.join(baseDir, jobId)
  
  // Garantir que o diretório pai existe
  await fs.promises.mkdir(baseDir, { recursive: true })
  await fs.promises.mkdir(workDir, { recursive: true })

  // Parse HTML e coleta assets
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
      resolved = new URL(trimmed, base)
    } catch {
      return
    }
    if (!sameOrigin(resolved)) return
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
    const localPath = toLocalPathFromUrl(a.url)
    downloads.push({ src: a.url, localPath, kind: a.kind })
  }

  await withConcurrency(downloads, 10, async (item) => {
    const filePath = path.join(workDir, item.localPath)
    await ensureDirForFile(filePath)
    try {
      const data = await downloadBinary(item.src.toString())
      await fs.promises.writeFile(filePath, data)
    } catch {
      // Falha de um asset não deve abortar todo o job
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
      if (!sameOrigin(resolved)) return
      replaceAttr($, el, 'href', toLocalPathFromUrl(resolved))
    } catch {}
  })
  $('script[src]').each((_, el) => {
    const src = $(el).attr('src')
    if (!src) return
    try {
      const resolved = new URL(src, base)
      if (!sameOrigin(resolved)) return
      replaceAttr($, el, 'src', toLocalPathFromUrl(resolved))
    } catch {}
  })
  $('img[src]').each((_, el) => {
    const src = $(el).attr('src')
    if (!src) return
    try {
      const resolved = new URL(src, base)
      if (!sameOrigin(resolved)) return
      replaceAttr($, el, 'src', toLocalPathFromUrl(resolved))
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
          if (!sameOrigin(resolved)) return entry
          return `${toLocalPathFromUrl(resolved)}${d ? ' ' + d : ''}`
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
        if (!sameOrigin(resolved)) return
        replaceAttr($, el, 'src', toLocalPathFromUrl(resolved))
      } catch {}
    })
  })

  const finalHtml = $.html()
  await fs.promises.writeFile(path.join(workDir, 'index.html'), finalHtml, 'utf8')

  // Na Vercel, não podemos servir arquivos de /tmp via URL pública
  // Então não usamos base href (deixa URLs originais)
  // Em desenvolvimento, usamos publicBasePath normal
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV
  const publicBasePath = isVercel ? '' : `/clone-jobs/${jobId}/`

  return {
    jobId,
    workDir,
    finalHtml,
    publicBasePath,
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

