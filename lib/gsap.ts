import { gsap } from 'gsap'

/**
 * GSAP helpers para animações NoCry
 * Respeita prefers-reduced-motion
 */
export const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Timeline curta com ease padrão
 */
export function createTimeline(vars?: gsap.TimelineVars) {
  const tl = gsap.timeline({
    ease: 'power2.out',
    duration: prefersReducedMotion() ? 0.01 : vars?.duration || 0.6,
    ...vars,
  })
  return tl
}

/**
 * Stagger animado para listas
 */
export function staggerReveal(
  selector: string,
  vars?: {
    delay?: number
    stagger?: number
    from?: 'start' | 'end' | 'center' | 'random'
  }
) {
  if (prefersReducedMotion()) return

  const { delay = 0, stagger = 0.06, from = 'start' } = vars || {}

  return gsap.from(selector, {
    opacity: 0,
    y: 20,
    duration: 0.5,
    stagger: {
      each: stagger,
      from,
    },
    delay,
    ease: 'power2.out',
  })
}

/**
 * Highlight animado (border glow)
 */
export function animateBorderGlow(
  element: HTMLElement,
  colors: { from: string; to: string } = {
    from: '#7DF9FF',
    to: '#D4AF37',
  }
) {
  if (prefersReducedMotion()) return

  const glow = gsap.to(element, {
    boxShadow: `0 0 0 1px ${colors.from}, 0 0 20px ${colors.from}40`,
    duration: 0.35,
    ease: 'power2.out',
  })

  const transition = gsap.to(element, {
    boxShadow: `0 0 0 1px ${colors.to}, 0 0 20px ${colors.to}40`,
    duration: 0.35,
    ease: 'power2.inOut',
  })

  return { glow, transition }
}

/**
 * Count-up animado
 */
export function countUp(
  element: HTMLElement,
  target: number,
  duration: number = 1
) {
  if (prefersReducedMotion()) {
    element.textContent = String(target)
    return
  }

  const obj = { value: 0 }
  gsap.to(obj, {
    value: target,
    duration,
    ease: 'power2.out',
    onUpdate: () => {
      element.textContent = Math.round(obj.value).toLocaleString()
    },
  })
}

/**
 * Ripple effect discreto
 */
export function createRipple(event: MouseEvent, element: HTMLElement) {
  if (prefersReducedMotion()) return

  const ripple = document.createElement('span')
  const rect = element.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height)
  const x = event.clientX - rect.left - size / 2
  const y = event.clientY - rect.top - size / 2

  ripple.style.cssText = `
    position: absolute;
    width: ${size}px;
    height: ${size}px;
    left: ${x}px;
    top: ${y}px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(125,249,255,0.3) 0%, transparent 70%);
    pointer-events: none;
    transform: scale(0);
    opacity: 1;
  `

  element.style.position = 'relative'
  element.style.overflow = 'hidden'
  element.appendChild(ripple)

  gsap.to(ripple, {
    scale: 2,
    opacity: 0,
    duration: 0.6,
    ease: 'power2.out',
    onComplete: () => ripple.remove(),
  })
}

