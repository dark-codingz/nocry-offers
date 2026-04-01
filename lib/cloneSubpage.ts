import { detectSpaFramework } from './detectSpaFramework'
import { createEditableStaticHtmlFromSpa } from './sanitizeSpaHtml'

export interface SubpageCloneResult {
  rawHtml: string
  editableHtml: string
  isSpaFramework: boolean
}

/**
 * Clona uma subpágina (fetch simples, sem baixar assets)
 * Usado para clonar subpáginas descobertas na página principal
 */
export async function cloneSubpage(url: string): Promise<SubpageCloneResult> {
  // Fetch da URL
  const response = await fetch(url, {
    headers: { 'User-Agent': 'NoCryCloneBot/1.0', Accept: 'text/html,*/*' },
    redirect: 'follow',
  })

  if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) {
    throw new Error(`Falha ao buscar subpágina (${response.status})`)
  }

  const html = await response.text()

  // Detectar se é SPA/Next.js/React
  const isSpaFramework = detectSpaFramework(html)

  // Gerar versão editável (sem scripts do framework) se for SPA
  const editableHtml = isSpaFramework ? createEditableStaticHtmlFromSpa(html) : html

  return {
    rawHtml: html,
    editableHtml,
    isSpaFramework,
  }
}






