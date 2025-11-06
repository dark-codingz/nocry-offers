import * as React from 'react'

type OfferStatus =
  | 'Descartada'
  | 'Em análise'
  | 'Modelando'
  | 'Rodando'
  | 'Encerrada'

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  status?: OfferStatus
}

const statusColors: Record<OfferStatus, string> = {
  Descartada: 'bg-white/7 border border-[var(--nc-border)] text-white/60',
  'Em análise': 'bg-white/7 border border-[var(--nc-border)] text-white/80',
  Modelando: 'bg-white/7 border border-[var(--nc-border)] text-white/80',
  Rodando: 'bg-white/7 border border-[var(--nc-border)] text-white/80',
  Encerrada: 'bg-white/7 border border-[var(--nc-border)] text-white/60',
}

function Badge({ className = '', variant = 'default', status, children, ...props }: BadgeProps) {
  const baseStyles =
    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2'

  const variants = {
    default: 'border-transparent bg-[var(--nc-gold)] text-[#101216] hover:bg-[var(--nc-gold-press)]',
    secondary: 'border-transparent bg-[var(--muted)] text-[var(--nc-fg)] hover:bg-white/5',
    destructive:
      'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
    outline: 'text-[var(--nc-fg)] border-[var(--nc-border)] bg-transparent',
  }

  const statusStyle = status ? statusColors[status] : variants[variant]

  return (
    <div className={`${baseStyles} ${statusStyle} ${className}`} {...props}>
      {children}
    </div>
  )
}

export { Badge, type OfferStatus }

