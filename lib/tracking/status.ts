/**
 * Helper para calcular status de uma oferta rastreada baseado no histórico de snapshots
 */

export type TrackingStatus =
  | 'RECEM_LANCADA'
  | 'COMECANDO_A_ESCALAR'
  | 'ESCALANDO_FORTE'
  | 'POSSIVEL_PAUSA'
  | 'ESTAVEL'

export interface Snapshot {
  ads_count: number
  taken_at: string
}

/**
 * Calcula o status de uma oferta baseado no histórico de snapshots
 */
export function calculateTrackingStatus(snapshots: Snapshot[]): TrackingStatus {
  if (snapshots.length === 0) {
    return 'RECEM_LANCADA'
  }

  // Ordenar por data (mais recente primeiro)
  const sorted = [...snapshots].sort(
    (a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime()
  )

  const current = sorted[0]
  const prev = sorted[1]

  // Se não tem snapshot atual, é recém-lançada
  if (!current) {
    return 'RECEM_LANCADA'
  }

  // Se não tem histórico anterior, é recém-lançada
  if (!prev) {
    return 'RECEM_LANCADA'
  }

  // Se caiu para 0, possível pausa
  if (current.ads_count === 0 && prev.ads_count > 0) {
    return 'POSSIVEL_PAUSA'
  }

  const delta = current.ads_count - prev.ads_count

  // Escalando forte: >= 20 anúncios e delta >= 5
  if (current.ads_count >= 20 && delta >= 5) {
    return 'ESCALANDO_FORTE'
  }

  // Começando a escalar: >= 10 anúncios e delta >= 3
  if (current.ads_count >= 10 && delta >= 3) {
    return 'COMECANDO_A_ESCALAR'
  }

  // Caso contrário, estável
  return 'ESTAVEL'
}

/**
 * Retorna label em português para o status
 */
export function getStatusLabel(status: TrackingStatus): string {
  const labels: Record<TrackingStatus, string> = {
    RECEM_LANCADA: 'Recém-lançada',
    COMECANDO_A_ESCALAR: 'Começando a escalar',
    ESCALANDO_FORTE: 'Escalando forte',
    POSSIVEL_PAUSA: 'Possível pausa',
    ESTAVEL: 'Estável',
  }
  return labels[status]
}

/**
 * Retorna cor/tema para o status (para uso em chips/badges)
 */
export function getStatusColor(status: TrackingStatus): {
  bg: string
  text: string
  border: string
} {
  const colors: Record<TrackingStatus, { bg: string; text: string; border: string }> = {
    RECEM_LANCADA: {
      bg: 'bg-blue-500/20',
      text: 'text-blue-400',
      border: 'border-blue-500/40',
    },
    COMECANDO_A_ESCALAR: {
      bg: 'bg-yellow-500/20',
      text: 'text-yellow-400',
      border: 'border-yellow-500/40',
    },
    ESCALANDO_FORTE: {
      bg: 'bg-green-500/20',
      text: 'text-green-400',
      border: 'border-green-500/40',
    },
    POSSIVEL_PAUSA: {
      bg: 'bg-red-500/20',
      text: 'text-red-400',
      border: 'border-red-500/40',
    },
    ESTAVEL: {
      bg: 'bg-gray-500/20',
      text: 'text-gray-400',
      border: 'border-gray-500/40',
    },
  }
  return colors[status]
}

