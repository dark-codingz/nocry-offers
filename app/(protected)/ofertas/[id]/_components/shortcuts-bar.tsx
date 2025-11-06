'use client'

import type { Offer } from '@/lib/types'
import { motion } from 'framer-motion'

interface ShortcutsBarProps {
  offer: Offer
}

export function ShortcutsBar({ offer }: ShortcutsBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 }}
      className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5"
    >
      {/* País */}
      <motion.div
        whileHover={{ y: -2 }}
        className="nc-glass nc-card group relative rounded-2xl p-4 overflow-hidden"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--muted-bg)] border border-[var(--border-color)]">
            <svg
              className="h-5 w-5 text-[var(--gold)] drop-shadow-[0_0_12px_rgba(212,175,55,0.25)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-xs text-[var(--fg-dim)]">País</p>
            <p className="font-semibold text-[var(--fg)]">{offer.country}</p>
          </div>
        </div>
      </motion.div>

      {/* Nicho */}
      {offer.niche && (
        <motion.div
          whileHover={{ y: -2 }}
          className="nc-glass nc-card group relative rounded-2xl p-4 overflow-hidden"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--muted-bg)] border border-[var(--border-color)]">
              <svg
                className="h-5 w-5 text-[var(--fg-dim)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
            </div>
            <div className="flex-1">
            <p className="text-xs text-[var(--fg-dim)]">Nicho</p>
            <p className="font-semibold text-[var(--fg)]">{offer.niche}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Ad Library */}
      <motion.a
        href={offer.ad_library_url}
        target="_blank"
        rel="noopener noreferrer"
        whileHover={{ y: -2 }}
        className="nc-glass nc-card group relative rounded-2xl p-4 overflow-hidden"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--muted-bg)] border border-[var(--border-color)]">
            <svg
              className="h-5 w-5 text-[var(--fg-dim)]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-xs text-[var(--fg-dim)]">Ad Library</p>
            <p className="truncate font-semibold text-[var(--fg)] group-hover:text-[var(--gold)] transition-colors">
              Ver anúncios →
            </p>
          </div>
        </div>
        <motion.div
          className="absolute bottom-0 left-0 h-0.5 bg-[var(--gold)]"
          initial={{ width: 0 }}
          whileHover={{ width: '100%' }}
          transition={{ duration: 0.3 }}
        />
      </motion.a>

      {/* Funil Original */}
      <motion.a
        href={offer.original_funnel_url}
        target="_blank"
        rel="noopener noreferrer"
        whileHover={{ y: -2 }}
        className="nc-glass nc-card group relative rounded-2xl p-4 overflow-hidden"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--muted-bg)] border border-[var(--border-color)]">
            <svg
              className="h-5 w-5 text-[var(--fg-dim)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-xs text-[var(--fg-dim)]">Funil Original</p>
            <p className="truncate font-semibold text-[var(--fg)] group-hover:text-[var(--gold)] transition-colors">
              Ver funil →
            </p>
          </div>
        </div>
        <motion.div
          className="absolute bottom-0 left-0 h-0.5 bg-[var(--gold)]"
          initial={{ width: 0 }}
          whileHover={{ width: '100%' }}
          transition={{ duration: 0.3 }}
        />
      </motion.a>

      {/* Spy Tool (se existir) */}
      {offer.spy_tool_url && (
        <motion.a
          href={offer.spy_tool_url}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ y: -2 }}
          className="nc-glass nc-card group relative rounded-2xl p-4 overflow-hidden"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--muted-bg)] border border-[var(--border-color)]">
              <svg
                className="h-5 w-5 text-[var(--fg-dim)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <div className="flex-1">
            <p className="text-xs text-[var(--fg-dim)]">Spy Tool</p>
            <p className="truncate font-semibold text-[var(--fg)] group-hover:text-[var(--gold)] transition-colors">
              Ver spy →
            </p>
            </div>
          </div>
          <motion.div
            className="absolute bottom-0 left-0 h-0.5 bg-[var(--gold)]"
            initial={{ width: 0 }}
            whileHover={{ width: '100%' }}
            transition={{ duration: 0.3 }}
          />
        </motion.a>
      )}
    </motion.div>
  )
}

