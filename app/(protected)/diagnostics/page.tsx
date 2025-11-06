export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { getServerClient } from '@/lib/supabase/server'

export default async function DiagnosticsPage() {
  const supabase = await getServerClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()

  let orgInfo = null
  if (userData?.user) {
    const { data: orgData } = await supabase
      .schema('core')
      .from('user_orgs')
      .select('org_id')
      .eq('user_id', userData.user.id)
      .limit(1)
      .maybeSingle()
    orgInfo = orgData
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-4 text-2xl font-bold">Diagnóstico do Sistema</h1>
      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-2 font-semibold">Autenticação</h2>
          <pre className="text-sm">
            {JSON.stringify(
              {
                authenticated: !!userData?.user,
                userId: userData?.user?.id || null,
                email: userData?.user?.email || null,
                error: userError?.message || null,
              },
              null,
              2
            )}
          </pre>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-2 font-semibold">Organização</h2>
          <pre className="text-sm">
            {JSON.stringify(
              {
                orgId: orgInfo?.org_id || null,
                hasOrg: !!orgInfo?.org_id,
              },
              null,
              2
            )}
          </pre>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-2 font-semibold">Runtime</h2>
          <pre className="text-sm">
            {JSON.stringify(
              {
                runtime: 'nodejs',
                timestamp: new Date().toISOString(),
              },
              null,
              2
            )}
          </pre>
        </div>
      </div>
    </div>
  )
}

