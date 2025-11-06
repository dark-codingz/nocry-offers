import { Button } from './button'
import Link from 'next/link'

interface EmptyStateProps {
  title: string
  description?: string
  action?: {
    label: string
    href: string
    onClick?: () => void
  }
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted p-8 text-center">
      <div className="mb-4 text-6xl opacity-20">📋</div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
      {description && <p className="mb-6 text-sm text-gray-600">{description}</p>}
      {action && (
        action.onClick ? (
          <Button onClick={action.onClick}>{action.label}</Button>
        ) : (
          <Link href={action.href}>
            <Button>{action.label}</Button>
          </Link>
        )
      )}
    </div>
  )
}

