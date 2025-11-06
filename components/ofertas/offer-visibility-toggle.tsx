'use client'

import { useTransition } from 'react'
import { updateOfferVisibility } from '@/app/(protected)/ofertas/actions'
import { toast } from 'sonner'
import { getBrowserClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

interface OfferVisibilityToggleProps {
  offerId: string
  current: 'org' | 'private'
  ownerUserId: string
}

export function OfferVisibilityToggle({ offerId, current, ownerUserId }: OfferVisibilityToggleProps) {
  const [pending, startTransition] = useTransition()
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    const checkOwner = async () => {
      const supabase = getBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      setIsOwner(user?.id === ownerUserId)
    }
    checkOwner()
  }, [ownerUserId])

  const setVis = (v: 'org' | 'private') => {
    startTransition(async () => {
      const res = await updateOfferVisibility(offerId, v)
      if (res.ok) {
        toast.success('Visibilidade atualizada')
      } else {
        toast.error(res.error || 'Erro ao atualizar visibilidade')
      }
    })
  }

  if (!isOwner) return null

  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-sm text-[var(--fg-dim)]">Visibilidade:</span>
      <div className="inline-flex rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-1">
        <button
          className={`px-3 py-1 rounded-lg text-sm transition-colors ${
            current === 'org'
              ? 'bg-[var(--surface)] border border-[color-mix(in_srgb,var(--gold)_35%,var(--border))] text-[var(--fg)]'
              : 'text-[var(--fg-dim)] hover:text-[var(--fg)]'
          }`}
          onClick={() => setVis('org')}
          disabled={pending}
        >
          NoCry (Geral)
        </button>
        <button
          className={`px-3 py-1 rounded-lg text-sm transition-colors ${
            current === 'private'
              ? 'bg-[var(--surface)] border border-[color-mix(in_srgb,var(--gold)_35%,var(--border))] text-[var(--fg)]'
              : 'text-[var(--fg-dim)] hover:text-[var(--fg)]'
          }`}
          onClick={() => setVis('private')}
          disabled={pending}
        >
          Apenas para mim
        </button>
      </div>
    </div>
  )
}

