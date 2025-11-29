'use client'

import type { OfferAdsSnapshot } from '@/lib/tracking/types'

interface AdsCountChartProps {
  snapshots: OfferAdsSnapshot[]
}

/**
 * Gráfico simples de linha mostrando evolução de ads_count ao longo do tempo
 * Usa SVG básico (sem dependências externas)
 */
export function AdsCountChart({ snapshots }: AdsCountChartProps) {
  if (snapshots.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-white/50">
        Nenhum snapshot ainda. Faça um refresh para começar a rastrear.
      </div>
    )
  }

  // Ordenar por data (mais antigo primeiro)
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime()
  )

  // Dimensões do gráfico
  const width = 800
  const height = 300
  const padding = { top: 20, right: 20, bottom: 40, left: 60 }

  // Calcular valores
  const maxCount = Math.max(...sorted.map((s) => s.ads_count), 1)
  const minCount = Math.min(...sorted.map((s) => s.ads_count), 0)
  const range = maxCount - minCount || 1

  // Função para mapear valor para coordenada Y
  const getY = (count: number) => {
    const normalized = (count - minCount) / range
    return padding.top + (height - padding.top - padding.bottom) * (1 - normalized)
  }

  // Função para mapear índice para coordenada X
  const getX = (index: number) => {
    const total = sorted.length - 1 || 1
    return padding.left + ((width - padding.left - padding.right) * index) / total
  }

  // Gerar pontos da linha
  const points = sorted
    .map((snapshot, index) => `${getX(index)},${getY(snapshot.ads_count)}`)
    .join(' ')

  // Formatar data para exibição
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} className="w-full h-auto">
        {/* Grid horizontal */}
        {[0, 1, 2, 3, 4].map((i) => {
          const y = padding.top + ((height - padding.top - padding.bottom) * i) / 4
          const value = Math.round(minCount + (range * (4 - i)) / 4)
          return (
            <g key={`grid-${i}`}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                fill="rgba(255,255,255,0.6)"
                fontSize="12"
                textAnchor="end"
              >
                {value}
              </text>
            </g>
          )
        })}

        {/* Linha do gráfico */}
        <polyline
          points={points}
          fill="none"
          stroke="#D4AF37"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Pontos */}
        {sorted.map((snapshot, index) => {
          const x = getX(index)
          const y = getY(snapshot.ads_count)
          return (
            <g key={snapshot.id}>
              <circle cx={x} cy={y} r="4" fill="#D4AF37" />
              <title>
                {formatDate(snapshot.taken_at)}: {snapshot.ads_count} anúncios
              </title>
            </g>
          )
        })}

        {/* Labels no eixo X (apenas alguns para não poluir) */}
        {sorted.map((snapshot, index) => {
          if (sorted.length <= 10 || index % Math.ceil(sorted.length / 10) === 0) {
            const x = getX(index)
            return (
              <text
                key={`label-${index}`}
                x={x}
                y={height - padding.bottom + 20}
                fill="rgba(255,255,255,0.6)"
                fontSize="10"
                textAnchor="middle"
              >
                {formatDate(snapshot.taken_at)}
              </text>
            )
          }
          return null
        })}
      </svg>
    </div>
  )
}

