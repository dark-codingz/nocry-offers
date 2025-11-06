export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getServerClient } from '@/lib/supabase/server'
import { Toaster } from 'sonner'
import { StorageDiagnostics } from '@/components/storage-diagnostics'
import AppNav from './AppNav'

/**
 * Layout protegido via Server Component.
 * Todas as rotas dentro de (protected) exigem autenticação.
 */
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await getServerClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data?.user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen text-white w-full max-w-full overflow-x-hidden" style={{ backgroundColor: 'var(--bg)' }}>
      <StorageDiagnostics />
      <AppNav>
        <main className="w-full max-w-full lg:pl-[var(--rail-w-collapsed)] pb-16 lg:pb-0" style={{ minHeight: '100dvh' }}>
          {children}
        </main>
      </AppNav>
      <Toaster
        position="top-right"
        theme="dark"
        toastOptions={{
          style: {
            background: 'rgba(20, 20, 25, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(12px)',
          },
        }}
      />
    </div>
  )
}


