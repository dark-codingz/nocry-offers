import * as React from 'react'

type Visibility = 'org' | 'private'

interface VisibilityChipProps {
  visibility: Visibility
  className?: string
}

const visibilityLabels: Record<Visibility, string> = {
  org: 'NoCry (Geral)',
  private: 'Apenas para mim',
}

const visibilityColors: Record<Visibility, string> = {
  org: 'bg-transparent text-[var(--gold)] border border-[color-mix(in_srgb,var(--gold)_55%,transparent)]',
  private: 'bg-[var(--muted-bg)] border border-[var(--border-color)] text-[var(--fg-dim)]',
}

export function VisibilityChip({ visibility, className = '' }: VisibilityChipProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${visibilityColors[visibility]} ${className}`}
    >
      {visibilityLabels[visibility]}
    </span>
  )
}




