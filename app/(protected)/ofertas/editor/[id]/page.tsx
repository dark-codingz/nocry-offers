'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useRef, useMemo } from 'react'
import { ArrowLeft, Save, Download, RotateCcw, Hand, MousePointerClick, Upload, Link as LinkIcon, Image as ImageIcon } from 'lucide-react'
import { detectTrackingScripts } from '@/lib/tracking/pixels'
import { createClient } from '@/lib/supabase/client'
import { uploadToOffersFiles } from '@/lib/supabase-storage'
import { MediaLibraryModal } from '@/components/ui/media-library-modal'

// Helper para classes condicionais
function clsx(...args: (string | boolean | undefined | null)[]): string {
  return args.filter(Boolean).join(' ')
}

interface Clone {
  html: string
  original_url: string
  isSpaFramework?: boolean
}

interface EditorPage {
  id: string
  originalUrl: string
  path: string
  isRoot: boolean
  orderIndex: number
  isSpaFramework: boolean
  editableHtml: string
  html: string
  currentHtml?: string // HTML atual editado em memória
}

interface SelectedElement {
  elementId: string
  tagName: string
  innerText: string
  role?: string | null
  classList?: string[]
  styles: {
    color?: string
    backgroundColor?: string
    borderColor?: string
    borderRadius?: string
    boxShadow?: string
    fontSize?: string
    fontWeight?: string
    width?: string
    textAlign?: string
    marginTop?: string
    marginBottom?: string
  }
  // Propriedades de link
  linkElementId?: string | null // ID do elemento <a> (pode ser o próprio elemento ou um pai)
  href?: string | null
  target?: string | null
}

type ElementKind = 'button' | 'badge' | 'link' | 'heading' | 'image' | 'text' | 'other'

type TrackingInfo = {
  utmifyPixel?: {
    found: boolean
    pixelId: string | null
    script: string | null // Script completo <script>...</script>
  }
  utmifyUtms?: {
    found: boolean
    enabled: boolean
  }
  metaPixel?: {
    found: boolean
    pixelId: string | null
  }
}

type OutlineItem = {
  elementId: string
  tagName: string
  textPreview: string
}

type QuickBlockKind = 'h1' | 'p' | 'button' | 'img'

type TextAlign = 'left' | 'center' | 'right'
type ViewportMode = 'desktop' | 'mobile'

