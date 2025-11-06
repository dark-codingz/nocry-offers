'use client'

import * as React from 'react'
import { useUrlNormalizer } from '@/hooks/use-url-normalizer'

type UrlFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  setValue: (v: string) => void
  label?: React.ReactNode
  helperText?: string
  required?: boolean
}

export function UrlField({
  value,
  onChange,
  setValue,
  label,
  helperText,
  required,
  className = '',
  ...rest
}: UrlFieldProps) {
  const { onBlurNormalize } = useUrlNormalizer()

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm text-[var(--fg-dim)]">
          {typeof label === 'string' ? (
            <>
              {label} {required && <span className="text-red-400">*</span>}
            </>
          ) : (
            label
          )}
        </label>
      )}
      <input
        {...rest}
        value={value}
        onChange={onChange}
        onBlur={() => onBlurNormalize(value, setValue)}
        inputMode="url"
        autoComplete="url"
        placeholder={rest.placeholder || "ex.: facebook.com/ads/library/..."}
        className={[
          // Dark-friendly input
          'w-full rounded-xl',
          'bg-[var(--card-bg)] border border-[var(--border-color)]',
          'text-[var(--foreground)] placeholder:text-[color-mix(in_srgb,var(--fg-dim)_100%,transparent)]',
          'px-3 py-2 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)] focus:border-[var(--ring-color)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        ].join(' ')}
      />
      {helperText && <p className="text-xs text-[var(--fg-dim)]">{helperText}</p>}
    </div>
  )
}

