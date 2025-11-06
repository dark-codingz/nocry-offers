export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { getServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function UploadDiagnosticsPage() {
  const supabase = await getServerClient()

  // Verificar autenticação
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Tentar listar buckets (só funciona se RLS permitir)
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

  // Verificar se bucket offers-files existe
  let bucketExists = false
  let bucketInfo: any = null

  if (buckets) {
    bucketInfo = buckets.find((b: any) => b.name === 'offers-files')
    bucketExists = !!bucketInfo
  }

  // Verificar Storage RLS policies (através de tentativa de listar)
  let storageAccessible = false
  let storageError = null

  try {
    const { data: files, error: listError } = await supabase.storage
      .from('offers-files')
      .list('', { limit: 1 })

    if (!listError) {
      storageAccessible = true
    } else {
      storageError = listError.message
    }
  } catch (err: any) {
    storageError = err.message
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-8 p-6">
      <div>
        <h1 className="mb-2 text-3xl font-bold">🔍 Diagnóstico de Upload</h1>
        <p className="text-muted-foreground">Verificação de permissões e configurações do Storage</p>
      </div>

      {/* Autenticação */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-xl font-semibold">1. Autenticação</h2>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm">authenticated:</span>
            <span className="rounded bg-green-100 px-2 py-1 text-sm font-medium text-green-800">
              ✅ true
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm">userId:</span>
            <span className="font-mono text-sm text-muted-foreground">{user.id}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm">email:</span>
            <span className="font-mono text-sm text-muted-foreground">{user.email}</span>
          </div>
        </div>
      </div>

      {/* Buckets */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-xl font-semibold">2. Storage Buckets</h2>
        
        {bucketsError ? (
          <div className="rounded bg-red-50 p-4 text-sm text-red-800">
            <p className="font-semibold">❌ Erro ao listar buckets:</p>
            <p className="mt-1 font-mono">{bucketsError.message}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="mb-2 font-semibold">Bucket &quot;offers-files&quot;:</p>
              {bucketExists ? (
                <div className="space-y-2 rounded bg-green-50 p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-green-800">✅ Bucket existe</span>
                  </div>
                  {bucketInfo && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-green-700">id:</span>
                        <span className="font-mono text-sm text-green-700">{bucketInfo.id}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-green-700">public:</span>
                        <span className="font-mono text-sm text-green-700">
                          {bucketInfo.public ? 'true' : 'false (privado)'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="rounded bg-yellow-50 p-4">
                  <p className="text-sm font-semibold text-yellow-800">
                    ⚠️ Bucket &quot;offers-files&quot; não encontrado
                  </p>
                  <p className="mt-2 text-sm text-yellow-700">
                    Crie o bucket no Supabase Dashboard → Storage
                  </p>
                </div>
              )}
            </div>

            {buckets && buckets.length > 0 && (
              <div>
                <p className="mb-2 text-sm text-muted-foreground">Todos os buckets disponíveis:</p>
                <ul className="list-inside list-disc space-y-1 text-sm">
                  {buckets.map((bucket: any) => (
                    <li key={bucket.id} className="font-mono">
                      {bucket.name} {bucket.public ? '(público)' : '(privado)'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Storage RLS */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-xl font-semibold">3. Storage RLS Policies</h2>
        
        {bucketExists ? (
          <div className="space-y-4">
            <div>
              <p className="mb-2 font-semibold">Acesso ao bucket:</p>
              {storageAccessible ? (
                <div className="rounded bg-green-50 p-4">
                  <p className="text-sm font-semibold text-green-800">
                    ✅ Políticas RLS configuradas corretamente
                  </p>
                  <p className="mt-1 text-sm text-green-700">
                    Você tem permissão para acessar o bucket.
                  </p>
                </div>
              ) : (
                <div className="rounded bg-red-50 p-4">
                  <p className="text-sm font-semibold text-red-800">
                    ❌ Erro de permissão (RLS)
                  </p>
                  {storageError && (
                    <p className="mt-2 font-mono text-sm text-red-700">{storageError}</p>
                  )}
                  <div className="mt-4 space-y-2 text-sm text-red-700">
                    <p className="font-semibold">Solução:</p>
                    <p>
                      Configure as políticas RLS no Supabase Dashboard → Storage → offers-files →
                      Policies
                    </p>
                    <p className="mt-2 font-mono text-xs">
                      Veja instruções em: DIAGNOSTICO-UPLOAD-RLS.md
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded bg-muted p-4 text-sm text-muted-foreground">
            Aguardando criação do bucket...
          </div>
        )}
      </div>

      {/* Instruções */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-xl font-semibold">📋 Próximos Passos</h2>
        
        {!bucketExists && (
          <div className="mb-4 space-y-2 rounded bg-blue-50 p-4 text-sm text-blue-800">
            <p className="font-semibold">1. Criar Bucket</p>
            <ul className="ml-4 list-inside list-disc space-y-1">
              <li>Ir para Supabase Dashboard → Storage</li>
              <li>Clicar em &quot;New bucket&quot;</li>
              <li>Nome: <code className="font-mono">offers-files</code></li>
              <li>Marcar como <strong>Privado</strong></li>
            </ul>
          </div>
        )}

        {bucketExists && !storageAccessible && (
          <div className="mb-4 space-y-2 rounded bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold">2. Configurar Políticas RLS</p>
            <ul className="ml-4 list-inside list-disc space-y-1">
              <li>Ir para Supabase Dashboard → Storage → offers-files → Policies</li>
              <li>Adicionar política de INSERT (upload)</li>
              <li>Adicionar política de SELECT (download)</li>
              <li>Ver instruções completas em: <code className="font-mono">DIAGNOSTICO-UPLOAD-RLS.md</code></li>
            </ul>
          </div>
        )}

        {bucketExists && storageAccessible && (
          <div className="mb-4 space-y-2 rounded bg-green-50 p-4 text-sm text-green-800">
            <p className="font-semibold">✅ Tudo configurado!</p>
            <p>O upload de arquivos deve funcionar corretamente agora.</p>
            <p className="mt-2">Teste fazendo upload em uma oferta → Aba Anexos ou Criativos.</p>
          </div>
        )}

        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <p className="font-semibold">📖 Documentação:</p>
          <ul className="ml-4 list-inside list-disc">
            <li>
              <a
                href="/DIAGNOSTICO-UPLOAD-RLS.md"
                className="text-blue-600 hover:underline"
                target="_blank"
              >
                Guia completo de configuração RLS
              </a>
            </li>
            <li>
              <a
                href="https://supabase.com/docs/guides/storage/security/access-control"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Docs oficiais: Supabase Storage RLS
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

