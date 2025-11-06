import { type NextRequest } from 'next/server'

/**
 * Middleware desabilitado - proteção de rotas movida para Server Components/Layouts.
 * Isso resolve erros de "fetch failed" com @supabase/auth-js no middleware.
 */
export async function middleware(request: NextRequest) {
  // Sem lógica de autenticação - proteção via (protected)/layout.tsx
  return
}

export const config = {
  matcher: [],
}

