'use client'

import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { VisibilityChip } from '@/components/ui/visibility-chip'
import Link from 'next/link'
import type { OfferStatus } from '@/components/ui/badge'

type Visibility = 'org' | 'private'

interface OfferHeroClientProps {
  title: string
  status: OfferStatus
  visibility: Visibility
}

export function OfferHeroClient({ title, status, visibility }: OfferHeroClientProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="mb-6 flex items-center justify-between"
    >
      <div className="space-y-3">
            <h1 className="section-title text-3xl tracking-wide text-[var(--fg)]">{title}</h1>
        <div className="flex items-center gap-2">
          <Badge status={status}>{status}</Badge>
          <VisibilityChip visibility={visibility} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/ofertas" className="btn btn-ghost">
          ← Voltar
        </Link>
      </div>
    </motion.div>
  )
}

