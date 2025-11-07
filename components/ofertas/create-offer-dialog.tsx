'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createOffer } from '@/app/(protected)/ofertas/new/actions'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { UrlField } from '@/components/form/url-field'

interface CreateOfferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateOfferDialog({ open, onOpenChange }: CreateOfferDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    country: '',
    niche: '',
    ad_library_url: '',
    original_funnel_url: '',
    spy_tool_url: '',
    visibility: 'org' as 'org' | 'private',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // URLs já são normalizadas pelo schema Zod e pelo UrlField onBlur
    const payload = {
      ...form,
      niche: form.niche || null,
      spy_tool_url: form.spy_tool_url || undefined,
      notes: form.notes || null,
    }

    // Validação leve no cliente
    if (!payload.name || !payload.country) {
      setError('Nome e País são obrigatórios')
      setLoading(false)
      return
    }

    try {
      const result = await createOffer(payload)

      if (result?.ok) {
        // Sucesso - resetar form, fechar modal e atualizar board
        setForm({
          name: '',
          country: '',
          niche: '',
          ad_library_url: '',
          original_funnel_url: '',
          spy_tool_url: '',
          visibility: 'org',
          notes: '',
        })
        onOpenChange(false)
        router.refresh()
      } else {
        setError(result?.error || 'Não foi possível criar a oferta')
      }
    } catch (err) {
      console.error('Erro ao criar oferta:', err)
      setError('Erro inesperado ao criar a oferta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Oferta</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Nome */}
            <label className="space-y-1">
              <span className="text-sm text-[var(--fg-dim)]">
                Nome <span className="text-red-400">*</span>
              </span>
              <Input
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] px-3 py-2 text-[var(--foreground)] placeholder:text-[color-mix(in_srgb,var(--fg-dim)_100%,transparent)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)] focus:border-[var(--ring-color)]"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nome da oferta"
                disabled={loading}
              />
            </label>

            {/* País */}
            <label className="space-y-1">
              <span className="text-sm text-[var(--fg-dim)]">
                País <span className="text-red-400">*</span>
              </span>
              <Input
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] px-3 py-2 text-[var(--foreground)] placeholder:text-[color-mix(in_srgb,var(--fg-dim)_100%,transparent)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)] focus:border-[var(--ring-color)]"
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                placeholder="ex: Brasil, EUA"
                disabled={loading}
              />
            </label>

            {/* Nicho */}
            <label className="space-y-1">
              <span className="text-sm text-[var(--fg-dim)]">Nicho</span>
              <Input
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] px-3 py-2 text-[var(--foreground)] placeholder:text-[color-mix(in_srgb,var(--fg-dim)_100%,transparent)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)] focus:border-[var(--ring-color)]"
                value={form.niche}
                onChange={(e) => setForm((f) => ({ ...f, niche: e.target.value }))}
                placeholder="ex: Saúde, Finanças"
                disabled={loading}
              />
            </label>

            {/* Ad Library URL */}
            <div className="md:col-span-2">
              <UrlField
                label="Ad Library URL"
                value={form.ad_library_url}
                onChange={(e) => setForm((f) => ({ ...f, ad_library_url: e.target.value }))}
                setValue={(v) => setForm((f) => ({ ...f, ad_library_url: v }))}
                placeholder="facebook.com/ads/library..."
                disabled={loading}
                required
              />
            </div>

            {/* Funil Original URL */}
            <div className="md:col-span-2">
              <UrlField
                label="Funil Original URL"
                value={form.original_funnel_url}
                onChange={(e) => setForm((f) => ({ ...f, original_funnel_url: e.target.value }))}
                setValue={(v) => setForm((f) => ({ ...f, original_funnel_url: v }))}
                placeholder="exemplo.com/produto"
                disabled={loading}
                required
              />
            </div>

            {/* Spy Tool URL */}
            <div className="md:col-span-2">
              <UrlField
                label="Link adsparo (opcional)"
                value={form.spy_tool_url}
                onChange={(e) => setForm((f) => ({ ...f, spy_tool_url: e.target.value }))}
                setValue={(v) => setForm((f) => ({ ...f, spy_tool_url: v }))}
                placeholder="adsparo.com/... (opcional)"
                disabled={loading}
              />
            </div>

            {/* Visibilidade */}
            <label className="space-y-1">
              <span className="text-sm text-[var(--fg-dim)]">
                Visibilidade <span className="text-red-400">*</span>
              </span>
              <Select
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] px-3 py-2 text-[var(--foreground)] placeholder:text-[color-mix(in_srgb,var(--fg-dim)_100%,transparent)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)] focus:border-[var(--ring-color)] disabled:cursor-not-allowed disabled:opacity-50"
                value={form.visibility}
                onChange={(e) =>
                  setForm((f) => ({ ...f, visibility: e.target.value as 'org' | 'private' }))
                }
                disabled={loading}
              >
                <option value="org">NoCry (Geral)</option>
                <option value="private">Apenas para mim</option>
              </Select>
            </label>
          </div>

          {/* Notas */}
          <label className="space-y-1">
            <span className="text-sm text-[var(--fg-dim)]">Notas</span>
            <Textarea
              className="min-h-24 w-full rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] px-3 py-2 text-[var(--foreground)] placeholder:text-[color-mix(in_srgb,var(--fg-dim)_100%,transparent)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)] focus:border-[var(--ring-color)]"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Observações sobre a oferta"
              rows={3}
              disabled={loading}
            />
          </label>

          {error && (
            <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 transition hover:bg-white/10"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-gradient-to-r from-[#FFD36A] to-[#F5C542] px-5 py-2 font-semibold text-[#1f1f1f] shadow-[0_10px_30px_-12px_rgba(245,196,66,0.45)] transition hover:brightness-[1.03] disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar Oferta'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
