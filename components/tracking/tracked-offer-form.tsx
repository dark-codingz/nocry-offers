'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import type { CreateOfferTrackedData, UpdateOfferTrackedData, OfferTracked } from '@/lib/tracking/types'

interface TrackedOfferFormProps {
  offer?: OfferTracked | null
  onSubmit: (data: CreateOfferTrackedData | UpdateOfferTrackedData) => Promise<void>
  onCancel: () => void
}

type FormData = CreateOfferTrackedData | UpdateOfferTrackedData

const COUNTRIES = ['BR', 'US', 'MX', 'AR', 'CO', 'CL', 'PE', 'ES', 'PT', 'FR', 'DE', 'IT', 'GB']

export function TrackedOfferForm({ offer, onSubmit, onCancel }: TrackedOfferFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: offer?.name || '',
    niche: offer?.niche || '',
    country: offer?.country || 'BR',
    ads_library_url: offer?.ads_library_url || '',
    landing_page_url: offer?.landing_page_url || '',
    notes: offer?.notes || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Se estiver editando, enviar como UpdateOfferTrackedData (campos opcionais)
      // Se estiver criando, enviar como CreateOfferTrackedData (campos obrigatórios)
      const data: FormData = offer
        ? {
            name: formData.name || undefined,
            niche: formData.niche || undefined,
            country: formData.country || undefined,
            ads_library_url: formData.ads_library_url || undefined,
            landing_page_url: formData.landing_page_url || undefined,
            notes: formData.notes || undefined,
          }
        : {
            name: formData.name,
            niche: formData.niche || undefined,
            country: formData.country,
            ads_library_url: formData.ads_library_url,
            landing_page_url: formData.landing_page_url || undefined,
            notes: formData.notes || undefined,
          }
      await onSubmit(data)
    } catch (error: any) {
      console.error('Erro ao salvar:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome da oferta *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: ZonaBlitz – BR – Renda Extra"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="country">País *</Label>
          <Select
            id="country"
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            required
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="niche">Nicho</Label>
          <Input
            id="niche"
            value={formData.niche}
            onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
            placeholder="Ex: Renda extra, Emagrecimento"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="ads_library_url">URL da Ads Library *</Label>
        <Input
          id="ads_library_url"
          type="url"
          value={formData.ads_library_url}
          onChange={(e) => setFormData({ ...formData, ads_library_url: e.target.value })}
          placeholder="https://www.facebook.com/ads/library/..."
          required
        />
      </div>

      <div>
        <Label htmlFor="landing_page_url">URL da Landing Page</Label>
        <Input
          id="landing_page_url"
          type="url"
          value={formData.landing_page_url}
          onChange={(e) => setFormData({ ...formData, landing_page_url: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <div>
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Observações sobre esta oferta..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" variant="gold" disabled={loading}>
          {loading ? 'Salvando...' : offer ? 'Atualizar' : 'Criar'}
        </Button>
      </div>
    </form>
  )
}

