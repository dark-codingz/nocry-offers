import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900">404</h1>
        <p className="mt-4 text-xl text-gray-600">Página não encontrada</p>
        <p className="mt-2 text-gray-500">A página que você está procurando não existe.</p>
        <Link href="/ofertas" className="mt-8 inline-block">
          <Button>Voltar para Ofertas</Button>
        </Link>
      </div>
    </div>
  )
}

