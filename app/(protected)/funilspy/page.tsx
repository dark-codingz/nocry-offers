/**
 * Página FunilSpy: Consulta Certificate Transparency via crt.sh + Pesquisa Web (Dorks)
 */

'use client';

import { useState } from 'react';
import { Search, Copy, Check, AlertCircle, Loader2, ExternalLink } from 'lucide-react';

interface ProcessedResult {
  hostname: string;
  not_before?: string;
  not_after?: string;
  issuer?: string;
}

interface ApiResponse {
  domain: string;
  count: number;
  results: ProcessedResult[];
}

interface DorkResult {
  title: string | null;
  link: string | null;
  snippet: string | null;
  source: 'serpapi';
}

interface DorkApiResponse {
  domain: string;
  queries: string[];
  count: number;
  results: DorkResult[];
}

interface ApiError {
  error: string;
  code?: string;
}

export default function FunilSpyPage() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [crtData, setCrtData] = useState<ApiResponse | null>(null);
  const [crtError, setCrtError] = useState<string | null>(null);
  const [dorkData, setDorkData] = useState<DorkApiResponse | null>(null);
  const [dorkError, setDorkError] = useState<string | null>(null);
  const [dorkLoading, setDorkLoading] = useState(false);
  const [copiedHostname, setCopiedHostname] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  /**
   * Formata data para exibição
   */
  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  /**
   * Copia hostname para clipboard
   */
  const copyToClipboard = async (text: string, type: 'hostname' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'hostname') {
        setCopiedHostname(text);
        setTimeout(() => setCopiedHostname(null), 2000);
      } else {
        setCopiedLink(text);
        setTimeout(() => setCopiedLink(null), 2000);
      }
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  /**
   * Busca certificados e dorks em paralelo
   */
  const handleSearch = async () => {
    if (!domain.trim()) {
      setCrtError('Por favor, insira um domínio');
      return;
    }

    setLoading(true);
    setDorkLoading(true);
    setCrtError(null);
    setDorkError(null);
    setCrtData(null);
    setDorkData(null);

    const domainValue = domain.trim();

    // Busca paralela: CRT + Dorks
    const [crtResponse, dorkResponse] = await Promise.allSettled([
      // Busca CRT
      fetch(`/api/crt?domain=${encodeURIComponent(domainValue)}`),
      // Busca Dorks (SerpAPI exclusivo - faz site: e inurl: automaticamente)
      fetch(`/api/dorks?domain=${encodeURIComponent(domainValue)}`),
    ]);

    // Processa resultado CRT
    if (crtResponse.status === 'fulfilled') {
      try {
        const response = crtResponse.value;
        if (!response.ok) {
          const errorData: ApiError = await response.json();
          throw new Error(errorData.error || `Erro ${response.status}`);
        }
        const result: ApiResponse = await response.json();
        setCrtData(result);
      } catch (err: any) {
        setCrtError(err.message || 'Falha ao buscar certificados');
        console.error('Erro na busca CRT:', err);
      }
    } else {
      setCrtError('Falha ao buscar certificados');
    }

    // Processa resultado Dorks
    if (dorkResponse.status === 'fulfilled') {
      try {
        const response = dorkResponse.value;
        if (!response.ok) {
          const errorData: ApiError = await response.json();
          throw new Error(errorData.error || `Erro ${response.status}`);
        }
        const result: DorkApiResponse = await response.json();
        setDorkData(result);
      } catch (err: any) {
        setDorkError(err.message || 'Falha ao buscar resultados web');
        console.error('Erro na busca Dorks:', err);
      }
    } else {
      setDorkError('Falha ao buscar resultados web');
    }

    setLoading(false);
    setDorkLoading(false);
  };

  /**
   * Handle Enter key
   */
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading && !dorkLoading) {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1419] text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">FunilSpy</h1>
          <p className="text-white/60 text-sm md:text-base">
            NoCry Scan, advanced hacking/spy opponents.
          </p>
        </div>

        {/* Formulário de busca */}
        <div className="bg-[#1b2128] border border-white/10 rounded-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="exemplo.com ou https://example.com"
              className="flex-1 px-4 py-2 bg-[#0f1419] border border-white/10 rounded-md text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading || dorkLoading}
            />
            <button
              onClick={handleSearch}
              disabled={loading || dorkLoading || !domain.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed rounded-md font-medium flex items-center justify-center gap-2 transition-colors"
            >
              {(loading || dorkLoading) ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Buscar
                </>
              )}
            </button>
          </div>
        </div>

        {/* Aviso discreto */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-6">
          <p className="text-xs text-yellow-200/80">
          We see everything - There's NoCry
          </p>
        </div>

        {/* Erro CRT */}
        {crtError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-400 mb-1">Erro ao buscar certificados</p>
                <p className="text-sm text-red-300/90">{crtError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Erro Dorks */}
        {dorkError && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-orange-400 mb-1">Erro ao buscar resultados web</p>
                <p className="text-sm text-orange-300/90">{dorkError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Seção 1: Resultados CRT.sh */}
        {crtData && (
          <div className="bg-[#1b2128] border border-white/10 rounded-lg p-6 mb-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">
                Scan Subdomoinios - Resultados para: <span className="text-blue-400">{crtData.domain}</span>
              </h2>
              <p className="text-white/60 text-sm">
                {crtData.count === 0
                  ? 'Nenhum certificado encontrado'
                  : `${crtData.count} ${crtData.count === 1 ? 'hostname encontrado' : 'hostnames encontrados'}`}
              </p>
            </div>

            {crtData.count > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 font-semibold text-sm text-white/80">
                        Hostname
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-white/80">
                        Not Before
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-white/80">
                        Not After
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-white/80">
                        Issuer
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-white/80 w-20">
                        Ação
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {crtData.results.map((result, index) => (
                      <tr
                        key={`${result.hostname}-${index}`}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="py-3 px-4 text-sm font-mono text-blue-300">
                          {result.hostname}
                        </td>
                        <td className="py-3 px-4 text-sm text-white/70">
                          {formatDate(result.not_before)}
                        </td>
                        <td className="py-3 px-4 text-sm text-white/70">
                          {formatDate(result.not_after)}
                        </td>
                        <td className="py-3 px-4 text-sm text-white/70">
                          {result.issuer || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => copyToClipboard(result.hostname, 'hostname')}
                            className="p-2 hover:bg-white/10 rounded transition-colors"
                            title="Copiar hostname"
                          >
                            {copiedHostname === result.hostname ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4 text-white/60" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Seção 2: Resultados Pesquisa Web (Dorks) */}
        {dorkData && (
          <div className="bg-[#1b2128] border border-white/10 rounded-lg p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">
                Scan Pages - <span className="text-blue-400">{dorkData.domain}</span>
              </h2>
              <p className="text-white/60 text-sm">
                {dorkData.count === 0
                  ? 'Nenhum resultado encontrado'
                  : `${dorkData.count} ${dorkData.count === 1 ? 'resultado encontrado' : 'resultados encontrados'} (queries: ${dorkData.queries.join(', ')})`}
              </p>
            </div>

            {dorkData.count > 0 && (
              <div className="space-y-4">
                {dorkData.results.map((result, index) => (
                  <div
                    key={`${result.link || result.title || 'result'}-${index}`}
                    className="border border-white/5 rounded-lg p-4 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {result.link ? (
                          <a
                            href={result.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 font-medium text-sm mb-2 block truncate"
                          >
                            {result.title || 'Sem título'}
                            <ExternalLink className="w-3 h-3 inline-block ml-1" />
                          </a>
                        ) : (
                          <p className="text-blue-400 font-medium text-sm mb-2 truncate">
                            {result.title || 'Sem título'}
                          </p>
                        )}
                        <p className="text-white/60 text-xs mb-2 line-clamp-2">
                          {result.snippet || 'Sem descrição disponível'}
                        </p>
                        {result.link && (
                          <p className="text-white/40 text-xs font-mono truncate">
                            {result.link}
                          </p>
                        )}
                      </div>
                      {result.link && (
                        <button
                          onClick={() => copyToClipboard(result.link!, 'link')}
                          className="p-2 hover:bg-white/10 rounded transition-colors flex-shrink-0"
                          title="Copiar link"
                        >
                          {copiedLink === result.link ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-white/60" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Loading Dorks separado */}
        {dorkLoading && !dorkData && (
          <div className="bg-[#1b2128] border border-white/10 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              <p className="text-white/60">Buscando resultados web...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
