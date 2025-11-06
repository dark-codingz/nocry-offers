/**
 * Tipos de referência de Storage
 */
export type StorageRef =
  | { kind: 'public'; url: string; bucket: string; path: string }
  | { kind: 'signed'; url: string }
  | { kind: 'external'; url: string }

/**
 * Analisa uma URL e identifica se é pública, assinada ou externa
 */
export function parseStorageRef(rawUrl: string): StorageRef {
  const u = (rawUrl || '').trim()

  if (!u) return { kind: 'external', url: '' }

  // Public: .../storage/v1/object/public/<bucket>/<path>
  const pubMatch = u.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/)
  if (pubMatch && pubMatch[1] && pubMatch[2]) {
    return {
      kind: 'public',
      url: u,
      bucket: pubMatch[1],
      path: pubMatch[2],
    }
  }

  // Signed: .../storage/v1/object/sign/<bucket>/<path>?token=...
  const signedMatch = u.match(/\/storage\/v1\/object\/sign\/([^/]+)\/(.+)\?token=/)
  if (signedMatch) {
    return { kind: 'signed', url: u }
  }

  // Path simples no formato bucket::path (ex: offers-files::offerId/category/file.ext)
  const pathMatch = u.match(/^([^:]+)::(.+)$/)
  if (pathMatch && pathMatch[1] && pathMatch[2]) {
    return {
      kind: 'public', // Trataremos como público que precisa de signed
      url: u,
      bucket: pathMatch[1],
      path: pathMatch[2],
    }
  }

  // External ou qualquer outra origem
  return { kind: 'external', url: u }
}