export default function EditorPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [clone, setClone] = useState<Clone | null>(null)
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [tracking, setTracking] = useState<TrackingInfo | null>(null)
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false)
  const [pageBgColor, setPageBgColor] = useState('#ffffff')
  const [outline, setOutline] = useState<OutlineItem[]>([])
  const [isDraggingId, setIsDraggingId] = useState<string | null>(null)
  const [fontSize, setFontSize] = useState<number | null>(null)
  const [imageWidthPercent, setImageWidthPercent] = useState<number | null>(null)
  const [dragBlockKind, setDragBlockKind] = useState<QuickBlockKind | null>(null)
  const [dragGhostPos, setDragGhostPos] = useState<{ x: number; y: number } | null>(null)
  const [textAlign, setTextAlign] = useState<TextAlign>('left')
  const [marginTopPx, setMarginTopPx] = useState<number>(0)
  const [marginBottomPx, setMarginBottomPx] = useState<number>(0)
  type EditorTab = 'geral' | 'layout'
  const [activeTab, setActiveTab] = useState<EditorTab>('geral')
  const [viewportMode, setViewportMode] = useState<ViewportMode>('mobile')
  const historyRef = useRef<string[]>([])
  const [canUndo, setCanUndo] = useState(false)
  const undoTimerRef = useRef<number | null>(null)
  const [isTextColorMenuOpen, setIsTextColorMenuOpen] = useState(false)
  const [isBgColorMenuOpen, setIsBgColorMenuOpen] = useState(false)
  const textColorInputRef = useRef<HTMLInputElement | null>(null)
  const bgColorInputRef = useRef<HTMLInputElement | null>(null)
  const textColorMenuRef = useRef<HTMLDivElement | null>(null)
  const bgColorMenuRef = useRef<HTMLDivElement | null>(null)
  const [isInteractivePreview, setIsInteractivePreview] = useState(false)
  const [showSpaNotice, setShowSpaNotice] = useState(false)
  const [showSpaExportNotice, setShowSpaExportNotice] = useState(false)
  
  // Estados para multi-página
  const [cloneGroupId, setCloneGroupId] = useState<string | null>(null)
  const [origin, setOrigin] = useState<string | null>(null)
  const [pages, setPages] = useState<EditorPage[]>([])
  const [currentPageId, setCurrentPageId] = useState<string | null>(null)
  
  // Refs para acessar estado atualizado no handler de mensagens (evita closure stale)
  const isInteractivePreviewRef = useRef(false)
  const pagesRef = useRef<EditorPage[]>([])
  const originRef = useRef<string>('')
  
  // Sincronizar refs com estado
  useEffect(() => {
    isInteractivePreviewRef.current = isInteractivePreview
  }, [isInteractivePreview])
  
  useEffect(() => {
    pagesRef.current = pages
  }, [pages])
  
  useEffect(() => {
    originRef.current = origin || ''
  }, [origin])

  // srcDoc memoizado - muda quando currentPageId muda
  const srcDoc = useMemo(() => {
    if (!clone) return ''
    // Se temos páginas e currentPageId, usar o HTML da página atual
    if (currentPageId && pages.length > 0) {
      const currentPage = pages.find((p) => p.id === currentPageId)
      if (currentPage) {
        const htmlToUse = currentPage.isSpaFramework && currentPage.editableHtml
          ? currentPage.editableHtml
          : currentPage.html
        return buildSrcDoc(htmlToUse, currentPage.originalUrl)
      }
    }
    // Fallback: usar clone.html (comportamento antigo)
    return buildSrcDoc(clone.html, clone.original_url)
  }, [clone?.html, clone?.original_url, currentPageId, pages])

  // Buscar clone
  useEffect(() => {
    if (!id) return

    ;(async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch(`/api/clones/${id}`)
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Falha ao carregar clone')
        }

        const data = await res.json()
        
        // Salvar cloneGroupId, origin e pages
        const groupId = data.cloneGroupId || id
        const editorOrigin = data.origin || new URL(data.original_url).origin
        const editorPages: EditorPage[] = (data.pages || []).map((p: any) => ({
          id: p.id,
          originalUrl: p.originalUrl,
          path: p.path || '/',
          isRoot: p.isRoot || false,
          orderIndex: p.orderIndex || 0,
          isSpaFramework: p.isSpaFramework || false,
          editableHtml: p.editableHtml || '',
          html: p.html || '',
          currentHtml: p.editableHtml || p.html || '', // Inicializar com HTML original
        }))
        
        setCloneGroupId(groupId)
        setOrigin(editorOrigin)
        setPages(editorPages)
        
        // Determinar página inicial (root ou primeira)
        const rootPage = editorPages.find((p) => p.isRoot) || editorPages[0]
        const initialPageId = rootPage?.id || id
        setCurrentPageId(initialPageId)
        
        // Usar loadPageHtml para inicializar (reutiliza a mesma lógica)
        if (rootPage) {
          const htmlToUse = rootPage.isSpaFramework && rootPage.editableHtml
            ? rootPage.editableHtml
            : rootPage.html
          loadPageHtml(htmlToUse, rootPage.originalUrl, rootPage.isSpaFramework)
        } else {
          // Fallback: usar dados da API antiga
          setClone({ 
            html: data.html, 
            original_url: data.original_url,
            isSpaFramework: data.isSpaFramework || false
          })
        }
        
        // Verificar se deve mostrar aviso de SPA
        if (data.isSpaFramework) {
          const storageKey = `nocry_spa_notice_dismissed_${id}`
          const alreadyDismissed =
            typeof window !== 'undefined' &&
            window.localStorage?.getItem(storageKey) === '1'
          
          if (!alreadyDismissed) {
            setShowSpaNotice(true)
          }
        }
      } catch (err) {
        console.error('[EDITOR] Load error:', err)
        setError(err instanceof Error ? err.message : 'Erro ao carregar clone')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  // Função para pegar o HTML atual do editor (do iframe)
  function getCurrentEditorHtmlSafe(): string {
    if (!iframeRef.current) {
      console.warn('[EDITOR] getCurrentEditorHtmlSafe: iframe não disponível')
      return ''
    }

    const doc = iframeRef.current.contentDocument
    if (!doc) {
      console.warn('[EDITOR] getCurrentEditorHtmlSafe: documento não disponível')
      return ''
    }

    try {
      let newHtml = doc.documentElement.outerHTML

      // Remover o <base id="nocry-editor-base" ...> que injetamos só pro editor
      newHtml = newHtml.replace(
        /<base[^>]*id=["']nocry-editor-base["'][^>]*>\s*/i,
        ''
      )

      // Remover o <script id="nocry-editor-script">...</script> que é só do editor
      newHtml = newHtml.replace(
        /<script[^>]*id=["']nocry-editor-script["'][^>]*>[\s\S]*?<\/script>\s*/i,
        ''
      )

      return newHtml
    } catch (err) {
      console.error('[EDITOR] getCurrentEditorHtmlSafe: erro ao serializar', err)
      return ''
    }
  }

  // Função para salvar o HTML atual da página antes de trocar
  function saveCurrentPageHtml() {
    if (!currentPageId) return

    const html = getCurrentEditorHtmlSafe()
    if (!html) {
      console.warn('[EDITOR] saveCurrentPageHtml: HTML vazio, pulando salvamento')
      return
    }

    setPages((prevPages) =>
      prevPages.map((p) =>
        p.id === currentPageId ? { ...p, currentHtml: html } : p
      )
    )

    console.debug('[EDITOR] saveCurrentPageHtml', {
      pageId: currentPageId,
      length: html.length,
    })
  }

  // Função para carregar HTML de uma página (reutiliza lógica de inicialização)
  function loadPageHtml(html: string, originalUrl: string, isSpaFramework: boolean = false) {
    // Atualizar estado do clone (isso vai atualizar o srcDoc via useMemo)
    setClone({
      html: html,
      original_url: originalUrl,
      isSpaFramework: isSpaFramework,
    })
    
    // Resetar seleção
    setSelectedElement(null)
    
    // Atualizar outline quando o iframe carregar
    setTimeout(() => {
      if (iframeRef.current) {
        const doc = iframeRef.current.contentDocument
        if (doc) {
          const nodes = Array.from(doc.body.children) as HTMLElement[]
          const items: OutlineItem[] = nodes
            .filter((el) => el.dataset?.nocryId)
            .map((el) => {
              const text = (el.innerText || '').replace(/\s+/g, ' ').trim()
              const preview = text.slice(0, 60) + (text.length > 60 ? '…' : '')
              return {
                elementId: el.dataset.nocryId!,
                tagName: el.tagName.toLowerCase(),
                textPreview: preview || `[${el.tagName.toLowerCase()} vazio]`,
              }
            })
          setOutline(items)
        }
      }
    }, 100)
    
    console.debug('[EDITOR] loadPageHtml', { length: html.length, originalUrl })
  }

  // Função para carregar página por ID
  function loadPageById(pageId: string) {
    // 1) Salvar a página atual antes de trocar
    saveCurrentPageHtml()

    // 2) Achar a página alvo
    const page = pages.find((p) => p.id === pageId)
    if (!page) {
      console.warn('[EDITOR] loadPageById: page not found', pageId)
      return
    }

    // 3) Atualizar currentPageId
    setCurrentPageId(page.id)

    // 4) Carregar HTML atual (ou original se nunca foi mexido)
    const htmlToLoad = page.currentHtml || page.editableHtml || page.html || ''

    loadPageHtml(htmlToLoad, page.originalUrl, page.isSpaFramework)
    console.debug('[EDITOR] loadPageById', {
      pageId: page.id,
      path: page.path,
      length: htmlToLoad.length,
      usingCurrentHtml: !!page.currentHtml,
    })
  }

  // Função para carregar página por path
  function loadPageByPath(path: string) {
    // Normalizar path: "/", "/product", "/product/"
    let normalized = path || '/'
    if (!normalized.startsWith('/')) normalized = '/' + normalized
    if (normalized !== '/' && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1)
    }

    const page = pages.find((p) => {
      const pPath = p.path === '/' ? '/' : (p.path || '').replace(/\/$/, '')
      const nPath = normalized === '/' ? '/' : normalized.replace(/\/$/, '')
      return pPath === nPath
    })

    console.debug('[EDITOR] loadPageByPath', {
      inputPath: path,
      normalized,
      found: !!page,
      foundPath: page?.path,
    })

    if (!page) {
      console.warn('[EDITOR] loadPageByPath: page not found', path)
      return
    }
    
    loadPageById(page.id)
  }

  // Receber mensagens do iframe
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // Log todas as mensagens recebidas para debug
      if (event.data?.type?.startsWith('NCRY_')) {
        console.log('[EDITOR] Mensagem recebida no handleMessage', { 
          type: event.data.type, 
          payload: event.data.payload,
          origin: event.origin,
          expectedOrigin: window.location.origin,
          timestamp: Date.now()
        })
      }
      
      if (!event.data || typeof event.data !== 'object') {
        console.debug('[EDITOR] Mensagem ignorada (não é objeto)', event.data)
        return
      }
      
      // Handler para cliques em links (modo preview)
      if (event.data.type === 'NCRY_LINK_CLICKED') {
        const { href } = event.data.payload || {}
        if (!href) {
          console.warn('[EDITOR] NCRY_LINK_CLICKED ignorado: href vazio')
          return
        }
        
        // IMPORTANTE: Usar função que acessa o estado atual via closure
        // Não podemos confiar no closure do useEffect, então vamos usar uma abordagem diferente
        console.log('[EDITOR] NCRY_LINK_CLICKED recebido - processando SEMPRE (verificação será feita dentro)', { 
          href,
          timestamp: Date.now()
        })
        
        // Normalizar href → path
        let path = href
        let isExternal = false
        
        try {
          if (href.startsWith('http://') || href.startsWith('https://')) {
            const url = new URL(href)
            const currentOrigin = origin || ''
            console.log('[EDITOR] Link absoluto detectado', { urlOrigin: url.origin, currentOrigin })
            // Verificar se é mesmo domínio
            if (url.origin !== currentOrigin) {
              // Link externo: abrir em nova aba
              console.log('[EDITOR] Link externo detectado, abrindo em nova aba', { urlOrigin: url.origin, currentOrigin })
              window.open(href, '_blank')
              return
            }
            path = url.pathname
          } else {
            // relativo: tirar query/hash
            const qIndex = href.indexOf('?')
            const hashIndex = href.indexOf('#')
            const cutIndex = [qIndex, hashIndex].filter((i) => i > -1).sort((a, b) => a - b)[0]
            if (cutIndex > -1) {
              path = href.slice(0, cutIndex)
            } else {
              path = href
            }
          }
        } catch (err) {
          console.warn('[EDITOR] Erro ao normalizar href', err)
          path = href
        }
        
        // Normalizar path usando a mesma lógica de normalizePathStructure
        // Remover extensões e IDs
        path = path.replace(/\.(html|htm|php|aspx|jsp)$/i, '')
        if (path.endsWith('/index')) {
          path = path.slice(0, -6)
        }
        const segments = path.split('/').filter(Boolean)
        const isLikelyId = (seg: string): boolean => {
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)) return true
          if (/^[0-9a-f]{24,}$/i.test(seg)) return true
          if (/^[0-9a-zA-Z]{20,}$/.test(seg)) return true
          return false
        }
        const filteredSegments = segments.filter((seg: string) => !isLikelyId(seg))
        if (filteredSegments.length === 1) {
          path = `/${filteredSegments[0]}`
        } else if (filteredSegments.length >= 2) {
          path = `/${filteredSegments[0]}/${filteredSegments[filteredSegments.length - 1]}`
        } else {
          path = '/'
        }
        
        // Garantir formato correto
        if (!path.startsWith('/')) path = '/' + path
        if (path !== '/' && path.endsWith('/')) path = path.slice(0, -1)
        
        console.log('[EDITOR] Path normalizado', { originalHref: href, normalizedPath: path })
        
        // Usar refs para acessar estado atualizado (não depende de closure)
        const currentPreview = isInteractivePreviewRef.current
        const currentPages = pagesRef.current
        const currentOrigin = originRef.current
        
        console.log('[EDITOR] Verificando estado atual (via refs)', {
          isInteractivePreview: currentPreview,
          pagesCount: currentPages.length,
          pages: currentPages.map(p => ({ id: p.id, path: p.path })),
          origin: currentOrigin
        })
        
        if (!currentPreview) {
          console.warn('[EDITOR] Modo preview desativado, ignorando')
          return
        }
        
        // Tentar achar uma página do clone com esse path
        const targetPage = currentPages.find((p) => {
          const pPath = p.path === '/' ? '/' : (p.path || '').replace(/\/$/, '')
          const nPath = path === '/' ? '/' : path.replace(/\/$/, '')
          const match = pPath === nPath
          console.log('[EDITOR] Comparando paths', { pPath, nPath, match })
          return match
        })
        
        if (targetPage) {
          // É uma SUBPÁGINA DO PRÓPRIO CLONE → navegação interna do editor
          console.log('[EDITOR] ✅ Página clonada encontrada, navegando', { 
            path, 
            pageId: targetPage.id,
            pagePath: targetPage.path 
          })
          loadPageByPath(path)
          return
        }
        
        // Não é uma página do clone:
        console.log('[EDITOR] Página não encontrada no clone', { 
          path,
          availablePages: currentPages.map(p => p.path)
        })
        
        // - abrir em nova aba se for http(s)
        if (href.startsWith('http://') || href.startsWith('https://')) {
          console.log('[EDITOR] Abrindo link externo em nova aba', { href })
          window.open(href, '_blank')
          return
        }
        
        // Se for algum outro tipo de link estranho, simplesmente bloqueia (já foi bloqueado no iframe)
        console.log('[EDITOR] Link bloqueado (não é página clonada nem externo)', { href })
      }
      
      // Handler para navegação interna (modo clique)
      if (event.data.type === 'NCRY_NAVIGATE_TO_PAGE') {
        const { pageId } = event.data.payload || {}
        if (pageId) {
          loadPageById(pageId)
        }
        return
      }
      
      if (event.data.type === 'NCRY_SELECT_ELEMENT') {
        const { elementId, tagName, innerText, role, classList, styles, attributes, linkInfo } =
          event.data.payload || {}
        if (!elementId) return

        setSelectedElement({
          elementId,
          tagName,
          innerText: innerText || '',
          role: role || null,
          classList: classList || [],
          styles: styles || {},
          // Informações de link (se o elemento for ou estiver dentro de um link)
          linkElementId: linkInfo?.linkElementId || null,
          href: linkInfo?.href || null,
          target: linkInfo?.target || null,
        })

        // Se for imagem ou placeholder, captura src
        if ((tagName.toLowerCase() === 'img' || 
             (tagName.toLowerCase() === 'div' && classList?.some((c: string) => c.includes('nocry-image-placeholder')))) && 
            attributes?.src !== undefined) {
          setImageUrl(attributes.src || '')
        }
      }
      
      if (event.data.type === 'NCRY_ELEMENT_DUPLICATED') {
        // Força atualização do outline
        if (iframeRef.current) {
          const doc = iframeRef.current.contentDocument
          if (doc) {
            const nodes = Array.from(doc.body.children) as HTMLElement[]
            const items: OutlineItem[] = nodes
              .filter((el) => el.dataset?.nocryId)
              .map((el) => {
                const text = (el.innerText || '').replace(/\s+/g, ' ').trim()
                const preview = text.slice(0, 60) + (text.length > 60 ? '…' : '')
                return {
                  elementId: el.dataset.nocryId!,
                  tagName: el.tagName.toLowerCase(),
                  textPreview: preview || `[${el.tagName.toLowerCase()} vazio]`,
                }
              })
            setOutline(items)
          }
        }
      }
      
      if (event.data.type === 'NCRY_ELEMENT_REORDERED') {
        // Força atualização do outline após reordenação
        if (iframeRef.current) {
          const doc = iframeRef.current.contentDocument
          if (doc) {
            const nodes = Array.from(doc.body.children) as HTMLElement[]
            const items: OutlineItem[] = nodes
              .filter((el) => el.dataset?.nocryId)
              .map((el) => {
                const text = (el.innerText || '').replace(/\s+/g, ' ').trim()
                const preview = text.slice(0, 60) + (text.length > 60 ? '…' : '')
                return {
                  elementId: el.dataset.nocryId!,
                  tagName: el.tagName.toLowerCase(),
                  textPreview: preview || `[${el.tagName.toLowerCase()} vazio]`,
                }
              })
            setOutline(items)
          }
        }
      }
      
      if (event.data.type === 'NCRY_REMOVE_ELEMENT') {
        // Handler para quando o botão de excluir é clicado no iframe
        const { elementId } = event.data.payload || {}
        if (!elementId) return
        
        // Agenda snapshot para salvar
        scheduleSnapshot()
        
        // Limpa seleção se for o elemento removido
        if (selectedElement?.elementId === elementId) {
          setSelectedElement(null)
        }
        
        // Atualiza outline removendo o elemento
        setOutline((prev) => prev.filter((item) => item.elementId !== elementId))
        
        // Envia mensagem para o iframe confirmar a remoção (já foi removido, mas garante sincronização)
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            {
              type: 'NCRY_REMOVE_ELEMENT',
              payload: { elementId },
            },
            '*'
          )
        }
      }
      
      if (event.data.type === 'NCRY_IFRAME_READY') {
        // Quando iframe está pronto, garantir que o estado inicial é enviado
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            {
              type: 'NCRY_SET_INTERACTIVE_PREVIEW',
              payload: { enabled: false }, // Sempre começar como false
            },
            '*'
          )
        }
      }
    }

    console.log('[EDITOR] Adicionando listener de mensagens window.addEventListener')
    window.addEventListener('message', handleMessage)
    return () => {
      console.log('[EDITOR] Removendo listener de mensagens')
      window.removeEventListener('message', handleMessage)
    }
  }, [])

  // Classificar tipo de elemento
  function classifyElement(sel: SelectedElement | null): ElementKind {
    if (!sel) return 'other'
    const tag = sel.tagName.toLowerCase()
    const role = (sel.role || '').toLowerCase()
    const classes = (sel.classList || []).map((c: string) => c.toLowerCase())

    if (tag === 'img') return 'image'
    // Placeholder de imagem também é tratado como image
    if (tag === 'div' && classes.some((c: string) => c.includes('nocry-image-placeholder'))) return 'image'
    if (/^h[1-6]$/.test(tag)) return 'heading'

    // Detectar badges primeiro (antes de botões)
    if (
      classes.some((c: string) => c.includes('badge') || c.includes('pill') || c.includes('tag'))
    ) {
      return 'badge'
    }

    if (tag === 'button' || role === 'button') return 'button'

    if (
      tag === 'a' &&
      (role === 'button' ||
        classes.some((c) => c.includes('btn') || c.includes('button') || c.includes('cta')))
    ) {
      return 'button'
    }

    if (tag === 'a') return 'link'

    return 'text'
  }

  // Verificar se elemento tem fundo sólido
  function hasSolidBackground(styles: SelectedElement['styles']): boolean {
    const bg = (styles.backgroundColor || '').trim().toLowerCase()
    if (!bg) return false
    if (bg === 'transparent') return false
    if (bg.startsWith('rgba')) {
      const parts = bg
        .replace(/^rgba\(/, '')
        .replace(/\)$/, '')
        .split(',')
        .map((p) => p.trim())
      const alpha = parts[3] ? parseFloat(parts[3]) : 1
      if (alpha === 0) return false
    }
    return true
  }

  // Detectar scripts de tracking no iframe
  useEffect(() => {
    if (!iframeLoaded || !iframeRef.current) return

    const doc = iframeRef.current.contentDocument
    if (!doc) return

    // Obter HTML completo do documento como string
    const htmlContent = doc.documentElement.outerHTML

    // Usar a função utilitária para detectar pixels
    const detected = detectTrackingScripts(htmlContent)

    // Extrair pixelId do script UTMify se encontrado
    let utmifyPixelId: string | null = null
    let hasUtmifyPixel = false
    
    if (detected.utmifyScript) {
      hasUtmifyPixel = true
      // Extrair o ID do script completo
      const pixelIdMatch = detected.utmifyScript.match(/window\.pixelId\s*=\s*["']([^"']+)["']/i)
      if (pixelIdMatch && pixelIdMatch[1]) {
        utmifyPixelId = pixelIdMatch[1]
      }
    }

    // Detecta script de UTMs UTMify (src) - mantém detecção via DOM
    let hasUtmifyUtms = false
    const scripts = Array.from(doc.querySelectorAll('script'))
    for (const s of scripts) {
      const src = s.getAttribute('src') || ''
      if (src.includes('utmify.com.br/scripts/utms')) {
        hasUtmifyUtms = true
        break
      }
    }

    setTracking({
      utmifyPixel: {
        found: hasUtmifyPixel,
        pixelId: utmifyPixelId,
        script: detected.utmifyScript, // Script completo
      },
      utmifyUtms: {
        found: hasUtmifyUtms,
        enabled: hasUtmifyUtms,
      },
      metaPixel: {
        found: !!detected.metaPixelId,
        pixelId: detected.metaPixelId,
      },
    })

    // Detectar cor de fundo da página
    const bodyBg = window.getComputedStyle(doc.body).backgroundColor
    setPageBgColor(normalizeColorToHex(bodyBg))
  }, [iframeLoaded])

  // Construir outline da estrutura da página
  useEffect(() => {
    if (!iframeLoaded || !iframeRef.current) return
    const doc = iframeRef.current.contentDocument
    if (!doc) return

    // Lista os filhos diretos do body
    const nodes = Array.from(doc.body.children) as HTMLElement[]

    const items: OutlineItem[] = nodes
      .filter((el) => el.dataset?.nocryId)
      .map((el) => {
        const text = (el.innerText || '').replace(/\s+/g, ' ').trim()
        const preview = text.slice(0, 60) + (text.length > 60 ? '…' : '')
        return {
          elementId: el.dataset.nocryId!,
          tagName: el.tagName.toLowerCase(),
          textPreview: preview || `[${el.tagName.toLowerCase()} vazio]`,
        }
      })

    setOutline(items)
  }, [iframeLoaded, selectedElement])

  // Esconder toolbar quando não há elemento selecionado
  useEffect(() => {
    if (!selectedElement && iframeRef.current?.contentDocument) {
      const toolbar = iframeRef.current.contentDocument.getElementById('nocry-element-toolbar')
      if (toolbar) {
        toolbar.style.opacity = '0'
        setTimeout(() => {
          if (toolbar) {
            toolbar.style.display = 'none'
          }
        }, 150)
      }
    }
  }, [selectedElement])

  // Passar estado de preview interativo para o iframe
  useEffect(() => {
    if (iframeLoaded && iframeRef.current?.contentWindow) {
      // Sempre enviar o estado atual (garantir que é false por padrão)
      // Aguardar um pouco para garantir que o script injetado está pronto
      const timer = setTimeout(() => {
        if (iframeRef.current?.contentWindow) {
          console.log('[EDITOR] useEffect: Enviando NCRY_SET_INTERACTIVE_PREVIEW para iframe', { 
            enabled: isInteractivePreview,
            iframeLoaded,
            timestamp: Date.now()
          })
          iframeRef.current.contentWindow.postMessage(
            {
              type: 'NCRY_SET_INTERACTIVE_PREVIEW',
              payload: { enabled: isInteractivePreview },
            },
            '*'
          )
        } else {
          console.error('[EDITOR] useEffect: ERRO - contentWindow não existe após timeout')
        }
      }, 150)
      
      return () => clearTimeout(timer)
    } else {
      console.warn('[EDITOR] useEffect: iframe não está pronto', { 
        iframeLoaded, 
        iframeExists: !!iframeRef.current,
        contentWindowExists: !!iframeRef.current?.contentWindow
      })
    }
  }, [isInteractivePreview, iframeLoaded])

  // Gerenciar alinhamento e margens
  useEffect(() => {
    if (!selectedElement) {
      setTextAlign('left')
      setMarginTopPx(0)
      setMarginBottomPx(0)
      return
    }

    const kind = classifyElement(selectedElement)

    if (['heading', 'text', 'button', 'badge', 'link'].includes(kind)) {
      setTextAlign(normalizeAlign(selectedElement.styles.textAlign))
    } else if (kind === 'image') {
      // Para imagens, mantém alinhamento
      setTextAlign(normalizeAlign(selectedElement.styles.textAlign))
    } else {
      setTextAlign('left')
    }

    setMarginTopPx(parsePx(selectedElement.styles.marginTop))
    setMarginBottomPx(parsePx(selectedElement.styles.marginBottom))
  }, [selectedElement])

  // Fechar menus de cor ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      
      if (isTextColorMenuOpen) {
        const isClickInsideInput = textColorInputRef.current?.contains(target)
        const isClickInsideMenu = textColorMenuRef.current?.contains(target)
        if (!isClickInsideInput && !isClickInsideMenu) {
          setIsTextColorMenuOpen(false)
        }
      }
      
      if (isBgColorMenuOpen) {
        const isClickInsideInput = bgColorInputRef.current?.contains(target)
        const isClickInsideMenu = bgColorMenuRef.current?.contains(target)
        if (!isClickInsideInput && !isClickInsideMenu) {
          setIsBgColorMenuOpen(false)
        }
      }
    }

    if (isTextColorMenuOpen || isBgColorMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isTextColorMenuOpen, isBgColorMenuOpen])

  // Gerenciar estados de tamanho (fonte e largura de imagem)
  useEffect(() => {
    if (!selectedElement) {
      setFontSize(null)
      setImageWidthPercent(null)
      return
    }

    const kind = classifyElement(selectedElement)

    // Tamanho de fonte
    if (['heading', 'button', 'badge', 'link', 'text'].includes(kind)) {
      const sz = parsePx(selectedElement.styles.fontSize)
      setFontSize(clamp(sz, 8, 72))
    } else {
      setFontSize(null)
    }

    // Largura da imagem (em %)
    if (kind === 'image') {
      const w = selectedElement.styles.width || ''
      let pct = 100
      const m = w.match(/([\d.]+)%/)
      if (m && m[1]) {
        pct = parseFloat(m[1])
      }
      setImageWidthPercent(clamp(pct, 10, 100))
    } else {
      setImageWidthPercent(null)
    }
  }, [selectedElement])

  // Gerar seletor CSS para breadcrumb
  function generateSelector(sel: SelectedElement | null): string {
    if (!sel) return ''
    const tag = sel.tagName.toLowerCase()
    const classes = (sel.classList || []).filter((c: string) => c.trim()).join('.')
    return classes ? `${tag}.${classes}` : tag
  }

  // Cores pré-definidas para o menu
  const presetColors = [
    '#000000', '#FFFFFF', '#F5C542', '#EAB308', '#FACC15',
    '#EF4444', '#F87171', '#4ADE80', '#22C55E', '#3B82F6',
    '#6366F1', '#8B5CF6', '#EC4899', '#F97316', '#14B8A6',
    '#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB', '#F3F4F6'
  ]

  // Renderizar menu de cores
  function renderColorMenu(
    isOpen: boolean,
    inputRef: React.RefObject<HTMLInputElement>,
    menuRef: React.RefObject<HTMLDivElement>,
    currentColor: string,
    onColorChange: (color: string) => void,
    position: 'text' | 'bg'
  ) {
    if (!isOpen || !inputRef.current) return null

    const rect = inputRef.current.getBoundingClientRect()
    const menuHeight = 220 // Altura aproximada do menu
    const spacing = 8 // Espaçamento entre input e menu
    
    // Calcular posição acima do input
    let top = rect.top - menuHeight - spacing
    
    // Se não couber acima, colocar abaixo
    if (top < 0) {
      top = rect.bottom + spacing
    }
    
    const menuStyle: React.CSSProperties = {
      position: 'fixed',
      top: `${top}px`,
      left: `${rect.left}px`,
      zIndex: 1000,
      width: `${Math.max(rect.width, 280)}px` // Largura mínima para o menu
    }

    return (
      <div
        ref={menuRef}
        className="rounded-lg border shadow-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-200"
        style={{
          ...menuStyle,
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-subtle)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cores pré-definidas */}
        <div className="mb-4">
          <p className="text-xs mb-2 font-medium" style={{ color: 'var(--text-muted)' }}>
            Cores rápidas
          </p>
          <div className="grid grid-cols-10 gap-1.5">
            {presetColors.map((color: string) => (
              <button
                key={color}
                type="button"
                className="w-7 h-7 rounded border transition-all duration-150 hover:scale-110 hover:z-10 relative"
                style={{
                  backgroundColor: color,
                  borderColor: color === currentColor ? 'var(--gold)' : 'var(--border-subtle)',
                  borderWidth: color === currentColor ? '2px' : '1px',
                  boxShadow: color === currentColor ? '0 0 0 2px var(--gold-soft-transparent)' : 'none'
                }}
                onClick={() => {
                  onColorChange(color)
                  if (position === 'text') {
                    setIsTextColorMenuOpen(false)
                  } else {
                    setIsBgColorMenuOpen(false)
                  }
                }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Divisor */}
        <div className="h-px mb-4" style={{ backgroundColor: 'var(--border-subtle)' }} />

        {/* Color picker customizado */}
        <div>
          <p className="text-xs mb-2 font-medium" style={{ color: 'var(--text-muted)' }}>
            Personalizado
          </p>
          <input
            type="color"
            value={currentColor}
            onChange={(e) => onColorChange(e.target.value)}
            className="w-full h-10 rounded-lg border cursor-pointer"
            style={{
              borderColor: 'var(--border-strong)',
              backgroundColor: 'var(--bg-input)'
            }}
          />
          <input
            type="text"
            value={currentColor}
            onChange={(e) => onColorChange(e.target.value)}
            className="editor-input mt-2 text-xs font-mono"
            placeholder="#000000"
          />
        </div>
      </div>
    )
  }

  // Renderizar aba Geral
  function renderGeneralTab() {
    if (!selectedElement) {
      return (
        <p className="text-xs text-zinc-500">
          Clique em qualquer elemento na landing para editar.
        </p>
      )
    }

    const elementKind = classifyElement(selectedElement)
    const selector = generateSelector(selectedElement)
    const textColor = normalizeColorToHex(selectedElement.styles.color)
    const bgColor = normalizeColorToHex(selectedElement.styles.backgroundColor)
    const canEditBackground =
      elementKind === 'button' ||
      elementKind === 'badge' ||
      hasSolidBackground(selectedElement.styles)

    return (
      <div className="space-y-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-3">
          <span 
            className="px-2 py-1 rounded-lg font-mono text-xs"
            style={{
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--gold)'
            }}
          >
            {selector}
          </span>
          <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-soft)' }}>
            {elementKind}
          </span>
        </div>

        {/* Editor específico para imagens */}
        {elementKind === 'image' ? (
          <div className="space-y-4">
            {/* Preview da imagem atual */}
            {imageUrl && (
              <div className="relative rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border-subtle)' }}>
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-full h-32 object-cover"
                  onError={(e) => {
                    // Se a imagem falhar ao carregar, esconde o preview
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            )}

            {/* Botão para abrir biblioteca */}
            <button
              onClick={() => setIsMediaLibraryOpen(true)}
              className="w-full px-4 py-3 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'var(--gold)',
                color: '#000',
              }}
            >
              <ImageIcon className="w-4 h-4" />
              {imageUrl ? 'Alterar Imagem' : 'Selecionar Imagem'}
            </button>

            {/* Botão remover (se houver imagem) */}
            {imageUrl && (
              <button
                onClick={handleRemoveImage}
                className="w-full px-4 py-2 text-xs rounded-lg transition-colors"
                style={{
                  backgroundColor: 'rgba(248, 113, 113, 0.1)',
                  color: 'var(--danger)',
                  border: '1px solid rgba(248, 113, 113, 0.3)',
                }}
              >
                Remover Imagem
              </button>
            )}

            {/* Modal de Biblioteca de Mídia */}
            <MediaLibraryModal
              isOpen={isMediaLibraryOpen}
              onClose={() => setIsMediaLibraryOpen(false)}
              onSelectImage={(urlOrObject) => {
                console.log('[EDITOR] 1. Modal retornou:', urlOrObject)
                console.log('[EDITOR] 2. Elemento antes do update:', selectedElement)
                
                // Extrair URL como string (pode vir como objeto ou string)
                let finalUrl: string
                if (typeof urlOrObject === 'string') {
                  finalUrl = urlOrObject.trim()
                } else if (urlOrObject && typeof urlOrObject === 'object') {
                  // Se for objeto, tentar extrair publicUrl ou url
                  finalUrl = ((urlOrObject as any)?.publicUrl || (urlOrObject as any)?.url || '').trim()
                } else {
                  console.error('[EDITOR] ERRO: URL inválida/vazia!', urlOrObject)
                  return
                }
                
                // Validar que é URL absoluta
                if (!finalUrl || (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://'))) {
                  console.error('[EDITOR] ERRO: URL Final não é absoluta!', finalUrl)
                  return
                }
                
                console.log('[EDITOR] 3. URL Final para salvar:', finalUrl)
                
                // Atualizar estado local (isso atualiza o preview na sidebar)
                setImageUrl(finalUrl)
                
                // Aplicar imediatamente no iframe
                if (iframeRef.current && selectedElement) {
                  scheduleSnapshot()
                  const win = iframeRef.current.contentWindow
                  if (win) {
                    console.log('[EDITOR] 4. Enviando mensagem para iframe:', {
                      elementId: selectedElement.elementId,
                      src: finalUrl,
                    })
                    win.postMessage(
                      {
                        type: 'NCRY_UPDATE_IMAGE_SRC',
                        payload: {
                          elementId: selectedElement.elementId,
                          src: finalUrl,
                        },
                      },
                      '*'
                    )
                  } else {
                    console.error('[EDITOR] ERRO: contentWindow não disponível!')
                  }
                } else {
                  console.error('[EDITOR] ERRO: iframe ou selectedElement não disponível!', {
                    hasIframe: !!iframeRef.current,
                    hasSelectedElement: !!selectedElement,
                  })
                }
              }}
              currentImageUrl={imageUrl}
            />
          </div>
        ) : (
          <>
            {/* Editor de texto */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                Texto
              </label>
              <textarea
                value={selectedElement.innerText}
                onChange={(e) => {
                  const value = e.target.value
                  setSelectedElement({
                    ...selectedElement,
                    innerText: value,
                  })
                  // LIVE: atualiza imediatamente no iframe
                  liveUpdate({ innerText: value })
                }}
                className="editor-input w-full h-32 text-sm resize-none"
                placeholder="Digite o texto..."
              />
            </div>

            {/* Editor de Link (se o elemento for ou estiver dentro de um link) */}
            {selectedElement.linkElementId && (
              <div className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                  Link de Destino / URL
                </label>
                <input
                  type="text"
                  className="editor-input text-sm"
                  value={selectedElement.href === '#' || !selectedElement.href ? '' : selectedElement.href}
                  onChange={(e) => {
                    const rawValue = e.target.value.trim()
                    // Se vazio, define como '#' no DOM mas salva null no estado para mostrar vazio no input
                    const newHref = rawValue === '' ? '#' : rawValue
                    const hrefForState = rawValue === '' ? null : rawValue
                    
                    setSelectedElement({
                      ...selectedElement,
                      href: hrefForState,
                    })
                    handleLinkChange(newHref, selectedElement.target || null)
                  }}
                  placeholder="https://example.com ou #"
                />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedElement.target === '_blank'}
                    onChange={(e) => {
                      const newTarget = e.target.checked ? '_blank' : null
                      setSelectedElement({
                        ...selectedElement,
                        target: newTarget,
                      })
                      handleLinkChange(selectedElement.href || '#', newTarget)
                    }}
                    className="rounded"
                    style={{ accentColor: 'var(--gold)' }}
                  />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Abrir em nova aba?
                  </span>
                </label>
              </div>
            )}

            {/* Cor do texto */}
            <div className="relative">
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                Cor do texto
              </label>
              <div className="flex items-center gap-2">
                {/* Preview da cor */}
                <div
                  className="rounded-lg border cursor-pointer flex-shrink-0"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderColor: 'var(--border-strong)',
                    backgroundColor: textColor || '#000000'
                  }}
                  onClick={() => setIsTextColorMenuOpen(!isTextColorMenuOpen)}
                />
                {/* Input de texto que abre o menu */}
                <input
                  ref={textColorInputRef}
                  type="text"
                  value={textColor}
                  onFocus={() => setIsTextColorMenuOpen(true)}
                  onChange={(e) => {
                    const value = e.target.value
                    setSelectedElement({
                      ...selectedElement,
                      styles: {
                        ...selectedElement.styles,
                        color: value,
                      },
                    })
                    liveUpdate({ styles: { color: value } })
                  }}
                  className="editor-input flex-1 text-xs font-mono"
                  placeholder="#000000"
                />
              </div>
              {/* Menu suspenso de cores */}
              {renderColorMenu(
                isTextColorMenuOpen,
                textColorInputRef,
                textColorMenuRef,
                textColor,
                (color) => {
                  setSelectedElement({
                    ...selectedElement,
                    styles: {
                      ...selectedElement.styles,
                      color: color,
                    },
                  })
                  liveUpdate({ styles: { color: color } })
                },
                'text'
              )}
            </div>

            {/* Cor de fundo */}
            {canEditBackground && (
              <div className="relative">
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                  Cor de fundo
                </label>
                <div className="flex items-center gap-2">
                  {/* Preview da cor */}
                  <div
                    className="rounded-lg border cursor-pointer flex-shrink-0"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderColor: 'var(--border-strong)',
                      backgroundColor: bgColor || '#ffffff'
                    }}
                    onClick={() => setIsBgColorMenuOpen(!isBgColorMenuOpen)}
                  />
                  {/* Input de texto que abre o menu */}
                  <input
                    ref={bgColorInputRef}
                    type="text"
                    value={bgColor}
                    onFocus={() => setIsBgColorMenuOpen(true)}
                    onChange={(e) => {
                      const value = e.target.value
                      setSelectedElement({
                        ...selectedElement,
                        styles: {
                          ...selectedElement.styles,
                          backgroundColor: value,
                        },
                      })
                      liveUpdate({ styles: { backgroundColor: value } })
                    }}
                    className="editor-input flex-1 text-xs font-mono"
                    placeholder="#000000"
                  />
                </div>
                {/* Menu suspenso de cores */}
                {renderColorMenu(
                  isBgColorMenuOpen,
                  bgColorInputRef,
                  bgColorMenuRef,
                  bgColor,
                  (color) => {
                    setSelectedElement({
                      ...selectedElement,
                      styles: {
                        ...selectedElement.styles,
                        backgroundColor: color,
                      },
                    })
                    liveUpdate({ styles: { backgroundColor: color } })
                  },
                  'bg'
                )}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // Renderizar aba Layout
  function renderLayoutTab() {
    if (!selectedElement) {
      return (
        <p className="text-xs" style={{ color: 'var(--text-soft)' }}>
          Selecione um elemento para ajustar layout.
        </p>
      )
    }

    const kind = classifyElement(selectedElement)

    return (
      <div className="space-y-4">
        {/* Tamanho da fonte */}
        {(() => {
          const canEditFontSize = ['heading', 'button', 'badge', 'link', 'text'].includes(kind)
          return (
            canEditFontSize &&
            fontSize !== null && (
              <div className="space-y-2">
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                  Tamanho da fonte ({fontSize.toFixed(0)}px)
                </label>
                <input
                  type="range"
                  min={8}
                  max={72}
                  value={fontSize}
                  onChange={(e) => {
                    const v = clamp(parseInt(e.target.value, 10), 8, 72)
                    setFontSize(v)
                    setSelectedElement((prev) =>
                      prev
                        ? {
                            ...prev,
                            styles: {
                              ...prev.styles,
                              fontSize: `${v}px`,
                            },
                          }
                        : prev
                    )
                    liveUpdate({ styles: { fontSize: `${v}px` } })
                  }}
                  className="w-full h-1.5 rounded-full cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    accentColor: 'var(--gold)'
                  }}
                />
              </div>
            )
          )
        })()}

        {/* Largura da imagem */}
        {kind === 'image' &&
          imageWidthPercent !== null && (
            <div className="space-y-2">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                Largura da imagem ({imageWidthPercent.toFixed(0)}%)
              </label>
              <input
                type="range"
                min={10}
                max={100}
                value={imageWidthPercent}
                onChange={(e) => {
                  const v = clamp(parseInt(e.target.value, 10), 10, 100)
                  setImageWidthPercent(v)
                  setSelectedElement((prev) =>
                    prev
                      ? {
                          ...prev,
                          styles: {
                            ...prev.styles,
                            width: `${v}%`,
                          },
                        }
                      : prev
                  )
                  liveUpdate({ styles: { width: `${v}%` } })
                }}
                className="w-full h-1.5 rounded-full cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  accentColor: 'var(--gold)'
                }}
              />
            </div>
          )}

        {/* Alinhamento */}
        {(() => {
          const canAlign = ['heading', 'text', 'button', 'badge', 'link', 'image'].includes(kind)
          return (
            canAlign && (
              <div className="space-y-2">
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                  Alinhamento
                </label>
                <div className="flex gap-1">
                  {(['left', 'center', 'right'] as TextAlign[]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setTextAlign(opt)
                        setSelectedElement((prev) =>
                          prev
                            ? {
                                ...prev,
                                styles: {
                                  ...prev.styles,
                                  textAlign: opt,
                                },
                              }
                            : prev
                        )
                        // Para imagens, precisa aplicar display + margin
                        const kind = classifyElement(selectedElement)
                        if (kind === 'image') {
                          if (opt === 'left') {
                            liveUpdate({ styles: { display: 'block', marginLeft: '0px', marginRight: 'auto', textAlign: opt } })
                          } else if (opt === 'center') {
                            liveUpdate({ styles: { display: 'block', marginLeft: 'auto', marginRight: 'auto', textAlign: opt } })
                          } else if (opt === 'right') {
                            liveUpdate({ styles: { display: 'block', marginLeft: 'auto', marginRight: '0px', textAlign: opt } })
                          }
                        } else {
                          liveUpdate({ styles: { textAlign: opt } })
                        }
                      }}
                      className={clsx(
                        'flex-1 py-2 rounded-lg text-xs border transition-all duration-150',
                        textAlign === opt ? 'font-semibold' : 'font-medium'
                      )}
                      style={
                        textAlign === opt
                          ? {
                              backgroundColor: 'var(--gold)',
                              color: '#000000',
                              borderColor: 'var(--gold)'
                            }
                          : {
                              backgroundColor: 'var(--bg-card)',
                              color: 'var(--text-muted)',
                              borderColor: 'var(--border-subtle)'
                            }
                      }
                      onMouseEnter={(e) => {
                        if (textAlign !== opt) {
                          e.currentTarget.style.borderColor = 'var(--border-medium)'
                          e.currentTarget.style.color = 'var(--text-main)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (textAlign !== opt) {
                          e.currentTarget.style.borderColor = 'var(--border-subtle)'
                          e.currentTarget.style.color = 'var(--text-muted)'
                        }
                      }}
                    >
                      {opt === 'left' && 'Esq.'}
                      {opt === 'center' && 'Centro'}
                      {opt === 'right' && 'Dir.'}
                    </button>
                  ))}
                </div>
              </div>
            )
          )
        })()}

        {/* Margens */}
        <div className="space-y-2">
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
            Espaçamento vertical
          </label>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-12 text-xs uppercase" style={{ color: 'var(--text-soft)' }}>Topo</span>
              <input
                type="range"
                min={0}
                max={120}
                value={marginTopPx}
                onChange={(e) => {
                  const v = clamp(parseInt(e.target.value, 10), 0, 120)
                  setMarginTopPx(v)
                  setSelectedElement((prev) =>
                    prev
                      ? {
                          ...prev,
                          styles: {
                            ...prev.styles,
                            marginTop: `${v}px`,
                          },
                        }
                      : prev
                  )
                  liveUpdate({ styles: { marginTop: `${v}px` } })
                }}
                className="flex-1 h-1.5 rounded-full cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  accentColor: 'var(--gold)'
                }}
              />
              <span className="w-12 text-xs text-right" style={{ color: 'var(--text-soft)' }}>{marginTopPx}px</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-12 text-xs uppercase" style={{ color: 'var(--text-soft)' }}>Baixo</span>
              <input
                type="range"
                min={0}
                max={120}
                value={marginBottomPx}
                onChange={(e) => {
                  const v = clamp(parseInt(e.target.value, 10), 0, 120)
                  setMarginBottomPx(v)
                  setSelectedElement((prev) =>
                    prev
                      ? {
                          ...prev,
                          styles: {
                            ...prev.styles,
                            marginBottom: `${v}px`,
                          },
                        }
                      : prev
                  )
                  liveUpdate({ styles: { marginBottom: `${v}px` } })
                }}
                className="flex-1 h-1.5 rounded-full cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  accentColor: 'var(--gold)'
                }}
              />
              <span className="w-12 text-xs text-right" style={{ color: 'var(--text-soft)' }}>
                {marginBottomPx}px
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Histórico de undo com snapshot agendado
  function scheduleSnapshot() {
    if (!iframeRef.current) return
    if (undoTimerRef.current !== null) return

    undoTimerRef.current = window.setTimeout(() => {
      undoTimerRef.current = null
      const doc = iframeRef.current?.contentDocument
      if (!doc) return

      const html = doc.documentElement.outerHTML
      // Mantém até 20 passos de histórico
      historyRef.current = [...historyRef.current.slice(-19), html]
      setCanUndo(historyRef.current.length > 0)
    }, 300) // 300ms depois da primeira alteração
  }

  function handleUndo() {
    if (!iframeRef.current) return
    const iframe = iframeRef.current
    const history = historyRef.current
    const last = history.pop()
    if (!last) return

    setCanUndo(history.length > 0)

    // Reaplica o HTML anterior diretamente como srcdoc
    // (ele já contém o script do editor injetado)
    iframe.srcdoc = last

    // Resetar estados derivados
    setSelectedElement(null)
    setIframeLoaded(false)
  }

  // Live update: atualiza iframe em tempo real
  function liveUpdate(partial: { innerText?: string; styles?: Record<string, string> }) {
    if (!iframeRef.current || !selectedElement) return
    const win = iframeRef.current.contentWindow
    if (!win) return

    scheduleSnapshot()

    win.postMessage(
      {
        type: 'NCRY_UPDATE_ELEMENT',
        payload: {
          elementId: selectedElement.elementId,
          // Só manda o que realmente mudou
          ...(partial.innerText !== undefined ? { innerText: partial.innerText } : {}),
          ...(partial.styles ? { styles: partial.styles } : {}),
        },
      },
      '*'
    )
  }

  // Atualizar link (href e target)
  function handleLinkChange(newHref: string, newTarget: string | null) {
    if (!iframeRef.current || !selectedElement || !selectedElement.linkElementId) return
    
    const win = iframeRef.current.contentWindow
    if (!win) return

    scheduleSnapshot()

    win.postMessage(
      {
        type: 'NCRY_UPDATE_LINK',
        payload: {
          linkElementId: selectedElement.linkElementId,
          href: newHref,
          target: newTarget,
        },
      },
      '*'
    )
  }

  // Aplicar alterações no iframe
  function applyChanges() {
    if (!iframeRef.current || !selectedElement) return
    
    scheduleSnapshot()
    
    const win = iframeRef.current.contentWindow
    if (!win) return

    const styles: Record<string, string> = {}
    const kind = classifyElement(selectedElement)

    if (selectedElement.styles.color) styles.color = selectedElement.styles.color
    if (selectedElement.styles.backgroundColor)
      styles.backgroundColor = selectedElement.styles.backgroundColor
    if (selectedElement.styles.borderColor) styles.borderColor = selectedElement.styles.borderColor
    if (selectedElement.styles.borderRadius)
      styles.borderRadius = selectedElement.styles.borderRadius
    if (selectedElement.styles.fontSize) styles.fontSize = selectedElement.styles.fontSize
    if (selectedElement.styles.width) styles.width = selectedElement.styles.width

    // Margens
    styles.marginTop = `${marginTopPx}px`
    styles.marginBottom = `${marginBottomPx}px`

    // Alinhamento
    if (kind === 'image') {
      // Alinhamento para imagens via margin
      if (textAlign === 'left') {
        styles.display = 'block'
        styles.marginLeft = '0px'
        styles.marginRight = 'auto'
      } else if (textAlign === 'center') {
        styles.display = 'block'
        styles.marginLeft = 'auto'
        styles.marginRight = 'auto'
      } else if (textAlign === 'right') {
        styles.display = 'block'
        styles.marginLeft = 'auto'
        styles.marginRight = '0px'
      }
    } else {
      styles.textAlign = textAlign
    }

    win.postMessage(
      {
        type: 'NCRY_UPDATE_ELEMENT',
        payload: {
          elementId: selectedElement.elementId,
          innerText: selectedElement.innerText,
          styles,
        },
      },
      '*'
    )
  }

  // Drag & drop de blocos rápidos
  function startQuickBlockDrag(kind: QuickBlockKind, e: React.MouseEvent) {
    e.preventDefault()
    setDragBlockKind(kind)
    setDragGhostPos({ x: e.clientX, y: e.clientY })

    // Desativa pointer-events do iframe durante o drag
    const currentIframe = iframeRef.current
    if (currentIframe) {
      currentIframe.style.pointerEvents = 'none'
    }

    const handleMove = (ev: MouseEvent) => {
      setDragGhostPos({ x: ev.clientX, y: ev.clientY })

      // Pega o iframe dentro do handler (não usa closure)
      const iframe = iframeRef.current
      if (!iframe || !iframe.contentWindow) return

      const rect = iframe.getBoundingClientRect()

      // Calcula coordenadas relativas ao viewport do iframe
      const iframeX = ev.clientX - rect.left
      const iframeY = ev.clientY - rect.top

      // Envia postMessage para o iframe
      iframe.contentWindow.postMessage(
        {
          type: 'NCRY_BLOCK_DRAG_MOVE',
          payload: {
            kind,
            iframeX,
            iframeY,
          },
        },
        '*'
      )
    }

    const handleUp = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)

      // Pega o iframe dentro do handler (não usa closure)
      const currentIframe = iframeRef.current

      // Reativa pointer-events do iframe (sempre, independente de como terminou)
      if (currentIframe) {
        currentIframe.style.pointerEvents = 'auto'
      }

      if (currentIframe?.contentWindow) {
        const rect = currentIframe.getBoundingClientRect()

        // Calcula coordenadas relativas ao iframe (exatamente como no mousemove)
        const iframeX = ev.clientX - rect.left
        const iframeY = ev.clientY - rect.top

        // Se iframeY estiver dentro da altura do iframe, envia drop
        if (iframeY >= 0 && iframeY <= rect.height) {
          currentIframe.contentWindow.postMessage(
            {
              type: 'NCRY_BLOCK_DRAG_DROP',
              payload: {
                kind,
                iframeX,
                iframeY,
                html: buildQuickBlockHtml(kind),
              },
            },
            '*'
          )
        } else {
          // Se estiver fora, envia drop cancelado
          currentIframe.contentWindow.postMessage(
            {
              type: 'NCRY_BLOCK_DRAG_DROP',
              payload: {
                kind,
                iframeX: -1,
                iframeY: -1,
                html: null,
              },
            },
            '*'
          )
        }
      }

      // Zera estado de drag
      setDragBlockKind(null)
      setDragGhostPos(null)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }

  // Remover elemento
  function handleRemoveElement() {
    if (!iframeRef.current || !selectedElement) return
    
    scheduleSnapshot()
    
    const win = iframeRef.current.contentWindow
    if (!win) return
    win.postMessage(
      {
        type: 'NCRY_REMOVE_ELEMENT',
        payload: { elementId: selectedElement.elementId },
      },
      '*'
    )
    setSelectedElement(null)
    
    // Esconde toolbar no iframe
    if (iframeRef.current.contentDocument) {
      const toolbar = iframeRef.current.contentDocument.getElementById('nocry-element-toolbar')
      if (toolbar) {
        toolbar.style.opacity = '0'
        setTimeout(() => {
          if (toolbar) {
            toolbar.style.display = 'none'
          }
        }, 150)
      }
    }
  }

  // Inserir bloco
  function handleInsertBlock(kind: 'h1' | 'p' | 'button' | 'img') {
    if (!iframeRef.current) return
    
    scheduleSnapshot()
    
    const win = iframeRef.current.contentWindow
    if (!win) return

    let html = ''
    if (kind === 'h1') {
      html =
        '<h1 style="display:block; margin:16px 0; font-size:2rem;">Novo título</h1>'
    } else if (kind === 'p') {
      html =
        '<p style="display:block; margin:12px 0; font-size:1rem;">Novo parágrafo de texto. Edite aqui.</p>'
    } else if (kind === 'button') {
      html =
        '<a href="#" class="nocry-btn" style="display:inline-block; margin:16px 0; padding:12px 24px; background:#f05252; color:#ffffff; border-radius:999px; text-decoration:none; font-weight:600;">Novo botão</a>'
    } else if (kind === 'img') {
      html =
        '<img src="https://via.placeholder.com/400x250" alt="Nova imagem" style="display:block; margin:16px auto; max-width:100%; height:auto;" />'
    }

    if (!html) return

    if (selectedElement) {
      win.postMessage(
        {
          type: 'NCRY_INSERT_ELEMENT_AFTER',
          payload: {
            referenceId: selectedElement.elementId,
            html,
          },
        },
        '*'
      )
    } else {
      win.postMessage(
        {
          type: 'NCRY_INSERT_ELEMENT_AT_END',
          payload: { html },
        },
        '*'
      )
    }
  }

  // Aplicar URL de imagem
  function handleApplyImageUrl() {
    if (!iframeRef.current || !selectedElement) return
    
    scheduleSnapshot()
    
    const win = iframeRef.current.contentWindow
    if (!win) return
    win.postMessage(
      {
        type: 'NCRY_UPDATE_IMAGE_SRC',
        payload: {
          elementId: selectedElement.elementId,
          src: imageUrl || '', // Permite src vazio para remover imagem
        },
      },
      '*'
    )
  }

  // Remover imagem (converte para placeholder)
  function handleRemoveImage() {
    if (!iframeRef.current || !selectedElement) return
    
    scheduleSnapshot()
    
    setImageUrl('')
    const win = iframeRef.current.contentWindow
    if (!win) return
    win.postMessage(
      {
        type: 'NCRY_UPDATE_IMAGE_SRC',
        payload: {
          elementId: selectedElement.elementId,
          src: '', // String vazia converte para placeholder
        },
      },
      '*'
    )
  }


  // Drag & Drop handlers
  function handleDropOnOutline(e: React.DragEvent<HTMLLIElement>, targetId: string) {
    e.preventDefault()
    const sourceId = e.dataTransfer.getData('text/plain')
    if (!sourceId || sourceId === targetId) return
    if (!iframeRef.current) return
    const win = iframeRef.current.contentWindow
    if (!win) return

    // 1) Atualiza DOM dentro do iframe
    win.postMessage(
      {
        type: 'NCRY_MOVE_ELEMENT_BEFORE',
        payload: { sourceId, targetId },
      },
      '*'
    )

    // 2) Atualiza a lista local (outline) pra refletir nova ordem
    setOutline((prev) => {
      const current = [...prev]
      const fromIdx = current.findIndex((i) => i.elementId === sourceId)
      const toIdx = current.findIndex((i) => i.elementId === targetId)
      if (fromIdx === -1 || toIdx === -1) return prev
      const [moved] = current.splice(fromIdx, 1)
      if (moved) {
        current.splice(toIdx, 0, moved)
      }
      return current
    })

    setIsDraggingId(null)
  }

  function handleOutlineItemClick(elementId: string) {
    if (!iframeRef.current) return
    const doc = iframeRef.current.contentDocument
    if (!doc) return
    const el = doc.querySelector<HTMLElement>(`[data-nocry-id="${elementId}"]`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // dispara o mesmo fluxo do clique dentro do iframe
    el.click()
  }

  // Aplicar mudanças de tracking
  async function applyTrackingChanges() {
    if (!iframeRef.current || !tracking) {
      setIsTrackingModalOpen(false)
      return
    }

    const doc = iframeRef.current.contentDocument
    if (!doc) {
      setIsTrackingModalOpen(false)
      return
    }

    scheduleSnapshot()

    const scripts = Array.from(doc.querySelectorAll('script'))

    // Atualiza UTMify Pixel Script completo
    if (tracking.utmifyPixel?.script) {
      // Procura script existente com window.pixelId
      let foundExisting = false
      for (const s of scripts) {
        const text = s.textContent || ''
        if (text.includes('window.pixelId') || text.includes('cdn.utmify.com.br/scripts/pixel/pixel.js')) {
          // Substitui o script existente pelo novo
          // Parse o HTML do script novo e substitui o conteúdo
          const tempDiv = doc.createElement('div')
          tempDiv.innerHTML = tracking.utmifyPixel.script
          const newScriptElement = tempDiv.querySelector('script')
          
          if (newScriptElement) {
            // Copia atributos do novo script
            Array.from(newScriptElement.attributes).forEach((attr: any) => {
              s.setAttribute(attr.name, attr.value)
            })
            // Substitui o conteúdo
            s.textContent = newScriptElement.textContent
            s.innerHTML = newScriptElement.innerHTML
          } else {
            // Se não conseguiu parsear, tenta substituir apenas o conteúdo interno
            const scriptContentMatch = tracking.utmifyPixel.script.match(/<script[^>]*>([\s\S]*?)<\/script>/i)
            if (scriptContentMatch && scriptContentMatch[1]) {
              s.textContent = scriptContentMatch[1]
            }
          }
          foundExisting = true
          break
        }
      }
      
      // Se não encontrou script existente, adiciona novo
      if (!foundExisting) {
        const tempDiv = doc.createElement('div')
        tempDiv.innerHTML = tracking.utmifyPixel.script
        const newScriptElement = tempDiv.querySelector('script')
        
        if (newScriptElement) {
          // Clona o elemento para poder inserir no documento
          const clonedScript = doc.createElement('script')
          Array.from(newScriptElement.attributes).forEach((attr: any) => {
            clonedScript.setAttribute(attr.name, attr.value)
          })
          clonedScript.textContent = newScriptElement.textContent
          clonedScript.innerHTML = newScriptElement.innerHTML
          
          // Adiciona no head ou body (preferencialmente head)
          if (doc.head) {
            doc.head.appendChild(clonedScript)
          } else if (doc.body) {
            doc.body.appendChild(clonedScript)
          }
        }
      }
    }

    // Atualiza Meta Pixel ID
    if (tracking.metaPixel?.pixelId) {
      for (const s of scripts) {
        const text = s.textContent || ''
        if (text.includes("fbq('init'") || text.includes('fbq("init"')) {
          const newText = text.replace(
            /fbq\(['"]init['"]\s*,\s*['"](\d+)['"]\)/,
            `fbq('init', '${tracking.metaPixel.pixelId}')`
          )
          s.textContent = newText
        }
      }
    }

    // Lida com script de UTMs
    const utmifyUtmsSelector = 'script[src*="utmify.com.br/scripts/utms"]'
    const utmScript = doc.querySelector<HTMLScriptElement>(utmifyUtmsSelector)

    if (tracking.utmifyUtms?.enabled) {
      // Se marcado para habilitar e não existir, cria um padrão
      if (!utmScript) {
        const newScript = doc.createElement('script')
        newScript.src = 'https://cdn.utmify.com.br/scripts/utms/latest.js'
        newScript.setAttribute('async', '')
        newScript.setAttribute('defer', '')
        doc.head.appendChild(newScript)
      }
    } else {
      // Se desabilitar, remove script existente
      if (utmScript) {
        utmScript.remove()
      }
    }

    // Fecha modal
    setIsTrackingModalOpen(false)
  }

  // Salvar e baixar ZIP
  async function handleSaveAndDownload() {
    // Se for SPA, mostrar aviso antes de exportar
    if (clone?.isSpaFramework) {
      setShowSpaExportNotice(true)
      return
    }

    // Para páginas não-SPA, continuar com o fluxo normal
    await executeSaveAndDownload()
  }

  async function executeSaveAndDownload() {
    if (!iframeRef.current) return

    try {
      setSaving(true)
      setError(null)
      setSuccessMessage(null)

      // Salvar HTML atual da página antes de exportar (atualiza estado pages)
      saveCurrentPageHtml()

      const doc = iframeRef.current.contentDocument
      if (!doc) {
        throw new Error('Não foi possível acessar o documento')
      }

      // Pegar HTML atual do iframe (fonte da verdade - contém todas as edições visuais)
      let newHtml = doc.documentElement.outerHTML

      // Remover o <base id="nocry-editor-base" ...> que injetamos só pro editor
      newHtml = newHtml.replace(
        /<base[^>]*id=["']nocry-editor-base["'][^>]*>\s*/i,
        ''
      )

      // Remover o <script id="nocry-editor-script">...</script> que é só do editor
      newHtml = newHtml.replace(
        /<script[^>]*id=["']nocry-editor-script["'][^>]*>[\s\S]*?<\/script>\s*/i,
        ''
      )
      
      // Log para validação
      console.log('[EDITOR] HTML do iframe capturado:', {
        length: newHtml.length,
        hasSupabase: newHtml.includes('supabase.co'),
        hasImages: newHtml.includes('<img'),
      })

      // 1. Salvar no banco (só se não for SPA, pois para SPA não salvamos edições no rawHtml)
      if (!clone?.isSpaFramework) {
        const saveRes = await fetch(`/api/clones/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html: newHtml }),
        })

        if (!saveRes.ok) {
          const data = await saveRes.json()
          throw new Error(data.error || 'Falha ao salvar')
        }
      }

      // 2. Baixar ZIP - enviar HTML editado atual do iframe
      const downloadId = cloneGroupId || id
      
      // Coletar HTML de todas as páginas editadas
      const editedPages: Array<{ id: string; html: string }> = []
      
      // Função auxiliar para limpar scripts do editor
      const cleanEditorScripts = (html: string): string => {
        return html
          .replace(/<base[^>]*id=["']nocry-editor-base["'][^>]*>\s*/i, '')
          .replace(/<script[^>]*id=["']nocry-editor-script["'][^>]*>[\s\S]*?<\/script>\s*/i, '')
      }
      
      // Adicionar a página atual (HTML do iframe)
      const currentPageIdToUse = currentPageId || id
      editedPages.push({
        id: currentPageIdToUse,
        html: cleanEditorScripts(newHtml),
      })
      
      // Adicionar outras páginas do grupo (se houver)
      // Usar currentHtml que foi salvo durante a edição
      for (const page of pages) {
        if (page.id !== currentPageIdToUse) {
          // Usar currentHtml se disponível (contém edições), senão usar html original
          const pageHtml = page.currentHtml || page.html || ''
          if (pageHtml) {
            editedPages.push({
              id: page.id,
              html: cleanEditorScripts(pageHtml),
            })
          }
        }
      }
      
      console.log('[EDITOR] Enviando HTML editado para ZIP:', {
        pagesCount: editedPages.length,
        currentPageId: currentPageIdToUse,
        currentPageHasSupabase: newHtml.includes('supabase.co'),
        allPagesIds: editedPages.map((p: any) => p.id),
      })
      
      const zipRes = await fetch(`/api/clones/${downloadId}/zip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          editedPages: editedPages,
        }),
      })

      if (!zipRes.ok) {
        const data = await zipRes.json()
        throw new Error(data.error || 'Falha ao gerar ZIP')
      }

      const blob = await zipRes.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = 'nocry-clone-edited.zip'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)

      setSuccessMessage('ZIP gerado com sucesso!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('[EDITOR] Save error:', err)
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  // Converter rgb() para #hex
  function normalizeColorToHex(color?: string): string {
    if (!color) return '#ffffff'
    if (color.startsWith('#')) return color
    const rgbMatch = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i)
    if (!rgbMatch || !rgbMatch[1] || !rgbMatch[2] || !rgbMatch[3]) return '#ffffff'
    const [, r, g, b] = rgbMatch
    const toHex = (n: string) => {
      const num = parseInt(n, 10)
      return num.toString(16).padStart(2, '0')
    }
    return '#' + toHex(r) + toHex(g) + toHex(b)
  }

  function parsePx(value?: string): number {
    if (!value) return 16
    const m = value.match(/([\d.]+)/)
    if (!m || !m[1]) return 16
    const n = parseFloat(m[1])
    return isNaN(n) ? 16 : n
  }

  function clamp(n: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, n))
  }

  function normalizeAlign(value?: string): TextAlign {
    const v = (value || '').toLowerCase()
    if (v === 'center') return 'center'
    if (v === 'right') return 'right'
    return 'left'
  }

  function buildQuickBlockHtml(kind: QuickBlockKind): string {
    if (kind === 'h1') {
      return '<h1 style="display:block; margin:16px 0; font-size:2rem;">Novo título</h1>'
    }
    if (kind === 'p') {
      return '<p style="display:block; margin:12px 0; font-size:1rem;">Novo parágrafo de texto. Edite aqui.</p>'
    }
    if (kind === 'button') {
      return '<a href="#" class="nocry-btn" style="display:inline-block; margin:16px 0; padding:12px 24px; background:#f05252; color:#ffffff; border-radius:999px; text-decoration:none; font-weight:600;">Novo botão</a>'
    }
    if (kind === 'img') {
      return '<img src="https://via.placeholder.com/400x250" alt="Nova imagem" style="display:block; margin:16px auto; max-width:100%; height:auto;" />'
    }
    return ''
  }

  // Construir srcDoc com script injetado (preserva <base> do HTML)
  function buildSrcDoc(html: string, originalUrl: string) {
    // Calcular baseHref a partir de originalUrl
    let baseHref: string | null = null
    try {
      const u = new URL(originalUrl)
      // Para LPs, o mais seguro é usar o origin com barra final
      baseHref = u.origin + '/'
    } catch {
      baseHref = null
    }

    // Começar de uma cópia do HTML original
    let result = html

    // Remover qualquer <base> pré-existente (por segurança)
    result = result.replace(/<base[^>]*>/gi, '')

    // Se baseHref não for null, injetar um <base> com id fixo dentro da <head>
    if (baseHref) {
      if (result.match(/<head[^>]*>/i)) {
        result = result.replace(
          /<head([^>]*)>/i,
          `<head$1><base id="nocry-editor-base" href="${baseHref}">`
        )
      } else {
        // fallback raro: não tem <head>
        result = `<head><base id="nocry-editor-base" href="${baseHref}"></head>` + result
      }
    }

    const scrollbarStyle = `
      <style id="nocry-scrollbar-style">
        html, body {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        html::-webkit-scrollbar,
        body::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      </style>
    `
    
    const editorScript = `
      <script id="nocry-editor-script">
      (function() {
        let counter = 0;
        
        // Estado do drag & drop
        let nocrySelectedEl = null;
        let nocryToolbar = null;
        let nocryDropLine = null;
        let nocryIsDragging = false;
        let nocryDragSourceEl = null;
        let nocryCurrentDropTarget = null;
        let nocryCurrentDropPosition = null;
        let nocrySavedRange = null;
        let nocryInteractivePreview = false; // Modo preview interativo

        function assignIds(root) {
          const all = root.querySelectorAll('*');
          all.forEach(el => {
            if (!el.dataset.nocryId) {
              el.dataset.nocryId = 'nocry-' + (counter++);
            }
          });
        }

        function highlight(el) {
          if (!el) return;
          if (nocryIsDragging) return; // Não destacar durante drag
          if (nocryInteractivePreview === true) return; // Não destacar em modo preview
          el.style.outline = '2px solid #FACC15';
          el.style.cursor = 'pointer';
        }

        function unhighlight(el) {
          if (!el) return;
          if (nocryInteractivePreview === true) return; // Não destacar em modo preview
          el.style.outline = '';
        }

        function isButtonLike(el) {
          if (!el) return false;
          const tag = el.tagName.toLowerCase();
          const role = (el.getAttribute('role') || '').toLowerCase();
          const classes = Array.from(el.classList || []).map((c: string) => c.toLowerCase());

          if (tag === 'button') return true;
          if (role === 'button') return true;
          if (
            tag === 'a' &&
            classes.some((c) =>
              c.includes('btn') || c.includes('button') || c.includes('cta')
            )
          ) {
            return true;
          }
          if (
            classes.some((c) =>
              c.includes('badge') || c.includes('pill') || c.includes('tag')
            )
          ) {
            return true;
          }
          return false;
        }

        /**
         * Verifica se um elemento é proibido (Safety Guard)
         */
        function isForbidden(element) {
          if (!element || !(element instanceof HTMLElement)) return true;
          
          const tag = element.tagName.toLowerCase();
          const id = element.id || '';

          // Bloquear elementos raiz perigosos
          if (
            tag === 'body' ||
            tag === 'html' ||
            tag === 'head' ||
            tag === 'script' ||
            tag === 'style' ||
            tag === 'meta' ||
            tag === 'link' ||
            tag === 'title' ||
            tag === 'noscript'
          ) {
            return true;
          }

          // Bloquear containers raiz de frameworks
          const frameworkRootIds = ['__next', 'root', 'app', '__nuxt', '__app'];
          if (frameworkRootIds.includes(id)) {
            return true;
          }

          return false;
        }

        /**
         * Analisa a pilha de elementos no ponto do clique e retorna o melhor candidato
         * Usa elementsFromPoint para "furar" overlays e divs transparentes
         * 
         * Estratégia "Deep Selection": analisa todos os elementos na coordenada do clique
         * e seleciona o mais interessante, ignorando divs transparentes/overlays
         */
        function analyzeTargetFromPoint(clientX, clientY) {
          // 1. Captura da Pilha: pegar todos os elementos na coordenada do clique
          const stack = document.elementsFromPoint(clientX, clientY);
          
          if (!stack || stack.length === 0) {
            console.log('[EDITOR] Nenhum elemento encontrado no ponto do clique');
            return null;
          }

          // Log detalhado da pilha para debug
          const stackInfo = stack.map((el, idx) => {
            if (!(el instanceof HTMLElement)) {
              return idx + ': ' + el.tagName + ' (nao HTMLElement)';
            }
            const tag = el.tagName;
            const id = el.id ? '#' + el.id : '';
            const classes = el.className ? '.' + el.className.split(' ').join('.') : '';
            return idx + ': ' + tag + id + classes;
          });
          console.log('[EDITOR] Pilha de elementos no ponto (topo -> fundo):', stackInfo);

          // 2. Funções de classificação de prioridade
          const isHighPriority = (el) => {
            if (!(el instanceof HTMLElement)) return false;
            const tag = el.tagName.toUpperCase();
            const highPriorityTags = ['IMG', 'BUTTON', 'A', 'VIDEO', 'AUDIO', 'INPUT', 'TEXTAREA', 'SELECT', 'SVG', 'CANVAS', 'IFRAME'];
            if (highPriorityTags.includes(tag)) return true;
            
            // Placeholder de imagem
            if (tag === 'DIV' && el.classList.contains('nocry-image-placeholder')) return true;
            
            // Botões (usando função existente)
            if (isButtonLike(el)) return true;
            
            return false;
          };

          const isMediumPriority = (el) => {
            if (!(el instanceof HTMLElement)) return false;
            const tag = el.tagName.toUpperCase();
            const textTags = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'SPAN', 'STRONG', 'EM', 'B', 'I', 'U', 'LABEL', 'LI', 'TD', 'TH'];
            if (!textTags.includes(tag)) return false;
            
            // Verificar se tem texto visível não-vazio
            const text = (el.innerText || '').trim();
            return text.length > 0;
          };

          const isLowPriority = (el) => {
            if (!(el instanceof HTMLElement)) return false;
            const tag = el.tagName.toUpperCase();
            const containerTags = ['DIV', 'SECTION', 'ARTICLE', 'ASIDE', 'NAV', 'HEADER', 'FOOTER', 'MAIN', 'UL', 'OL', 'TABLE', 'TR'];
            return containerTags.includes(tag);
          };

          // 3. Procura na pilha seguindo ordem de prioridade
          let bestCandidate = null;

          // PRIMEIRO: Tenta achar Elementos de Alta Prioridade (Imagens, Botões) mesmo que estejam fundos
          // Isso permite "furar" divs transparentes/overlays
          bestCandidate = stack.find(el => {
            if (!(el instanceof HTMLElement)) return false;
            return isHighPriority(el) && !isForbidden(el);
          });

          if (bestCandidate) {
            console.log('[EDITOR] ✅ Elemento de alta prioridade encontrado:', bestCandidate.tagName);
            return bestCandidate;
          }

          // SEGUNDO: Se não achou, tenta achar Texto (Média Prioridade)
          bestCandidate = stack.find(el => {
            if (!(el instanceof HTMLElement)) return false;
            return isMediumPriority(el) && !isForbidden(el);
          });

          if (bestCandidate) {
            console.log('[EDITOR] ✅ Elemento de média prioridade encontrado:', bestCandidate.tagName);
            
            // Refinar: se for um container de texto mas tiver mídia dentro, priorizar a mídia
            const refined = refineSelectionForMedia(bestCandidate);
            if (refined && refined !== bestCandidate) {
              console.log('[EDITOR] 🎯 Media Hunter: Container de texto tem mídia, priorizando mídia.');
              return refined;
            }
            
            return bestCandidate;
          }

          // TERCEIRO: Se não achou nada interessante, pega o container mais superficial (o alvo original)
          // desde que não seja proibido
          bestCandidate = stack.find(el => {
            if (!(el instanceof HTMLElement)) return false;
            return !isForbidden(el);
          });

          if (bestCandidate) {
            console.log('[EDITOR] ✅ Usando container mais superficial:', bestCandidate.tagName);
            
            // ============================================
            // REFINAMENTO: "Media Hunter" - Buscar mídia dentro de containers
            // ============================================
            const refined = refineSelectionForMedia(bestCandidate);
            if (refined && refined !== bestCandidate) {
              console.log('[EDITOR] 🎯 Media Hunter: Wrapper detectado! Aprofundando seleção para mídia interna.');
              return refined;
            }
            
            return bestCandidate;
          }

          console.log('[EDITOR] ⚠️ Nenhum candidato válido encontrado na pilha');
          return null;
        }

        /**
         * Refina a seleção para priorizar mídia (imagens, vídeos, SVG) dentro de containers
         * "Media Hunter" - Caçador de Mídia
         */
        function refineSelectionForMedia(element) {
          if (!element || !(element instanceof HTMLElement)) return element;

          const tag = element.tagName.toUpperCase();

          // 1. Se for Body/Html, bloqueia (já verificado antes, mas segurança extra)
          if (tag === 'BODY' || tag === 'HTML') return null;

          // 2. Lógica do "Media Hunter": Se clicou num container genérico...
          const containerTags = ['DIV', 'SPAN', 'FIGURE', 'SECTION', 'ARTICLE', 'ASIDE', 'A', 'LI', 'PICTURE', 'HEADER', 'FOOTER', 'NAV', 'MAIN'];
          
          if (containerTags.includes(tag)) {
            // Verificar se tem pouco ou nenhum texto direto (para não atrapalhar edição de cards de texto)
            const directText = Array.from(element.childNodes)
              .filter(node => node.nodeType === Node.TEXT_NODE)
              .map(node => node.textContent?.trim() || '')
              .join(' ')
              .trim();
            
            const hasLittleDirectText = directText.length < 20; // Menos de 20 caracteres de texto direto

            // Buscar por mídia interna
            const innerImg = element.querySelector('img');
            const innerVideo = element.querySelector('video');
            const innerSvg = element.querySelector('svg');
            const innerCanvas = element.querySelector('canvas');
            const innerIframe = element.querySelector('iframe');

            // Prioridade: IMG > VIDEO > SVG > CANVAS > IFRAME
            let mediaElement = null;
            if (innerImg && innerImg instanceof HTMLElement) {
              mediaElement = innerImg;
            } else if (innerVideo && innerVideo instanceof HTMLElement) {
              mediaElement = innerVideo;
            } else if (innerSvg && innerSvg instanceof HTMLElement) {
              mediaElement = innerSvg;
            } else if (innerCanvas && innerCanvas instanceof HTMLElement) {
              mediaElement = innerCanvas;
            } else if (innerIframe && innerIframe instanceof HTMLElement) {
              mediaElement = innerIframe;
            }

            if (mediaElement) {
              // Validar relevância: só trocar se o container tem pouco texto direto
              // OU se a imagem ocupa área significativa
              if (hasLittleDirectText) {
                console.log('[EDITOR] Media Hunter: Container com pouco texto, usando mídia interna:', mediaElement.tagName);
                return mediaElement;
              }

              // Verificar se a mídia ocupa área significativa do container
              const containerRect = element.getBoundingClientRect();
              const mediaRect = mediaElement.getBoundingClientRect();
              
              const containerArea = containerRect.width * containerRect.height;
              const mediaArea = mediaRect.width * mediaRect.height;
              
              // Se a mídia ocupa mais de 30% da área do container, priorizar ela
              if (containerArea > 0 && (mediaArea / containerArea) > 0.3) {
                console.log('[EDITOR] Media Hunter: Mídia ocupa área significativa (' + Math.round((mediaArea / containerArea) * 100) + '%), usando mídia interna:', mediaElement.tagName);
                return mediaElement;
              }

              // Se o container tem muito texto mas a mídia ainda é grande, usar a mídia
              if (mediaArea > 10000) { // Mais de 100x100px
                console.log('[EDITOR] Media Hunter: Mídia grande detectada, usando mídia interna:', mediaElement.tagName);
                return mediaElement;
              }
            }
          }

          // 3. Se não achou filho melhor, retorna o próprio elemento
          return element;
        }

        /**
         * Analisa um elemento e retorna o melhor candidato para edição
         * Versão legada que ainda pode ser usada em alguns casos
         * @deprecated Prefira usar analyzeTargetFromPoint para cliques
         */
        function analyzeTarget(element) {
          if (!element || !(element instanceof HTMLElement)) {
            return null;
          }

          // Safety Guard
          if (isForbidden(element)) {
            console.warn('[EDITOR] Elemento proibido detectado:', element.tagName);
            if (element.firstElementChild && element.firstElementChild instanceof HTMLElement) {
              return analyzeTarget(element.firstElementChild);
            }
            return null;
          }

          // Verificar visibilidade
          const rect = element.getBoundingClientRect();
          const computed = window.getComputedStyle(element);
          
          const isVisible = (
            rect.width > 0 &&
            rect.height > 0 &&
            computed.visibility !== 'hidden' &&
            computed.display !== 'none' &&
            computed.opacity !== '0'
          );

          if (!isVisible) {
            if (element.parentElement && element.parentElement instanceof HTMLElement) {
              return analyzeTarget(element.parentElement);
            }
            return null;
          }

          return element;
        }

        /**
         * Função de compatibilidade: mantém findEditableRoot para código que ainda usa
         * @deprecated Use analyzeTarget diretamente
         */
        function findEditableRoot(target) {
          const analyzed = analyzeTarget(target);
          return analyzed || target;
        }

        // Função para encontrar link pai (ou o próprio elemento se for link)
        function findParentLink(element) {
          if (!element) return null;
          
          // Se o próprio elemento é um link
          if (element.tagName && element.tagName.toLowerCase() === 'a') {
            return element;
          }
          
          // Procura por link pai usando closest
          const linkElement = element.closest('a');
          return linkElement;
        }

        function saveSelectionForRoot(root) {
          const sel = window.getSelection();
          if (!sel || sel.rangeCount === 0) {
            nocrySavedRange = null;
            return;
          }
          const range = sel.getRangeAt(0);
          if (!root.contains(range.commonAncestorContainer) || range.collapsed) {
            nocrySavedRange = null;
            return;
          }
          // Clona o range pra não depender do selection ativo
          nocrySavedRange = range.cloneRange();
        }

        // Toolbar functions
        function createToolbarButton(icon, label, onClick, isDelete) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.setAttribute('aria-label', label);
          btn.style.cssText = 'display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 999px; border: none; background: transparent; cursor: pointer; transition: background-color 0.15s;';
          btn.innerHTML = icon;
          
          if (isDelete) {
            btn.style.color = '#FCA5A5';
            btn.onmouseenter = () => { btn.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; };
            btn.onmouseleave = () => { btn.style.backgroundColor = 'transparent'; };
          } else {
            btn.style.color = '#E4E4E7';
            btn.onmouseenter = () => { btn.style.backgroundColor = 'rgba(250, 204, 21, 0.1)'; };
            btn.onmouseleave = () => { btn.style.backgroundColor = 'transparent'; };
          }
          
          btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            onClick();
          };
          
          return btn;
        }

        function ensureToolbar() {
          if (!nocryToolbar) {
            nocryToolbar = document.createElement('div');
            nocryToolbar.id = 'nocry-element-toolbar';
            nocryToolbar.style.cssText = 'position: absolute; z-index: 999999; display: flex; align-items: center; gap: 4px; padding: 4px 6px; border-radius: 999px; background: rgba(24, 24, 27, 0.9); border: 1px solid rgba(250, 204, 21, 0.6); box-shadow: 0 4px 12px rgba(0,0,0,0.4); pointer-events: auto; opacity: 0; transition: opacity 0.15s;';
            
            // Ícones SVG inline (Move, Edit, Copy, Trash)
            const moveIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l-1 1 1 1M9 5l1-1 1 1M15 19l-1 1-1-1M19 9l1 1-1 1M12 12l-7-7M12 12l7-7M12 12l-7 7M12 12l7 7"/></svg>';
            const editIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
            const copyIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
            const trashIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
            
            const dragBtn = createToolbarButton(moveIcon, 'Mover elemento', handleToolbarDragStart, false);
            dragBtn.style.cursor = 'grab';
            dragBtn.onmousedown = (e) => {
              e.preventDefault();
              e.stopPropagation();
              handleToolbarDragStart();
            };
            dragBtn.ontouchstart = (e) => {
              e.preventDefault();
              e.stopPropagation();
              handleToolbarDragStart();
            };
            
            const editBtn = createToolbarButton(editIcon, 'Editar elemento', handleToolbarEdit, false);
            const duplicateBtn = createToolbarButton(copyIcon, 'Duplicar elemento', handleToolbarDuplicate, false);
            const deleteBtn = createToolbarButton(trashIcon, 'Excluir elemento', handleToolbarDelete, true);
            
            nocryToolbar.appendChild(dragBtn);
            nocryToolbar.appendChild(editBtn);
            nocryToolbar.appendChild(duplicateBtn);
            nocryToolbar.appendChild(deleteBtn);
            
            document.body.appendChild(nocryToolbar);
          }
        }

        function positionToolbar() {
          if (!nocrySelectedEl || !nocryToolbar) return;
          const rect = nocrySelectedEl.getBoundingClientRect();
          // Posiciona no canto superior esquerdo, acima do elemento
          const toolbarHeight = 32; // Altura aproximada da toolbar
          const leftPos = window.scrollX + rect.left + 8;
          const topPos = window.scrollY + rect.top - toolbarHeight - 8; // 8px acima do elemento
          
          nocryToolbar.style.left = Math.max(window.scrollX + 8, leftPos) + 'px';
          nocryToolbar.style.top = Math.max(window.scrollY + 8, topPos) + 'px';
          nocryToolbar.style.display = 'flex';
          // Fade in
          setTimeout(() => {
            if (nocryToolbar) {
              nocryToolbar.style.opacity = '1';
            }
          }, 10);
        }

        function hideToolbar() {
          if (nocryToolbar) {
            nocryToolbar.style.opacity = '0';
            setTimeout(() => {
              if (nocryToolbar) {
                nocryToolbar.style.display = 'none';
              }
            }, 150);
          }
        }

        function handleToolbarDragStart() {
          if (!nocrySelectedEl) return;
          nocryIsDragging = true;
          nocryDragSourceEl = nocrySelectedEl;
          document.body.classList.add('nocry-dragging');
          
          window.addEventListener('mousemove', handleDragMouseMove);
          window.addEventListener('mouseup', handleDragMouseUp);
          window.addEventListener('touchmove', handleDragMouseMove);
          window.addEventListener('touchend', handleDragMouseUp);
        }

        function handleToolbarEdit() {
          if (!nocrySelectedEl) return;
          // Dispara o mesmo fluxo de seleção para abrir edição na sidebar
          const computed = window.getComputedStyle(nocrySelectedEl);
          const attributes = {};
          if (nocrySelectedEl.tagName.toLowerCase() === 'img') {
            attributes.src = nocrySelectedEl.getAttribute('src') || '';
            attributes.alt = nocrySelectedEl.getAttribute('alt') || '';
          }
          
          // Detecta link
          const linkElement = findParentLink(nocrySelectedEl);
          let linkInfo = null;
          if (linkElement) {
            // Garante que o link tem data-nocry-id
            if (!linkElement.dataset.nocryId) {
              linkElement.dataset.nocryId = 'nocry-' + (counter++);
            }
            linkInfo = {
              linkElementId: linkElement.dataset.nocryId,
              href: linkElement.getAttribute('href') || null,
              target: linkElement.getAttribute('target') || null,
            };
          }
          
          if (window.parent) {
            window.parent.postMessage({
              type: 'NCRY_SELECT_ELEMENT',
              payload: {
                elementId: nocrySelectedEl.dataset.nocryId,
                tagName: nocrySelectedEl.tagName,
                innerText: nocrySelectedEl.innerText,
                role: nocrySelectedEl.getAttribute('role') || null,
                classList: Array.from(nocrySelectedEl.classList || []),
                attributes: attributes,
                linkInfo: linkInfo,
                styles: {
                  color: computed.color,
                  backgroundColor: computed.backgroundColor,
                  borderColor: computed.borderColor,
                  borderRadius: computed.borderRadius,
                  boxShadow: computed.boxShadow,
                  fontSize: computed.fontSize,
                  fontWeight: computed.fontWeight,
                  width: computed.width,
                  textAlign: computed.textAlign,
                  marginTop: computed.marginTop,
                  marginBottom: computed.marginBottom
                }
              }
            }, '*');
          }
        }

        function handleToolbarDuplicate() {
          if (!nocrySelectedEl || !nocrySelectedEl.parentElement) return;
          
          const cloned = nocrySelectedEl.cloneNode(true);
          if (cloned instanceof HTMLElement) {
            // Remove o data-nocry-id do clone (será atribuído novo)
            delete cloned.dataset.nocryId;
            // Insere logo após o elemento original
            nocrySelectedEl.parentElement.insertBefore(cloned, nocrySelectedEl.nextSibling);
            
            // Notifica o parent (React) para atualizar outline
            if (window.parent) {
              window.parent.postMessage({
                type: 'NCRY_ELEMENT_DUPLICATED',
                payload: {
                  originalId: nocrySelectedEl.dataset.nocryId || null,
                }
              }, '*');
            }
          }
        }

        function handleToolbarDelete() {
          if (!nocrySelectedEl) return;
          const elementId = nocrySelectedEl.dataset.nocryId;
          if (!elementId) return;
          
          if (window.parent) {
            window.parent.postMessage({
              type: 'NCRY_REMOVE_ELEMENT',
              payload: { elementId },
            }, '*');
          }
        }

        function updateSelectedElement(root) {
          // IMPORTANTE: verificar explicitamente se é false (não apenas truthy)
          if (nocryInteractivePreview === true) return; // Não selecionar em modo preview
          nocrySelectedEl = root;
          ensureToolbar();
          positionToolbar();
        }

        // Drop line functions
        function ensureDropLine() {
          if (!nocryDropLine) {
            nocryDropLine = document.createElement('div');
            nocryDropLine.id = 'nocry-drop-line';
            nocryDropLine.style.position = 'absolute';
            nocryDropLine.style.height = '3px';
            nocryDropLine.style.borderRadius = '999px';
            nocryDropLine.style.background = 'rgba(96, 165, 250, 0.96)';
            nocryDropLine.style.zIndex = '999998';
            nocryDropLine.style.pointerEvents = 'none';
            document.body.appendChild(nocryDropLine);
          }
        }

        function hideDropLine() {
          if (nocryDropLine) {
            nocryDropLine.style.display = 'none';
          }
        }

        function showDropLineAt(targetEl, position) {
          ensureDropLine();
          const rect = targetEl.getBoundingClientRect();
          const y = position === 'before' ? rect.top + window.scrollY : rect.bottom + window.scrollY;
          nocryDropLine.style.display = 'block';
          nocryDropLine.style.left = (window.scrollX + rect.left) + 'px';
          nocryDropLine.style.width = rect.width + 'px';
          nocryDropLine.style.top = y + 'px';
        }

        // Drag handlers
        function findDropCandidate(clientX, clientY) {
          // Tenta primeiro com elementFromPoint
          const el = document.elementFromPoint(clientX, clientY);
          if (el) {
            let node = el;
            while (node && node !== document.body) {
              if (node.dataset && node.dataset.nocryId) {
                if (node !== nocryDragSourceEl) return node;
              }
              node = node.parentElement;
            }
          }
          
          // Se elementFromPoint não funcionou, tenta encontrar elemento que contém o ponto
          const allElements = Array.from(document.querySelectorAll('[data-nocry-id]'));
          for (const elem of allElements) {
            if (elem === nocryDragSourceEl) continue;
            const rect = elem.getBoundingClientRect();
            // Verifica se o ponto está dentro do elemento
            if (
              clientX >= rect.left && 
              clientX <= rect.right && 
              clientY >= rect.top && 
              clientY <= rect.bottom
            ) {
              return elem;
            }
          }
          
          return null;
        }


        function handleDragMouseMove(e) {
          if (!nocryIsDragging || !nocryDragSourceEl) return;

          const candidate = findDropCandidate(e.clientX, e.clientY);

          if (!candidate) {
            nocryCurrentDropTarget = null;
            nocryCurrentDropPosition = null;
            hideDropLine();
            return;
          }

          const rect = candidate.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          const position = e.clientY < midY ? 'before' : 'after';

          nocryCurrentDropTarget = candidate;
          nocryCurrentDropPosition = position;

          showDropLineAt(candidate, position);
        }

        function handleDragMouseUp(e) {
          window.removeEventListener('mousemove', handleDragMouseMove);
          window.removeEventListener('mouseup', handleDragMouseUp);
          window.removeEventListener('touchmove', handleDragMouseMove);
          window.removeEventListener('touchend', handleDragMouseUp);
          document.body.classList.remove('nocry-dragging');

          if (!nocryIsDragging || !nocryDragSourceEl) {
            nocryIsDragging = false;
            hideDropLine();
            return;
          }

          if (nocryCurrentDropTarget && nocryCurrentDropPosition && nocryCurrentDropTarget.parentElement) {
            const parent = nocryCurrentDropTarget.parentElement;
            if (nocryCurrentDropPosition === 'before') {
              parent.insertBefore(nocryDragSourceEl, nocryCurrentDropTarget);
            } else {
              parent.insertBefore(nocryDragSourceEl, nocryCurrentDropTarget.nextSibling);
            }

            // Atualiza toolbar para nova posição
            if (nocrySelectedEl === nocryDragSourceEl) {
              positionToolbar();
            }

            // Notifica o parent (React)
            if (window.parent) {
              window.parent.postMessage({
                type: 'NCRY_ELEMENT_REORDERED',
                payload: {
                  elementId: nocryDragSourceEl.dataset.nocryId || null,
                  targetId: nocryCurrentDropTarget.dataset.nocryId || null,
                  position: nocryCurrentDropPosition,
                },
              }, '*');
            }
          }

          nocryIsDragging = false;
          nocryDragSourceEl = null;
          nocryCurrentDropTarget = null;
          nocryCurrentDropPosition = null;
          hideDropLine();
        }

        window.addEventListener('DOMContentLoaded', function() {
          assignIds(document);
          
          // Garantir que o estado inicial de preview é false (sempre)
          nocryInteractivePreview = false;

          // --- SANITIZAÇÃO: remover text nodes soltos no topo do body (">", etc) ---
          try {
            const nodes = Array.from(document.body.childNodes);
            nodes.forEach((node) => {
              if (node.nodeType === Node.TEXT_NODE) {
                const text = (node.textContent || '').trim();
                // remove textos muito curtos sem letras/números (">", "-", etc)
                if (text.length > 0 && text.length <= 2 && !/[a-z0-9]/i.test(text)) {
                  node.parentNode && node.parentNode.removeChild(node);
                }
              }
            });
          } catch (e) {}
          // -------------------------------------------------------------------------

          // --- CONVERTER IMAGENS SEM SRC PARA PLACEHOLDER ---
          try {
            const allImages = document.querySelectorAll('img');
            allImages.forEach((img) => {
              const src = img.getAttribute('src') || '';
              if (!src || src.trim() === '' || src === '#' || src.startsWith('data:')) {
                // Imagem sem src válido: converter para placeholder
                const elementId = img.dataset.nocryId || 'nocry-' + (counter++);
                if (!img.dataset.nocryId) {
                  img.dataset.nocryId = elementId;
                }
                convertImgToPlaceholder(img, elementId);
              }
            });
          } catch (e) {
            console.warn('[IFRAME] Erro ao converter imagens sem src:', e);
          }
          // -------------------------------------------------------------------------

          document.body.addEventListener('mouseover', function(e) {
            if (nocryInteractivePreview === true) return; // Não destacar em modo preview
            const target = e.target;
            if (!(target instanceof HTMLElement)) return;
            highlight(target);
          }, true);

          document.body.addEventListener('mouseout', function(e) {
            if (nocryInteractivePreview === true) return; // Não destacar em modo preview
            const target = e.target;
            if (!(target instanceof HTMLElement)) return;
            unhighlight(target);
          }, true);

          // Salvar seleção de texto quando o usuário seleciona
          document.body.addEventListener('mouseup', function(e) {
            const target = e.target;
            if (!(target instanceof HTMLElement)) return;
            const root = findEditableRoot(target);
            saveSelectionForRoot(root);
          }, true);

          document.body.addEventListener('keyup', function(e) {
            // Ex: seleção com Shift + setas
            const target = e.target;
            if (!(target instanceof HTMLElement)) return;
            const root = findEditableRoot(target);
            saveSelectionForRoot(root);
          }, true);

          // Handler de cliques em links (modo preview) - captura na fase de captura para interceptar ANTES de tudo
          // IMPORTANTE: Este handler DEVE ser o primeiro e bloquear tudo se for um link válido
          // Registrado PRIMEIRO para garantir prioridade máxima
          const linkClickHandler = function(e) {
            // Só processa se modo preview estiver ativo
            if (nocryInteractivePreview !== true) {
              return; // Deixa outros handlers processarem
            }
            
            console.log('[IFRAME] Click detectado em modo preview', { 
              nocryInteractivePreview, 
              target: e.target?.tagName,
              targetHref: e.target instanceof HTMLAnchorElement ? e.target.href : null
            });
            
            let target = e.target;
            let anchor = null;
            
            // Buscar <a> no caminho do clique
            let depth = 0;
            while (target && target !== document.body && target !== document.documentElement && depth < 10) {
              if (target instanceof HTMLAnchorElement) {
                anchor = target;
                console.log('[IFRAME] Anchor encontrado no caminho', { 
                  depth, 
                  href: anchor.href,
                  tagName: anchor.tagName,
                  rawHref: anchor.getAttribute('href')
                });
                break;
              }
              target = target.parentElement;
              depth++;
            }
            
            // Se não encontrou anchor, NÃO FAZ NADA - deixa o comportamento padrão acontecer
            // Isso permite que botões, formulários, etc funcionem normalmente
            if (!anchor) {
              console.log('[IFRAME] Nenhum anchor encontrado - deixando comportamento padrão (botões/formulários funcionam)');
              return; // Não bloqueia, deixa funcionar normalmente
            }
            
            const rawHref = anchor.getAttribute('href') || '';
            console.log('[IFRAME] Anchor encontrado, verificando href', { rawHref });
            
            // Ignorar links vazios, âncoras, javascript:, mailto:, tel:, etc.
            if (rawHref && 
                rawHref !== '#' && 
                !rawHref.startsWith('javascript:') &&
                !rawHref.startsWith('mailto:') &&
                !rawHref.startsWith('tel:') &&
                !rawHref.startsWith('whatsapp:')) {
              console.log('[IFRAME] Link válido detectado, BLOQUEANDO e enviando mensagem', { rawHref });
              
              // BLOQUEAR TUDO ANTES DE QUALQUER OUTRO HANDLER
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();
              
              // Marcar que este evento foi processado
              e.nocryLinkProcessed = true;
              
              // Enviar mensagem para o parent (React) processar a navegação
              try {
                window.parent.postMessage({
                  type: 'NCRY_LINK_CLICKED',
                  payload: { href: rawHref }
                }, '*');
                console.log('[IFRAME] ✅ Mensagem NCRY_LINK_CLICKED enviada com sucesso para parent');
              } catch (err) {
                console.error('[IFRAME] ❌ ERRO ao enviar mensagem:', err);
              }
              
              return false;
            } else {
              console.log('[IFRAME] Link ignorado (vazio ou protocolo especial) - deixando comportamento padrão', { rawHref });
              // Não bloqueia links especiais, deixa funcionar normalmente
              return;
            }
          };
          
          // Registrar PRIMEIRO com captura para máxima prioridade
          document.addEventListener('click', linkClickHandler, true);
          console.log('[IFRAME] ✅ Handler de links registrado (capture phase)');
          
          // Clique: seleciona elemento (busca root editável)
          // IMPORTANTE: Este handler só executa se o handler de links não bloqueou
          document.addEventListener('click', function(e) {
            // Se o handler de links já processou, não fazer nada
            if (e.nocryLinkProcessed === true) {
              console.log('[IFRAME] Handler de seleção ignorado (link já processado)');
              return;
            }
            
            // Em modo preview interativo, NÃO FAZ NADA (deixa comportamento padrão)
            if (nocryInteractivePreview === true) {
              console.log('[IFRAME] Handler de seleção ignorado (modo preview ativo)');
              return; // Deixa o comportamento padrão do HTML/JS acontecer
            }

            // Ignora cliques na toolbar e seus filhos
            if (nocryToolbar && (nocryToolbar === e.target || nocryToolbar.contains(e.target))) {
              return;
            }
            
            // Só bloqueia se NÃO for modo preview
            e.preventDefault();
            e.stopPropagation();

            // NOVA ABORDAGEM: Usar elementsFromPoint para "furar" overlays e divs transparentes
            // Isso permite selecionar imagens mesmo que existam divs por cima
            const root = analyzeTargetFromPoint(e.clientX, e.clientY);

            // Se analyzeTargetFromPoint retornou null, significa que não há candidato válido
            if (!root) {
              console.log('[EDITOR] Clique ignorado: nenhum candidato válido encontrado');
              return;
            }

            // Verificação adicional de segurança
            if (root === document.body || root === document.documentElement) {
              console.warn('[EDITOR] Tentativa de selecionar body/html bloqueada');
              return;
            }

            const computed = window.getComputedStyle(root);

            // Garante que root tem um data-nocry-id
            if (!root.dataset.nocryId) {
              root.dataset.nocryId = 'nocry-' + (counter++);
            }

            // Atualiza elemento selecionado e posiciona drag bar
            updateSelectedElement(root);

            const attributes = {};
            if (root.tagName.toLowerCase() === 'img') {
              attributes.src = root.getAttribute('src') || '';
              attributes.alt = root.getAttribute('alt') || '';
            } else if (root.classList.contains('nocry-image-placeholder')) {
              // Placeholder: não tem src, mas precisa ser tratado como imagem
              attributes.src = '';
              attributes.alt = root.getAttribute('data-nocry-original-alt') || '';
            }

            // Detecta link
            const linkElement = findParentLink(root);
            let linkInfo = null;
            if (linkElement) {
              // Garante que o link tem data-nocry-id
              if (!linkElement.dataset.nocryId) {
                linkElement.dataset.nocryId = 'nocry-' + (counter++);
              }
              linkInfo = {
                linkElementId: linkElement.dataset.nocryId,
                href: linkElement.getAttribute('href') || null,
                target: linkElement.getAttribute('target') || null,
              };
            }

            window.parent.postMessage({
              type: 'NCRY_SELECT_ELEMENT',
              payload: {
                elementId: root.dataset.nocryId,
                tagName: root.tagName,
                innerText: root.innerText,
                role: root.getAttribute('role') || null,
                classList: Array.from(root.classList || []),
                attributes: attributes,
                linkInfo: linkInfo,
                styles: {
                  color: computed.color,
                  backgroundColor: computed.backgroundColor,
                  borderColor: computed.borderColor,
                  borderRadius: computed.borderRadius,
                  boxShadow: computed.boxShadow,
                  fontSize: computed.fontSize,
                  fontWeight: computed.fontWeight,
                  width: computed.width,
                  textAlign: computed.textAlign,
                  marginTop: computed.marginTop,
                  marginBottom: computed.marginBottom
                }
              }
            }, '*');
          }, true);

          // Double-click: permite edição inline rápida
          document.body.addEventListener('dblclick', function(e) {
            if (nocryInteractivePreview === true) return; // Não editar em modo preview
            const target = e.target;
            if (!(target instanceof HTMLElement)) return;
            target.contentEditable = 'true';
            target.focus();
          }, true);

          // Scroll e resize: atualiza posição da toolbar
          window.addEventListener('scroll', function() {
            positionToolbar();
          });
          window.addEventListener('resize', function() {
            positionToolbar();
          });

          // Funções auxiliares para conversão img <-> placeholder
          // (definidas antes do handler de mensagens para estarem disponíveis)
          function convertImgToPlaceholder(imgEl, elementId) {
            if (imgEl.tagName.toLowerCase() !== 'img') return;
            
            // Preservar atributos importantes
            const nocryId = imgEl.dataset.nocryId || elementId;
            const style = imgEl.getAttribute('style') || '';
            const className = imgEl.getAttribute('class') || '';
            const alt = imgEl.getAttribute('alt') || '';
            
            // Criar div placeholder
            const placeholder = document.createElement('div');
            placeholder.dataset.nocryId = nocryId;
            placeholder.setAttribute('class', className + ' nocry-image-placeholder');
            placeholder.setAttribute('style', style + '; min-height: 150px; background: #f0f0f0; border: 2px dashed #ccc; display: flex; justify-content: center; align-items: center; cursor: pointer;');
            placeholder.setAttribute('data-nocry-placeholder', 'true');
            placeholder.setAttribute('data-nocry-original-alt', alt);
            
            // Conteúdo do placeholder
            placeholder.innerHTML = '<span style="color: #999; font-size: 14px;">📷 Sem imagem (Clique para editar)</span>';
            
            // Substituir img por placeholder
            if (imgEl.parentNode) {
              imgEl.parentNode.replaceChild(placeholder, imgEl);
            }
          }
          
          function convertPlaceholderToImg(placeholderEl, elementId, src) {
            console.log('[IFRAME] convertPlaceholderToImg chamado:', {
              isPlaceholder: placeholderEl.classList.contains('nocry-image-placeholder'),
              elementId,
              src,
            });
            
            if (!placeholderEl.classList.contains('nocry-image-placeholder')) {
              console.warn('[IFRAME] convertPlaceholderToImg: elemento não é placeholder!');
              return;
            }
            
            // Preservar atributos importantes
            const nocryId = placeholderEl.dataset.nocryId || elementId;
            const style = placeholderEl.getAttribute('style') || '';
            const className = placeholderEl.getAttribute('class') || '';
            const alt = placeholderEl.getAttribute('data-nocry-original-alt') || '';
            
            // Remover estilos de placeholder do style
            const cleanStyle = style
              .replace(/min-height:\s*[^;]+;?/gi, '')
              .replace(/background:\s*[^;]+;?/gi, '')
              .replace(/border:\s*[^;]+;?/gi, '')
              .replace(/display:\s*flex;?/gi, '')
              .replace(/justify-content:\s*[^;]+;?/gi, '')
              .replace(/align-items:\s*[^;]+;?/gi, '')
              .replace(/cursor:\s*[^;]+;?/gi, '');
            
            // Criar img com sanitização completa
            const img = document.createElement('img');
            img.dataset.nocryId = nocryId;
            
            // Limpar classes de placeholder mas manter outras
            const cleanClassName = className.replace('nocry-image-placeholder', '').trim();
            if (cleanClassName) {
              img.setAttribute('class', cleanClassName);
            }
            
            // Aplicar estilos limpos
            if (cleanStyle) {
              img.setAttribute('style', cleanStyle);
            }
            
            // Definir src (tanto como propriedade quanto atributo)
            img.src = src;
            img.setAttribute('src', src);
            img.setAttribute('alt', alt);
            
            // SANITIZAÇÃO COMPLETA: Remover atributos conflitantes do Next.js
            img.removeAttribute('srcset');
            img.removeAttribute('sizes');
            img.removeAttribute('loading');
            img.removeAttribute('data-nimg');
            
            // Garantir visibilidade
            img.style.opacity = '1';
            img.style.visibility = 'visible';
            if (!img.style.display || img.style.display === 'none') {
              img.style.display = 'block';
            }
            
            console.log('[IFRAME] Nova img criada (sanitizada):', {
              nocryId: img.dataset.nocryId,
              src: img.getAttribute('src'),
              alt: img.getAttribute('alt'),
              className: img.getAttribute('class'),
              hasSrcset: img.hasAttribute('srcset'),
              opacity: img.style.opacity,
              visibility: img.style.visibility,
            });
            
            // Substituir placeholder por img
            if (placeholderEl.parentNode) {
              placeholderEl.parentNode.replaceChild(img, placeholderEl);
              console.log('[IFRAME] ✅ Placeholder substituído por img com sucesso (sanitizada)!');
              
              // Verificar se a img foi inserida corretamente
              const insertedImg = document.querySelector('[data-nocry-id="' + nocryId + '"]');
              if (insertedImg && insertedImg.tagName.toLowerCase() === 'img') {
                console.log('[IFRAME] ✅ Verificação: img encontrada no DOM após substituição:', {
                  src: insertedImg.getAttribute('src'),
                  hasParent: !!insertedImg.parentNode,
                  opacity: insertedImg.style.opacity,
                  visibility: insertedImg.style.visibility,
                });
              } else {
                console.error('[IFRAME] ❌ ERRO: img não encontrada após substituição!');
              }
            } else {
              console.error('[IFRAME] ❌ ERRO: placeholder não tem parentNode!');
            }
          }

          window.addEventListener('message', function(event) {
            const data = event.data;
            if (!data || typeof data !== 'object') return;

            if (data.type === 'NCRY_UPDATE_ELEMENT') {
              const { elementId, innerText, styles } = data.payload || {};
              if (!elementId) return;
              const el = document.querySelector('[data-nocry-id="' + elementId + '"]');
              if (!el) return;
              if (innerText !== undefined) {
                el.innerText = innerText;
              }
              if (styles && typeof styles === 'object') {
                // Tratamento especial de cor com seleção parcial
                if (styles.color) {
                  try {
                    let rangeToUse = null;

                    // 1) tenta usar o range salvo
                    if (nocrySavedRange && el.contains(nocrySavedRange.commonAncestorContainer) && !nocrySavedRange.collapsed) {
                      rangeToUse = nocrySavedRange;
                    } else {
                      // 2) fallback: tenta seleção atual
                      const sel = window.getSelection();
                      if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
                        const r = sel.getRangeAt(0);
                        if (el.contains(r.commonAncestorContainer)) {
                          rangeToUse = r;
                        }
                      }
                    }

                    if (rangeToUse && !rangeToUse.collapsed) {
                      const span = document.createElement('span');
                      span.style.setProperty('color', styles.color, 'important');
                      rangeToUse.surroundContents(span);

                      // limpa range salvo pra não reaplicar várias vezes
                      nocrySavedRange = null;

                      // Como já aplicamos a cor só na seleção, removemos de styles pra não pintar o elemento inteiro
                      delete styles.color;
                    }
                  } catch (e) {
                    // se der erro, deixa cair no fluxo normal e pinta o elemento todo
                  }
                }

                // Fluxo existente: aplica no elemento inteiro
                if (styles.color) {
                  el.style.setProperty('color', styles.color, 'important');
                }
                if (styles.backgroundColor) {
                  el.style.setProperty('background-color', styles.backgroundColor, 'important');
                  el.style.setProperty('background', styles.backgroundColor, 'important');
                }
                if (styles.borderColor) {
                  el.style.setProperty('border-color', styles.borderColor, 'important');
                }
                // Outros estilos sem !important
                Object.keys(styles).forEach((key) => {
                  try {
                    if (key !== 'backgroundColor' && key !== 'color' && key !== 'borderColor') {
                      el.style[key] = styles[key];
                    }
                  } catch {}
                });
              }
            }

            if (data.type === 'NCRY_REMOVE_ELEMENT') {
              const { elementId } = data.payload || {};
              if (!elementId) return;
              const el = document.querySelector('[data-nocry-id="' + elementId + '"]');
              if (el && el.parentElement) {
                el.parentElement.removeChild(el);
                // Se era o elemento selecionado, esconde toolbar
                if (nocrySelectedEl === el) {
                  nocrySelectedEl = null;
                  hideToolbar();
                }
              }
            }

            if (data.type === 'NCRY_INSERT_ELEMENT_AFTER') {
              const { referenceId, html } = data.payload || {};
              if (!referenceId || !html) return;
              const refEl = document.querySelector('[data-nocry-id="' + referenceId + '"]');
              if (!refEl || !refEl.parentElement) return;
              const wrapper = document.createElement('div');
              wrapper.innerHTML = html;
              const newEl = wrapper.firstElementChild;
              if (!newEl) return;
              if (!newEl.dataset.nocryId) {
                newEl.dataset.nocryId = 'nocry-' + (counter++);
              }
              refEl.parentElement.insertBefore(newEl, refEl.nextSibling);
            }

            if (data.type === 'NCRY_INSERT_ELEMENT_AT_END') {
              const { html } = data.payload || {};
              if (!html) return;
              const wrapper = document.createElement('div');
              wrapper.innerHTML = html;
              const newEl = wrapper.firstElementChild;
              if (!newEl) return;
              if (!newEl.dataset.nocryId) {
                newEl.dataset.nocryId = 'nocry-' + (counter++);
              }
              document.body.appendChild(newEl);
            }

            if (data.type === 'NCRY_UPDATE_IMAGE_SRC') {
              console.log('[IFRAME] NCRY_UPDATE_IMAGE_SRC recebido:', data.payload);
              const { elementId, src } = data.payload || {};
              
              if (!elementId) {
                console.error('[IFRAME] ERRO: elementId não fornecido!');
                return;
              }
              
              console.log('[IFRAME] Buscando elemento com data-nocry-id:', elementId);
              const el = document.querySelector('[data-nocry-id="' + elementId + '"]');
              
              if (!el) {
                console.error('[IFRAME] ERRO: Elemento não encontrado!', {
                  elementId,
                  totalElements: document.querySelectorAll('[data-nocry-id]').length,
                });
                return;
              }
              
              console.log('[IFRAME] Elemento encontrado:', {
                tagName: el.tagName,
                isPlaceholder: el.classList.contains('nocry-image-placeholder'),
                currentSrc: el.tagName.toLowerCase() === 'img' ? el.getAttribute('src') : 'N/A',
                newSrc: src,
              });
              
              // Se o elemento é uma img
              if (el.tagName.toLowerCase() === 'img') {
                if (src && src.trim() !== '') {
                  // SANITIZAÇÃO COMPLETA: Remove atributos conflitantes do Next.js
                  console.log('[IFRAME] Atualizando src de img com sanitização:', src);
                  
                  // 1. Atualiza a fonte principal
                  el.src = src;
                  el.setAttribute('src', src);
                  
                  // 2. CRÍTICO: Remove srcset e sizes para o navegador não priorizar versões antigas
                  el.removeAttribute('srcset');
                  el.removeAttribute('sizes');
                  
                  // 3. Remove lazy loading que pode travar a imagem
                  el.removeAttribute('loading');
                  
                  // 4. Remove estilos inline que bloqueiam visibilidade (Next.js coloca opacity: 0)
                  el.style.opacity = '1';
                  el.style.visibility = 'visible';
                  // Preserva display existente ou define como block/inline-block
                  if (!el.style.display || el.style.display === 'none') {
                    el.style.display = 'block';
                  }
                  
                  // 5. Remove atributos específicos de framework
                  el.removeAttribute('data-nimg');
                  el.removeAttribute('data-nocry-placeholder');
                  
                  // 6. Força reload da imagem (útil se a URL mudou mas o navegador cacheou)
                  el.onload = null;
                  el.onerror = null;
                  
                  console.log('[IFRAME] ✅ Imagem sanitizada e atualizada:', {
                    src: el.src,
                    hasSrcset: el.hasAttribute('srcset'),
                    hasSizes: el.hasAttribute('sizes'),
                    opacity: el.style.opacity,
                    visibility: el.style.visibility,
                    display: el.style.display,
                  });
                } else {
                  // Sem src: converte para placeholder
                  console.log('[IFRAME] Convertendo img para placeholder (src vazio)');
                  convertImgToPlaceholder(el, elementId);
                }
              } 
              // Se o elemento é um placeholder (div)
              else if (el.classList.contains('nocry-image-placeholder')) {
                if (src && src.trim() !== '') {
                  // Tem src: converte placeholder para img com sanitização completa
                  console.log('[IFRAME] Convertendo placeholder para img:', src);
                  
                  // Preservar atributos importantes
                  const nocryId = el.dataset.nocryId || elementId;
                  const className = el.getAttribute('class') || '';
                  const style = el.getAttribute('style') || '';
                  const alt = el.getAttribute('data-nocry-original-alt') || '';
                  
                  // Criar nova img com sanitização
                  const newImg = document.createElement('img');
                  newImg.src = src;
                  newImg.setAttribute('src', src);
                  newImg.setAttribute('alt', alt);
                  newImg.dataset.nocryId = nocryId;
                  
                  // Limpar classes de placeholder mas manter outras
                  const cleanClassName = className.replace('nocry-image-placeholder', '').trim();
                  if (cleanClassName) {
                    newImg.setAttribute('class', cleanClassName);
                  }
                  
                  // Preservar estilos de layout mas garantir visibilidade
                  if (style) {
                    newImg.setAttribute('style', style);
                  }
                  newImg.style.opacity = '1';
                  newImg.style.visibility = 'visible';
                  if (!newImg.style.display || newImg.style.display === 'none') {
                    newImg.style.display = 'block';
                  }
                  
                  // Garantir que não tenha atributos conflitantes
                  newImg.removeAttribute('srcset');
                  newImg.removeAttribute('sizes');
                  newImg.removeAttribute('loading');
                  newImg.removeAttribute('data-nimg');
                  
                  // Substituir placeholder por img
                  if (el.parentNode) {
                    el.parentNode.replaceChild(newImg, el);
                    console.log('[IFRAME] ✅ Placeholder substituído por Imagem real (sanitizada):', {
                      src: newImg.src,
                      nocryId: newImg.dataset.nocryId,
                    });
                  } else {
                    console.error('[IFRAME] ❌ ERRO: placeholder não tem parentNode!');
                  }
                } else {
                  // Se src vazio, mantém como placeholder
                  console.log('[IFRAME] Mantendo como placeholder (src vazio)');
                }
              } else {
                console.warn('[IFRAME] Elemento não é img nem placeholder:', el.tagName);
              }
            }

            if (data.type === 'NCRY_UPDATE_LINK') {
              const { linkElementId, href, target } = data.payload || {};
              if (!linkElementId) return;
              const linkEl = document.querySelector('[data-nocry-id="' + linkElementId + '"]');
              if (linkEl && linkEl.tagName && linkEl.tagName.toLowerCase() === 'a') {
                // Atualiza href
                if (href !== undefined) {
                  if (href === '' || href === '#') {
                    linkEl.setAttribute('href', '#');
                  } else {
                    linkEl.setAttribute('href', href);
                  }
                }
                // Atualiza target
                if (target === '_blank') {
                  linkEl.setAttribute('target', '_blank');
                  // Adiciona rel="noopener noreferrer" por segurança
                  linkEl.setAttribute('rel', 'noopener noreferrer');
                } else {
                  linkEl.removeAttribute('target');
                  // Remove rel se não for mais necessário
                  if (linkEl.getAttribute('rel') === 'noopener noreferrer') {
                    linkEl.removeAttribute('rel');
                  }
                }
              }
            }

            if (data.type === 'NCRY_SET_BODY_BACKGROUND') {
              const { color } = data.payload || {};
              if (!color) return;
              document.body.style.backgroundColor = color;
            }

            if (data.type === 'NCRY_MOVE_ELEMENT_BEFORE') {
              const { sourceId, targetId } = data.payload || {};
              if (!sourceId || !targetId) return;
              const src = document.querySelector('[data-nocry-id="' + sourceId + '"]');
              const tgt = document.querySelector('[data-nocry-id="' + targetId + '"]');
              if (!src || !tgt || !tgt.parentElement) return;
              tgt.parentElement.insertBefore(src, tgt);
            }

            if (data.type === 'NCRY_MOVE_ELEMENT_TO_END') {
              const { sourceId } = data.payload || {};
              if (!sourceId) return;
              const src = document.querySelector('[data-nocry-id="' + sourceId + '"]');
              if (!src) return;
              document.body.appendChild(src);
            }

            if (data.type === 'NCRY_SET_INTERACTIVE_PREVIEW') {
              const { enabled } = data.payload || {};
              const wasPreview = nocryInteractivePreview;
              console.log('[IFRAME] NCRY_SET_INTERACTIVE_PREVIEW recebido', { 
                enabled, 
                enabledType: typeof enabled,
                wasPreview,
                timestamp: Date.now()
              });
              
              // Garantir que é boolean explícito (nunca undefined/null)
              // Se enabled não for explicitamente true, assume false
              nocryInteractivePreview = enabled === true;
              
              // Garantir que nunca fica undefined/null
              if (nocryInteractivePreview !== true && nocryInteractivePreview !== false) {
                console.warn('[IFRAME] nocryInteractivePreview não é boolean, forçando false', { 
                  value: nocryInteractivePreview,
                  type: typeof nocryInteractivePreview
                });
                nocryInteractivePreview = false;
              }
              
              console.log('[IFRAME] Estado atualizado', { 
                enabled, 
                nocryInteractivePreview,
                wasPreview,
                changed: wasPreview !== nocryInteractivePreview
              });
              
              if (nocryInteractivePreview) {
                // Se ativando preview, esconde toolbar e limpa seleção
                hideToolbar();
                nocrySelectedEl = null;
                // Remove outlines de todos os elementos
                const allElements = document.querySelectorAll('[data-nocry-id]');
                allElements.forEach(el => {
                  if (el instanceof HTMLElement) {
                    el.style.outline = '';
                    el.style.cursor = ''; // Remove cursor pointer
                  }
                });
              } else if (wasPreview) {
                // Ao desativar preview, volta ao modo edição
                // Remove qualquer outline residual
                const allElements = document.querySelectorAll('[data-nocry-id]');
                allElements.forEach(el => {
                  if (el instanceof HTMLElement) {
                    el.style.outline = '';
                    el.style.cursor = '';
                  }
                });
              }
            }

            if (data.type === 'NCRY_BLOCK_DRAG_MOVE') {
              const { iframeX, iframeY } = data.payload || {};
              if (typeof iframeX !== 'number' || typeof iframeY !== 'number') return;

              // Se iframeY é válido (dentro da altura do viewport), tenta encontrar elemento
              // Não importa se iframeX é negativo (sobre a sidebar), ainda procura baseado em Y
              let candidate = null;
              
              if (iframeY >= 0 && iframeY <= window.innerHeight) {
                // Tenta primeiro com elementFromPoint se iframeX estiver dentro do viewport
                if (iframeX >= 0 && iframeX <= window.innerWidth) {
                  candidate = findDropCandidate(iframeX, iframeY);
                }
                
                // Se não encontrou (ou iframeX está sobre a sidebar), procura elemento na posição Y
                if (!candidate) {
                  const allElements = Array.from(document.querySelectorAll('[data-nocry-id]'));
                  let closestDist = Infinity;
                  
                  for (const elem of allElements) {
                    if (elem === nocryDragSourceEl) continue;
                    const rect = elem.getBoundingClientRect();
                    const centerY = rect.top + rect.height / 2;
                    const dist = Math.abs(iframeY - centerY);
                    
                    // Prioriza elementos que contêm a posição Y, depois os mais próximos
                    const containsY = iframeY >= rect.top && iframeY <= rect.bottom;
                    if (containsY || dist < closestDist) {
                      if (containsY || dist < closestDist) {
                        candidate = elem;
                        if (containsY) break; // Se encontrou um que contém, para aqui
                        closestDist = dist;
                      }
                    }
                  }
                }
              }

              if (!candidate) {
                nocryCurrentDropTarget = null;
                nocryCurrentDropPosition = null;
                hideDropLine();
                return;
              }

              const rect = candidate.getBoundingClientRect();
              const midY = rect.top + rect.height / 2;
              const position = iframeY < midY ? 'before' : 'after';

              nocryCurrentDropTarget = candidate;
              nocryCurrentDropPosition = position;
              showDropLineAt(candidate, position);
            }

            if (data.type === 'NCRY_BLOCK_DRAG_DROP') {
              const { kind, html, iframeX, iframeY } = data.payload || {};
              
              // Se html é null, cancela o drop
              if (!html) {
                hideDropLine();
                nocryCurrentDropTarget = null;
                nocryCurrentDropPosition = null;
                return;
              }

              let target = nocryCurrentDropTarget;
              let position = nocryCurrentDropPosition;

              // Se não tem target salvo, tenta encontrar baseado nas coordenadas
              // Não importa se iframeX é negativo (sobre a sidebar), procura baseado em iframeY
              if (!target && typeof iframeX === 'number' && typeof iframeY === 'number') {
                // Se iframeY é válido, procura elemento
                if (iframeY >= 0 && iframeY <= window.innerHeight) {
                  // Tenta primeiro com elementFromPoint se iframeX estiver dentro do viewport
                  if (iframeX >= 0 && iframeX <= window.innerWidth) {
                    target = findDropCandidate(iframeX, iframeY);
                  }
                  
                  // Se não encontrou (ou iframeX está sobre a sidebar), procura elemento na posição Y
                  if (!target) {
                    const allElements = Array.from(document.querySelectorAll('[data-nocry-id]'));
                    let closestDist = Infinity;
                    
                    for (const elem of allElements) {
                      if (elem === nocryDragSourceEl) continue;
                      const rect = elem.getBoundingClientRect();
                      const centerY = rect.top + rect.height / 2;
                      const dist = Math.abs(iframeY - centerY);
                      
                      // Prioriza elementos que contêm a posição Y, depois os mais próximos
                      const containsY = iframeY >= rect.top && iframeY <= rect.bottom;
                      if (containsY || dist < closestDist) {
                        if (containsY || dist < closestDist) {
                          target = elem;
                          if (containsY) break; // Se encontrou um que contém, para aqui
                          closestDist = dist;
                        }
                      }
                    }
                  }
                  
                  if (target) {
                    const rect = target.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    position = iframeY < midY ? 'before' : 'after';
                  }
                }
              }

              const wrapper = document.createElement('div');
              wrapper.innerHTML = html;
              const newEl = wrapper.firstElementChild;
              if (!newEl) return;

              if (!newEl.dataset.nocryId) {
                newEl.dataset.nocryId = 'nocry-' + (counter++);
              }

              if (target && position && target.parentElement) {
                if (position === 'before') {
                  target.parentElement.insertBefore(newEl, target);
                } else {
                  target.parentElement.insertBefore(newEl, target.nextSibling);
                }
              } else {
                document.body.appendChild(newEl);
              }

              hideDropLine();
              nocryCurrentDropTarget = null;
              nocryCurrentDropPosition = null;
            }
          });
        });
      })();
      </script>
    `

    // Injeta o style no head e o script antes de </body>
    // (result já foi declarado no início da função)
    
    // Injeta style no head
    if (result.includes('</head>')) {
      result = result.replace('</head>', scrollbarStyle + '</head>')
    } else if (result.includes('<head>')) {
      result = result.replace('<head>', '<head>' + scrollbarStyle)
    } else if (result.includes('<html>')) {
      result = result.replace('<html>', '<html><head>' + scrollbarStyle + '</head>')
    } else {
      result = scrollbarStyle + result
    }
    
    // Injeta script antes de </body>
    if (result.includes('</body>')) {
      result = result.replace('</body>', editorScript + '</body>')
    } else {
      result = result + editorScript
    }
    
    return result
  }

  if (loading) {
    return (
      <div 
        className="flex items-center justify-center h-screen"
        style={{ backgroundColor: 'var(--bg-body)', color: 'var(--text-main)' }}
      >
        <div className="text-center">
          <div 
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderColor: 'var(--gold)' }}
          ></div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Carregando editor...</p>
        </div>
      </div>
    )
  }

  if (error || !clone) {
    return (
      <div 
        className="flex items-center justify-center h-screen"
        style={{ backgroundColor: 'var(--bg-body)', color: 'var(--text-main)' }}
      >
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4" style={{ color: 'var(--danger)' }}>⚠️</div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-main)' }}>Erro ao carregar clone</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{error || 'Clone não encontrado'}</p>
          <button
            onClick={() => router.push('/clone')}
            className="editor-btn-primary px-6 py-2"
          >
            Voltar
          </button>
        </div>
      </div>
    )
  }

  const isMobile = viewportMode === 'mobile'

  return (
    <>
      {/* Aviso de SPA/Next.js */}
      {clone?.isSpaFramework && showSpaNotice && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-yellow-500/40 px-6 py-6 shadow-2xl text-center space-y-4">
            <h2 className="text-lg font-semibold text-white">
              Página com Next/React detectada
            </h2>
            <p className="text-sm text-zinc-300">
              Esse site usa frameworks como <span className="font-semibold">Next</span> e{' '}
              <span className="font-semibold">React</span>. Para permitir edição visual,
              tivemos que limitar alguns scripts e animações avançadas.
            </p>
            <p className="text-xs text-zinc-400">
              O layout foi congelado em uma versão estática. Alguns efeitos dinâmicos podem
              não aparecer aqui, mas você pode editar o conteúdo normalmente.
            </p>
            <button
              type="button"
              onClick={() => {
                const storageKey = `nocry_spa_notice_dismissed_${id}`
                try {
                  if (typeof window !== 'undefined') {
                    window.localStorage?.setItem(storageKey, '1')
                  }
                } catch (e) {
                  // Ignora erros de localStorage
                }
                setShowSpaNotice(false)
              }}
              className="mt-2 inline-flex items-center justify-center rounded-full bg-yellow-500 px-6 py-2 text-sm font-medium text-black hover:bg-yellow-400 transition-colors"
            >
              Ok, entendi
            </button>
          </div>
        </div>
      )}

      {/* Aviso de exportação para SPA/Next.js */}
      {clone?.isSpaFramework && showSpaExportNotice && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-yellow-500/40 px-6 py-6 shadow-2xl text-center space-y-4">
            <h2 className="text-lg font-semibold text-white">
              Exportar clone completo (Next/React)
            </h2>
            <p className="text-sm text-zinc-300">
              Essa página usa frameworks como <span className="font-semibold">Next</span> e{' '}
              <span className="font-semibold">React</span>.
            </p>
            <p className="text-sm text-zinc-300">
              Para esse tipo de página, o download em ZIP usa o clone completo original,
              com scripts e animações ativados.
            </p>
            <p className="text-xs text-zinc-400">
              Isso significa que o arquivo baixado pode não refletir 100% das edições feitas
              no editor visual. Use principalmente para estudo/modelagem ou como base bruta
              para ajustes manuais.
            </p>

            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowSpaExportNotice(false)}
                className="rounded-full border border-zinc-600 px-5 py-2 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowSpaExportNotice(false)
                  await executeSaveAndDownload()
                }}
                className="rounded-full bg-yellow-500 px-5 py-2 text-sm font-medium text-black hover:bg-yellow-400 transition-colors"
              >
                Exportar clone completo
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-body)', color: 'var(--text-main)' }}>
        {/* Header global */}
        <header 
          className="h-16 flex items-center justify-between px-6 shrink-0"
          style={{ 
            backgroundColor: 'var(--bg-subtle)',
            borderBottom: '1px solid rgba(250, 204, 21, 0.10)'
          }}
        >
          {/* Esquerda: logo + nome do produto + nome da página */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/clone')}
              className="flex items-center gap-2 text-sm transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-main)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
            <div className="h-4 w-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-main)' }}>Editor Visual</h2>
            </div>
          </div>

          {/* Centro: seletor de páginas + viewport toggle + undo */}
          <div className="flex items-center gap-3">
            {/* Seletor de páginas */}
            {pages.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Página:</span>
                <select
                  className="bg-zinc-900 border border-zinc-700 text-xs rounded px-2 py-1"
                  style={{ 
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-main)'
                  }}
                  value={currentPageId || ''}
                  onChange={(e) => loadPageById(e.target.value)}
                  disabled={isInteractivePreview}
                  onMouseEnter={(e) => {
                    if (!isInteractivePreview) {
                      e.currentTarget.style.borderColor = 'var(--gold)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isInteractivePreview) {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)'
                    }
                  }}
                >
                  {pages
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.path === '/' ? 'Home' : p.path}
                      </option>
                    ))}
                </select>
              </div>
            )}
            <div 
              className="rounded-full p-1 inline-flex gap-1"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            >
              <button
                type="button"
                onClick={() => setViewportMode('desktop')}
                className={clsx(
                  'px-3 py-1.5 text-xs rounded-full transition-all duration-150',
                  viewportMode === 'desktop'
                    ? 'font-semibold'
                    : 'font-medium'
                )}
                style={
                  viewportMode === 'desktop'
                    ? { backgroundColor: 'var(--gold)', color: '#000000' }
                    : { color: 'var(--text-muted)' }
                }
                onMouseEnter={(e) => {
                  if (viewportMode !== 'desktop') {
                    e.currentTarget.style.color = 'var(--text-main)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (viewportMode !== 'desktop') {
                    e.currentTarget.style.color = 'var(--text-muted)'
                  }
                }}
              >
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('mobile')}
                className={clsx(
                  'px-3 py-1.5 text-xs rounded-full transition-all duration-150',
                  viewportMode === 'mobile'
                    ? 'font-semibold'
                    : 'font-medium'
                )}
                style={
                  viewportMode === 'mobile'
                    ? { backgroundColor: 'var(--gold)', color: '#000000' }
                    : { color: 'var(--text-muted)' }
                }
                onMouseEnter={(e) => {
                  if (viewportMode !== 'mobile') {
                    e.currentTarget.style.color = 'var(--text-main)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (viewportMode !== 'mobile') {
                    e.currentTarget.style.color = 'var(--text-muted)'
                  }
                }}
              >
                Mobile
              </button>
            </div>

            <button
              type="button"
              onClick={handleUndo}
              className="h-8 w-8 flex items-center justify-center rounded-full border transition-all duration-150"
              style={
                canUndo
                  ? {
                      borderColor: 'var(--border-subtle)',
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-muted)'
                    }
                  : {
                      borderColor: 'var(--border-subtle)',
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-soft)',
                      opacity: 0.4,
                      cursor: 'not-allowed'
                    }
              }
              disabled={!canUndo}
              onMouseEnter={(e) => {
                if (canUndo) {
                  e.currentTarget.style.borderColor = 'var(--gold)'
                  e.currentTarget.style.color = 'var(--text-main)'
                }
              }}
              onMouseLeave={(e) => {
                if (canUndo) {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)'
                  e.currentTarget.style.color = 'var(--text-muted)'
                }
              }}
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            {/* Toggle Modo Preview Interativo */}
            <button
              type="button"
              onClick={() => {
                const newValue = !isInteractivePreview
                console.log('[EDITOR] Botão modo clique clicado', { 
                  oldValue: isInteractivePreview, 
                  newValue,
                  iframeExists: !!iframeRef.current,
                  contentWindowExists: !!iframeRef.current?.contentWindow
                })
                setIsInteractivePreview(newValue)
                // Notifica o iframe sobre a mudança
                if (iframeRef.current?.contentWindow) {
                  console.log('[EDITOR] Enviando NCRY_SET_INTERACTIVE_PREVIEW para iframe', { enabled: newValue })
                  iframeRef.current.contentWindow.postMessage(
                    {
                      type: 'NCRY_SET_INTERACTIVE_PREVIEW',
                      payload: { enabled: newValue },
                    },
                    '*'
                  )
                } else {
                  console.error('[EDITOR] ERRO: iframe ou contentWindow não existe!', {
                    iframeRef: !!iframeRef.current,
                    contentWindow: !!iframeRef.current?.contentWindow
                  })
                }
                // Se desativando preview, limpa seleção
                if (!newValue && selectedElement) {
                  // Mantém seleção ao voltar para modo edição
                } else if (newValue) {
                  // Ao ativar preview, esconde toolbar e limpa seleção visual
                  setSelectedElement(null)
                }
              }}
              className={clsx(
                'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150',
                isInteractivePreview ? 'border' : 'border'
              )}
              style={
                isInteractivePreview
                  ? {
                      borderColor: 'var(--gold)',
                      backgroundColor: 'var(--gold)',
                      color: '#000000'
                    }
                  : {
                      borderColor: 'var(--border-subtle)',
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-muted)'
                    }
              }
              onMouseEnter={(e) => {
                if (!isInteractivePreview) {
                  e.currentTarget.style.borderColor = 'var(--gold)'
                  e.currentTarget.style.color = 'var(--text-main)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isInteractivePreview) {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)'
                  e.currentTarget.style.color = 'var(--text-muted)'
                }
              }}
              title={isInteractivePreview ? 'Desativar modo preview interativo' : 'Ativar modo preview interativo (cliques funcionam como na página real)'}
            >
              {isInteractivePreview ? (
                <>
                  <Hand className="h-4 w-4" />
                  <span>Modo clique ON</span>
                </>
              ) : (
                <>
                  <MousePointerClick className="h-4 w-4" />
                  <span>Modo clique OFF</span>
                </>
              )}
            </button>
          </div>

          {/* Direita: botão Salvar & Baixar ZIP */}
          <button
            onClick={handleSaveAndDownload}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              backgroundColor: 'var(--gold)',
              color: '#000000'
            }}
            onMouseEnter={(e) => {
              if (!saving) {
                e.currentTarget.style.backgroundColor = 'var(--gold-soft)'
              }
            }}
            onMouseLeave={(e) => {
              if (!saving) {
                e.currentTarget.style.backgroundColor = 'var(--gold)'
              }
            }}
          >
            {saving ? (
              <>
                <div className="h-3 w-3 border-2 border-black border-b-transparent rounded-full animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Salvar & Exportar
              </>
            )}
          </button>
        </header>

        {/* Conteúdo - 3 colunas */}
        <div className="flex flex-1 overflow-hidden">
          {/* Coluna esquerda: Blocos rápidos */}
          <aside 
            className="w-[280px] flex flex-col shrink-0"
            style={{ 
              backgroundColor: 'var(--bg-elevated)',
              borderRight: '1px solid var(--border-subtle)'
            }}
          >
            {/* Cabeçalho */}
            <div className="px-5 pt-5 pb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Estrutura
              </p>
            </div>

            {/* Lista de blocos */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 editor-scroll">
              <button
                onMouseDown={(e) => startQuickBlockDrag('h1', e)}
                onClick={(e) => {
                  if (!dragBlockKind) handleInsertBlock('h1')
                }}
                className="editor-block-item w-full"
                title="Clique ou arraste para adicionar título H1"
              >
                <div className="editor-block-item__icon">
                  <span className="text-xs font-semibold" style={{ color: 'var(--gold)' }}>H1</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="editor-block-item__title">Título</p>
                  <p className="editor-block-item__subtitle">Heading principal</p>
                </div>
              </button>

              <button
                onMouseDown={(e) => startQuickBlockDrag('p', e)}
                onClick={(e) => {
                  if (!dragBlockKind) handleInsertBlock('p')
                }}
                className="editor-block-item w-full"
                title="Clique ou arraste para adicionar parágrafo"
              >
                <div className="editor-block-item__icon">
                  <span className="text-xs font-semibold" style={{ color: 'var(--gold)' }}>P</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="editor-block-item__title">Parágrafo</p>
                  <p className="editor-block-item__subtitle">Texto corrido</p>
                </div>
              </button>

              <button
                onMouseDown={(e) => startQuickBlockDrag('button', e)}
                onClick={(e) => {
                  if (!dragBlockKind) handleInsertBlock('button')
                }}
                className="editor-block-item w-full"
                title="Clique ou arraste para adicionar botão"
              >
                <div className="editor-block-item__icon">
                  <span className="text-xs font-semibold" style={{ color: 'var(--gold)' }}>Btn</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="editor-block-item__title">Botão</p>
                  <p className="editor-block-item__subtitle">Call-to-action</p>
                </div>
              </button>

              <button
                onMouseDown={(e) => startQuickBlockDrag('img', e)}
                onClick={(e) => {
                  if (!dragBlockKind) handleInsertBlock('img')
                }}
                className="editor-block-item w-full"
                title="Clique ou arraste para adicionar imagem"
              >
                <div className="editor-block-item__icon">
                  <span className="text-xs font-semibold" style={{ color: 'var(--gold)' }}>Img</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="editor-block-item__title">Imagem</p>
                  <p className="editor-block-item__subtitle">Foto ou ilustração</p>
                </div>
              </button>
            </div>
          </aside>

          {/* Coluna central: Canvas */}
          <main 
            className="flex-1 flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: 'var(--bg-body)' }}
          >
            {isMobile ? (
              <div 
                className="w-full h-full flex items-center justify-center overflow-auto editor-scroll"
                style={{
                  padding: '24px 24px 32px',
                  background: 'radial-gradient(circle at top, rgba(148,163,184,0.12), transparent 55%)'
                }}
              >
                <div className="w-full max-w-[420px]">
                  <div 
                    className="overflow-hidden"
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '18px',
                      border: '1px solid rgba(15,23,42,0.35)',
                      boxShadow: '0 18px 40px rgba(0,0,0,0.55)'
                    }}
                  >
                    <iframe
                      ref={iframeRef}
                      className="w-full h-[calc(100vh-8rem)] bg-white"
                      srcDoc={srcDoc}
                      title="Preview"
                      sandbox="allow-same-origin allow-scripts"
                      onLoad={() => setIframeLoaded(true)}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div 
                className="w-full h-full flex items-center justify-center overflow-auto editor-scroll"
                style={{
                  padding: '24px 24px 32px',
                  background: 'radial-gradient(circle at top, rgba(148,163,184,0.12), transparent 55%)'
                }}
              >
                <div className="w-full max-w-6xl">
                  <div 
                    className="overflow-hidden"
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid rgba(15,23,42,0.35)',
                      boxShadow: '0 18px 40px rgba(0,0,0,0.55)'
                    }}
                  >
                    <iframe
                      ref={iframeRef}
                      className="w-full h-[calc(100vh-6rem)] bg-white"
                      srcDoc={srcDoc}
                      title="Preview"
                      sandbox="allow-same-origin allow-scripts"
                      onLoad={() => setIframeLoaded(true)}
                    />
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* Coluna direita: Painel */}
          <aside 
            className="w-[360px] flex flex-col shrink-0"
            style={{ 
              backgroundColor: 'var(--bg-elevated)',
              borderLeft: '1px solid var(--border-subtle)'
            }}
          >
            {/* Botão Pixels & UTMs */}
            <div 
              className="px-5 pt-4 pb-3 shrink-0"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <button
                className="w-full py-2.5 rounded-lg border transition-all duration-150 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  borderColor: 'var(--border-subtle)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-main)'
                }}
                disabled={!tracking}
                onClick={() => setIsTrackingModalOpen(true)}
                onMouseEnter={(e) => {
                  if (!tracking) return
                  e.currentTarget.style.borderColor = 'var(--border-medium)'
                  e.currentTarget.style.backgroundColor = 'rgba(148, 163, 184, 0.05)'
                }}
                onMouseLeave={(e) => {
                  if (!tracking) return
                  e.currentTarget.style.borderColor = 'var(--border-subtle)'
                  e.currentTarget.style.backgroundColor = 'var(--bg-card)'
                }}
              >
                Pixels &amp; UTMs {tracking ? '(detecção ativa)' : '(carregando...)'}
              </button>
            </div>

            {/* Abas Geral / Layout */}
            {selectedElement && (
              <div 
                className="px-5 pt-4 pb-3 flex gap-2 shrink-0"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('geral')}
                  className={clsx(
                    'flex-1 py-2 rounded-full border text-xs transition-all duration-150',
                    activeTab === 'geral' ? 'font-semibold' : 'font-medium'
                  )}
                  style={
                    activeTab === 'geral'
                      ? { backgroundColor: 'var(--gold)', color: '#000000', borderColor: 'var(--gold)' }
                      : { backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', borderColor: 'var(--border-subtle)' }
                  }
                  onMouseEnter={(e) => {
                    if (activeTab !== 'geral') {
                      e.currentTarget.style.borderColor = 'var(--border-medium)'
                      e.currentTarget.style.color = 'var(--text-main)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'geral') {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)'
                      e.currentTarget.style.color = 'var(--text-muted)'
                    }
                  }}
                >
                  Geral
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('layout')}
                  className={clsx(
                    'flex-1 py-2 rounded-full border text-xs transition-all duration-150',
                    activeTab === 'layout' ? 'font-semibold' : 'font-medium'
                  )}
                  style={
                    activeTab === 'layout'
                      ? { backgroundColor: 'var(--gold)', color: '#000000', borderColor: 'var(--gold)' }
                      : { backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', borderColor: 'var(--border-subtle)' }
                  }
                  onMouseEnter={(e) => {
                    if (activeTab !== 'layout') {
                      e.currentTarget.style.borderColor = 'var(--border-medium)'
                      e.currentTarget.style.color = 'var(--text-main)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'layout') {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)'
                      e.currentTarget.style.color = 'var(--text-muted)'
                    }
                  }}
                >
                  Layout
                </button>
              </div>
            )}

            {/* Conteúdo */}
            <div 
              className="flex-1 overflow-y-auto editor-scroll"
              style={{ padding: 'var(--spacing-lg) var(--spacing-lg) var(--spacing-lg) var(--spacing-lg)' }}
            >
              <div className="space-y-3">
                {!selectedElement ? (
                  <>
                    <div className="editor-card text-center" style={{ padding: 'var(--spacing-xl)' }}>
                      <div className="text-3xl mb-2">👆</div>
                      <p className="text-sm mb-1" style={{ color: 'var(--text-main)' }}>
                        Clique em qualquer elemento na landing ao lado para começar a editar.
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-soft)' }}>
                        Dica: dê duplo clique para editar inline na própria landing.
                      </p>
                    </div>

                    {/* Seção de página (cor de fundo) */}
                    {tracking && (
                      <div className="editor-prop-card">
                        <h3 className="editor-prop-card__title">Configurações da página</h3>
                        <div className="space-y-2">
                          <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                            Cor de fundo da página (body)
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              className="rounded-lg border cursor-pointer"
                              style={{
                                width: '36px',
                                height: '36px',
                                borderColor: 'var(--border-strong)',
                                backgroundColor: 'var(--bg-input)'
                              }}
                              value={pageBgColor}
                              onChange={(e) => {
                                const color = e.target.value
                                setPageBgColor(color)
                                if (!iframeRef.current) return
                                const win = iframeRef.current.contentWindow
                                if (!win) return
                                win.postMessage({ type: 'NCRY_SET_BODY_BACKGROUND', payload: { color } }, '*')
                              }}
                            />
                            <input
                              type="text"
                              className="editor-input flex-1 text-xs font-mono"
                              value={pageBgColor}
                              onChange={(e) => {
                                const color = e.target.value
                                setPageBgColor(color)
                                if (!iframeRef.current) return
                                const win = iframeRef.current.contentWindow
                                if (!win) return
                                win.postMessage({ type: 'NCRY_SET_BODY_BACKGROUND', payload: { color } }, '*')
                              }}
                              placeholder="#ffffff"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="editor-prop-card">
                    {activeTab === 'geral' ? renderGeneralTab() : renderLayoutTab()}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div 
              className="px-5 py-3 shrink-0"
              style={{ 
                borderTop: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-elevated)'
              }}
            >
              {/* Mensagens de feedback */}
              {error && (
                <div 
                  className="text-xs rounded-lg p-2 mb-2"
                  style={{
                    color: 'var(--danger)',
                    backgroundColor: 'rgba(248, 113, 113, 0.1)',
                    border: '1px solid rgba(248, 113, 113, 0.3)'
                  }}
                >
                  {error}
                </div>
              )}
              {successMessage && (
                <div 
                  className="text-xs rounded-lg p-2 mb-2"
                  style={{
                    color: 'var(--success)',
                    backgroundColor: 'rgba(74, 222, 128, 0.1)',
                    border: '1px solid rgba(74, 222, 128, 0.3)'
                  }}
                >
                  {successMessage}
                </div>
              )}
              <p className="text-xs" style={{ color: 'var(--text-soft)' }}>
                As alterações só são aplicadas na landing após você salvar e baixar o ZIP.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* Modal de Pixels & UTMs */}
      {isTrackingModalOpen && tracking && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
        >
          <div 
            className="w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-main)' }}>Pixels &amp; UTMs</h2>

            {/* UTMify Pixel */}
            <div className="space-y-2">
              <label className="text-xs" style={{ color: 'var(--text-muted)' }}>
                UTMify Pixel Script{' '}
                {tracking.utmifyPixel?.found ? (
                  <span style={{ color: 'var(--success)' }}>(encontrado)</span>
                ) : (
                  <span style={{ color: 'var(--text-soft)' }}>(não encontrado no código)</span>
                )}
              </label>
              <textarea
                className="editor-input text-sm font-mono"
                value={tracking.utmifyPixel?.script || ''}
                onChange={(e) => {
                  const newScript = e.target.value
                  // Extrai o pixelId automaticamente do script editado
                  let extractedPixelId: string | null = null
                  if (newScript) {
                    const pixelIdMatch = newScript.match(/window\.pixelId\s*=\s*["']([^"']+)["']/i)
                    if (pixelIdMatch && pixelIdMatch[1]) {
                      extractedPixelId = pixelIdMatch[1]
                    }
                  }
                  
                  setTracking((prev) =>
                    prev
                      ? {
                          ...prev,
                          utmifyPixel: {
                            found: !!newScript,
                            pixelId: extractedPixelId,
                            script: newScript,
                          },
                        }
                      : prev
                  )
                }}
                placeholder="<script>window.pixelId = &quot;...&quot; ...</script>"
                rows={6}
                style={{
                  resize: 'vertical',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  lineHeight: '1.5',
                }}
              />
            </div>

            {/* Meta Pixel */}
            <div className="space-y-2">
              <label className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Meta Pixel ID{' '}
                {tracking.metaPixel?.found ? (
                  <span style={{ color: 'var(--success)' }}>(encontrado)</span>
                ) : (
                  <span style={{ color: 'var(--text-soft)' }}>(não encontrado no código)</span>
                )}
              </label>
              <input
                className="editor-input text-sm"
                value={tracking.metaPixel?.pixelId || ''}
                onChange={(e) =>
                  setTracking((prev) =>
                    prev
                      ? {
                          ...prev,
                          metaPixel: {
                            found: true,
                            pixelId: e.target.value,
                          },
                        }
                      : prev
                  )
                }
                placeholder="ex: 1367698035025270"
              />
            </div>

            {/* UTMify UTMs */}
            <div className="flex items-center gap-2">
              <input
                id="utmify-utms-enabled"
                type="checkbox"
                checked={!!tracking.utmifyUtms?.enabled}
                onChange={(e) =>
                  setTracking((prev) =>
                    prev
                      ? {
                          ...prev,
                          utmifyUtms: {
                            found: prev.utmifyUtms?.found ?? e.target.checked,
                            enabled: e.target.checked,
                          },
                        }
                      : prev
                  )
                }
                className="w-4 h-4 rounded border focus:ring-2"
                style={{
                  borderColor: 'var(--border-subtle)',
                  backgroundColor: 'var(--bg-input)',
                  accentColor: 'var(--gold)'
                }}
              />
              <label htmlFor="utmify-utms-enabled" className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Manter script de UTMs da UTMify na página
              </label>
            </div>

            <div 
              className="flex justify-end gap-3 pt-3"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              <button
                className="editor-btn-secondary px-3 py-2 text-xs"
                onClick={() => setIsTrackingModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                className="editor-btn-primary px-4 py-2 text-xs"
                onClick={applyTrackingChanges}
              >
                Aplicar &amp; voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ghost visual do bloco rápido durante drag */}
      {dragBlockKind && dragGhostPos && (
        <div
          className="fixed pointer-events-none z-[99999] px-3 py-1 rounded-full bg-[#F5C542]/90 text-black text-xs font-semibold shadow-lg"
          style={{
            left: dragGhostPos.x + 12,
            top: dragGhostPos.y + 12,
          }}
        >
          {dragBlockKind === 'h1' && 'Título (H1)'}
          {dragBlockKind === 'p' && 'Parágrafo'}
          {dragBlockKind === 'button' && 'Botão'}
          {dragBlockKind === 'img' && 'Imagem'}
        </div>
      )}
    </>
  )
}

