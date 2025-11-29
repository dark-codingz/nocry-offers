'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useRef, useMemo } from 'react'
import { ArrowLeft, Save, Download, RotateCcw } from 'lucide-react'

// Helper para classes condicionais
function clsx(...args: (string | boolean | undefined | null)[]): string {
  return args.filter(Boolean).join(' ')
}

interface Clone {
  html: string
  original_url: string
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
}

type ElementKind = 'button' | 'badge' | 'link' | 'heading' | 'image' | 'text' | 'other'

type TrackingInfo = {
  utmifyPixel?: {
    found: boolean
    pixelId: string | null
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

  // srcDoc memoizado - não muda quando o modo de viewport muda
  const srcDoc = useMemo(() => {
    if (!clone) return ''
    return buildSrcDoc(clone.html)
  }, [clone?.html])

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
        setClone({ html: data.html, original_url: data.original_url })
      } catch (err) {
        console.error('[EDITOR] Load error:', err)
        setError(err instanceof Error ? err.message : 'Erro ao carregar clone')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  // Receber mensagens do iframe
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!event.data || typeof event.data !== 'object') return
      if (event.data.type === 'NCRY_SELECT_ELEMENT') {
        const { elementId, tagName, innerText, role, classList, styles, attributes } =
          event.data.payload || {}
        if (!elementId) return

        setSelectedElement({
          elementId,
          tagName,
          innerText: innerText || '',
          role: role || null,
          classList: classList || [],
          styles: styles || {},
        })

        // Se for imagem, captura src
        if (tagName.toLowerCase() === 'img' && attributes?.src) {
          setImageUrl(attributes.src)
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Classificar tipo de elemento
  function classifyElement(sel: SelectedElement | null): ElementKind {
    if (!sel) return 'other'
    const tag = sel.tagName.toLowerCase()
    const role = (sel.role || '').toLowerCase()
    const classes = (sel.classList || []).map((c) => c.toLowerCase())

    if (tag === 'img') return 'image'
    if (/^h[1-6]$/.test(tag)) return 'heading'

    // Detectar badges primeiro (antes de botões)
    if (
      classes.some((c) => c.includes('badge') || c.includes('pill') || c.includes('tag'))
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

    const scripts = Array.from(doc.querySelectorAll('script'))

    let utmifyPixelId: string | null = null
    let hasUtmifyPixel = false

    let hasUtmifyUtms = false
    let hasMetaPixel = false
    let metaPixelId: string | null = null

    // Detecta UTMify Pixel (window.pixelId + pixel.js)
    for (const s of scripts) {
      const text = s.textContent || ''
      if (text.includes('window.pixelId')) {
        const match = text.match(/window\.pixelId\s*=\s*["']([^"']+)["']/)
        if (match && match[1]) {
          utmifyPixelId = match[1]
          hasUtmifyPixel = true
        }
      }
    }

    // Detecta script de UTMs UTMify (src)
    for (const s of scripts) {
      const src = s.getAttribute('src') || ''
      if (src.includes('utmify.com.br/scripts/utms')) {
        hasUtmifyUtms = true
        break
      }
    }

    // Detecta Pixel Meta
    for (const s of scripts) {
      const text = s.textContent || ''
      if (text.includes("fbq('init'") || text.includes('fbq("init"')) {
        const match = text.match(/fbq\(['"]init['"]\s*,\s*['"](\d+)['"]\)/)
        if (match && match[1]) {
          metaPixelId = match[1]
          hasMetaPixel = true
        }
      }
    }

    setTracking({
      utmifyPixel: {
        found: hasUtmifyPixel,
        pixelId: utmifyPixelId,
      },
      utmifyUtms: {
        found: hasUtmifyUtms,
        enabled: hasUtmifyUtms,
      },
      metaPixel: {
        found: hasMetaPixel,
        pixelId: metaPixelId,
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
    const classes = (sel.classList || []).filter((c) => c.trim()).join('.')
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
            {presetColors.map((color) => (
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
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              IMG · Fonte atual:
              <span className="block break-all text-[10px] mt-1" style={{ color: 'var(--text-soft)' }}>
                {imageUrl || '(sem src)'}
              </span>
            </div>
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                URL da imagem
              </label>
              <input
                className="editor-input text-sm"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <button
              onClick={handleApplyImageUrl}
              className="editor-btn-primary w-full"
            >
              Aplicar imagem
            </button>
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
    if (!iframeRef.current || !selectedElement || !imageUrl) return
    
    scheduleSnapshot()
    
    const win = iframeRef.current.contentWindow
    if (!win) return
    win.postMessage(
      {
        type: 'NCRY_UPDATE_IMAGE_SRC',
        payload: {
          elementId: selectedElement.elementId,
          src: imageUrl,
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

    // Atualiza UTMify Pixel ID
    if (tracking.utmifyPixel?.pixelId) {
      for (const s of scripts) {
        const text = s.textContent || ''
        if (text.includes('window.pixelId')) {
          const newText = text.replace(
            /window\.pixelId\s*=\s*["']([^"']+)["']/,
            `window.pixelId = "${tracking.utmifyPixel.pixelId}"`
          )
          s.textContent = newText
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
    if (!iframeRef.current) return

    try {
      setSaving(true)
      setError(null)
      setSuccessMessage(null)

      const doc = iframeRef.current.contentDocument
      if (!doc) {
        throw new Error('Não foi possível acessar o documento')
      }

      const newHtml = doc.documentElement.outerHTML

      // 1. Salvar no banco
      const saveRes = await fetch(`/api/clones/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: newHtml }),
      })

      if (!saveRes.ok) {
        const data = await saveRes.json()
        throw new Error(data.error || 'Falha ao salvar')
      }

      // 2. Baixar ZIP
      const zipRes = await fetch(`/api/clones/${id}/zip`, {
        method: 'POST',
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
  function buildSrcDoc(html: string) {
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
        let nocryDragBar = null;
        let nocryDropLine = null;
        let nocryIsDragging = false;
        let nocryDragSourceEl = null;
        let nocryCurrentDropTarget = null;
        let nocryCurrentDropPosition = null;
        let nocrySavedRange = null;

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
          el.style.outline = '2px solid #FACC15';
          el.style.cursor = 'pointer';
        }

        function unhighlight(el) {
          if (!el) return;
          el.style.outline = '';
        }

        function isButtonLike(el) {
          if (!el) return false;
          const tag = el.tagName.toLowerCase();
          const role = (el.getAttribute('role') || '').toLowerCase();
          const classes = Array.from(el.classList || []).map((c) => c.toLowerCase());

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

        function findEditableRoot(target) {
          let el = target;
          while (el && el !== document.body) {
            const tag = el.tagName.toLowerCase();
            const role = (el.getAttribute('role') || '').toLowerCase();
            const classes = Array.from(el.classList || []).map(c => c.toLowerCase());

            // 1) Botões / badges (como já estava)
            if (isButtonLike(el)) return el;

            // 2) Elementos de texto "puro" que queremos editar diretamente
            if (
              /^h[1-6]$/.test(tag) ||
              tag === 'p' ||
              tag === 'span' ||
              tag === 'strong' ||
              tag === 'em'
            ) {
              return el;
            }

            el = el.parentElement;
          }
          return target;
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

        // Drag bar functions
        function ensureDragBar() {
          if (!nocryDragBar) {
            nocryDragBar = document.createElement('div');
            nocryDragBar.id = 'nocry-drag-bar';
            nocryDragBar.style.position = 'absolute';
            nocryDragBar.style.height = '6px';
            nocryDragBar.style.borderRadius = '999px';
            nocryDragBar.style.background = 'rgba(250, 204, 21, 0.95)';
            nocryDragBar.style.cursor = 'grab';
            nocryDragBar.style.zIndex = '999999';
            nocryDragBar.style.boxShadow = '0 0 8px rgba(0,0,0,0.6)';
            nocryDragBar.style.transform = 'translateY(-8px)';
            nocryDragBar.style.pointerEvents = 'auto';
            document.body.appendChild(nocryDragBar);
            nocryDragBar.addEventListener('mousedown', handleDragBarMouseDown);
          }
        }

        function positionDragBar() {
          if (!nocrySelectedEl || !nocryDragBar) return;
          const rect = nocrySelectedEl.getBoundingClientRect();
          nocryDragBar.style.width = rect.width + 'px';
          nocryDragBar.style.left = (window.scrollX + rect.left) + 'px';
          nocryDragBar.style.top = (window.scrollY + rect.top) + 'px';
          nocryDragBar.style.display = 'block';
        }

        function hideDragBar() {
          if (nocryDragBar) {
            nocryDragBar.style.display = 'none';
          }
        }

        function updateSelectedElement(root) {
          nocrySelectedEl = root;
          ensureDragBar();
          positionDragBar();
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

        function handleDragBarMouseDown(e) {
          e.preventDefault();
          e.stopPropagation();
          if (!nocrySelectedEl) return;

          nocryIsDragging = true;
          nocryDragSourceEl = nocrySelectedEl;
          document.body.classList.add('nocry-dragging');
          if (nocryDragBar) {
            nocryDragBar.style.cursor = 'grabbing';
          }

          window.addEventListener('mousemove', handleDragMouseMove);
          window.addEventListener('mouseup', handleDragMouseUp);
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
          document.body.classList.remove('nocry-dragging');
          if (nocryDragBar) {
            nocryDragBar.style.cursor = 'grab';
          }

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

            // Atualiza barra de drag para nova posição
            positionDragBar();

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

          document.body.addEventListener('mouseover', function(e) {
            const target = e.target;
            if (!(target instanceof HTMLElement)) return;
            highlight(target);
          }, true);

          document.body.addEventListener('mouseout', function(e) {
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

          // Clique: seleciona elemento (busca root editável)
          document.body.addEventListener('click', function(e) {
            // Ignora cliques na drag bar
            if (e.target === nocryDragBar) return;
            
            e.preventDefault();
            e.stopPropagation();
            const target = e.target;
            if (!(target instanceof HTMLElement)) return;

            const root = findEditableRoot(target);

            // PROTEÇÃO: não permitir editar BODY/HTML
            if (!root || root === document.body || root === document.documentElement) {
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
            const target = e.target;
            if (!(target instanceof HTMLElement)) return;
            target.contentEditable = 'true';
            target.focus();
          }, true);

          // Scroll e resize: atualiza posição da drag bar
          window.addEventListener('scroll', function() {
            positionDragBar();
          });
          window.addEventListener('resize', function() {
            positionDragBar();
          });

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
              const { elementId, src } = data.payload || {};
              if (!elementId || !src) return;
              const el = document.querySelector('[data-nocry-id="' + elementId + '"]');
              if (el && el.tagName.toLowerCase() === 'img') {
                el.setAttribute('src', src);
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
    let result = html
    
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

          {/* Centro: viewport toggle + undo */}
          <div className="flex items-center gap-3">
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

                    {/* Botão remover elemento */}
                    <button
                      onClick={handleRemoveElement}
                      className="w-full mt-4 py-2.5 rounded-lg border transition-all duration-150 text-xs font-medium"
                      style={{
                        borderColor: '#7F1D1D',
                        backgroundColor: '#3F1518',
                        color: '#FCA5A5'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#4A1B20'
                        e.currentTarget.style.borderColor = '#F87171'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#3F1518'
                        e.currentTarget.style.borderColor = '#7F1D1D'
                      }}
                    >
                      Remover elemento
                    </button>
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
                UTMify Pixel ID{' '}
                {tracking.utmifyPixel?.found ? (
                  <span style={{ color: 'var(--success)' }}>(encontrado)</span>
                ) : (
                  <span style={{ color: 'var(--text-soft)' }}>(não encontrado no código)</span>
                )}
              </label>
              <input
                className="editor-input text-sm"
                value={tracking.utmifyPixel?.pixelId || ''}
                onChange={(e) =>
                  setTracking((prev) =>
                    prev
                      ? {
                          ...prev,
                          utmifyPixel: {
                            found: true,
                            pixelId: e.target.value,
                          },
                        }
                      : prev
                  )
                }
                placeholder="ex: 68dfd7c9b20d2dfa8bab49d7"
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

