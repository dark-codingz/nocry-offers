import { ToastProvider } from '@/hooks/use-toast'

export default function OfertasLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {/* Layout full-bleed - sem containers centralizados */}
      <div className="min-h-screen w-full max-w-full">
        <main>{children}</main>
      </div>
    </ToastProvider>
  )
}
