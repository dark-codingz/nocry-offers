'use client'

import { Loader2 } from 'lucide-react'

interface CreativeCardSkeletonProps {
  name: string
  progress: number
  error?: string
  onRetry?: () => void
  onCancel?: () => void
}

export function CreativeCardSkeleton({
  name,
  progress,
  error,
  onRetry,
  onCancel,
}: CreativeCardSkeletonProps) {
  return (
    <div className="relative flex flex-col overflow-hidden rounded-2xl border border-white/15 bg-white/8 shadow-lg backdrop-blur-xl">
      {/* Thumbnail Placeholder */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-white/5">
        <div className="flex h-full flex-col items-center justify-center">
          {error ? (
            <div className="text-center">
              <div className="text-4xl">⚠️</div>
              <p className="mt-2 text-xs text-red-300">{error}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="mt-3 rounded-lg bg-white/10 px-3 py-1 text-xs text-white/90 hover:bg-white/20"
                >
                  Tentar novamente
                </button>
              )}
            </div>
          ) : (
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#F5C542]" />
              <div className="mt-3 w-32">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-[#F5C542] to-[#FFD36A] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-white/60">{progress}%</p>
              </div>
            </div>
          )}
        </div>

        {/* Cancel button */}
        {!error && onCancel && (
          <button
            onClick={onCancel}
            className="absolute right-2 top-2 rounded-lg bg-black/60 p-1.5 text-white/70 backdrop-blur-sm hover:bg-black/80 hover:text-white"
            title="Cancelar"
          >
            ✕
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="h-4 animate-pulse rounded bg-white/10">
          <span className="sr-only">{name}</span>
        </div>
        <div className="mt-2 h-3 w-16 animate-pulse rounded bg-white/5" />
      </div>
    </div>
  )
}



