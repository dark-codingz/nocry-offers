/**
 * Normaliza uma URL adicionando https:// se necessário
 * Aceita valores sem protocolo e normaliza para https://
 * @param input - String da URL digitada pelo usuário (pode ser null/undefined)
 * @returns URL normalizada com https:// ou undefined se vazio
 */
export function normalizeUrl(input?: string | null): string | undefined {
  if (!input) return undefined
  let url = input.trim()

  // Ignorar javascript: e dados vazios
  if (!url) return undefined

  // Se começar com // (protocol-relative), force https:
  if (url.startsWith('//')) url = 'https:' + url

  // Se não tiver protocolo, adiciona https://
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(url)) {
    url = 'https://' + url
  }

  try {
    // Normaliza e remove espaços/fragmentos irrelevantes
    const u = new URL(url)
    // Opcional: força https (se vier http, sobe p/ https)
    if (u.protocol === 'http:') u.protocol = 'https:'
    // remove whitespace around pathname/search/hash
    u.pathname = u.pathname.replace(/\s+/g, '%20')
    return u.toString()
  } catch {
    // Se ainda assim for inválido, retorne string com https adicionado
    return url
  }
}

/**
 * Verifica se uma string parece ser uma URL válida
 * @param raw - String a ser verificada
 * @returns true se for uma URL válida
 */
export function isLikelyUrl(raw: string | undefined): boolean {
  try {
    // Permite domínio simples (sem esquema) também
    const candidate = normalizeUrl(raw)
    if (!candidate) return false
    new URL(candidate)
    return true
  } catch {
    return false
  }
}
