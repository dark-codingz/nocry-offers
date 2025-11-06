import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function getServerClient() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set() {},
        remove() {},
      },
    }
  )
  return supabase
}

// Alias para compatibilidade com código existente
export async function createClient() {
  return getServerClient()
}
