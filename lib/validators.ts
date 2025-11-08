/**
 * Validação e sanitização de domínios/URLs
 */

import { z } from 'zod';

/**
 * Schema de validação para domínio
 */
const domainSchema = z
  .string()
  .min(1, 'Domínio não pode estar vazio')
  .max(253, 'Domínio muito longo')
  .refine(
    (val) => {
      // Remove protocolo, www, espaços
      const cleaned = val
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0]; // Remove path

      // Valida formato básico de domínio
      const domainRegex = /^([a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
      return domainRegex.test(cleaned);
    },
    {
      message: 'Domínio inválido',
    }
  );

/**
 * Extrai e sanitiza domínio de uma URL ou string de domínio
 */
export function extractDomain(urlOrDomain: string): string {
  if (!urlOrDomain || typeof urlOrDomain !== 'string') {
    throw new Error('Entrada inválida');
  }

  // Remove espaços e converte para lowercase
  let cleaned = urlOrDomain.trim().toLowerCase();

  // Remove protocolo (http://, https://)
  cleaned = cleaned.replace(/^https?:\/\//, '');

  // Remove www.
  cleaned = cleaned.replace(/^www\./, '');

  // Remove path, query, fragment (tudo após /)
  cleaned = cleaned.split('/')[0];

  // Remove porta (ex: example.com:8080)
  cleaned = cleaned.split(':')[0];

  // Remove espaços restantes
  cleaned = cleaned.trim();

  // Valida com zod
  const result = domainSchema.safeParse(cleaned);

  if (!result.success) {
    throw new Error(`Domínio inválido: ${result.error.errors[0]?.message || 'formato incorreto'}`);
  }

  return result.data;
}

/**
 * Valida se uma string é um domínio válido
 */
export function isValidDomain(domain: string): boolean {
  try {
    extractDomain(domain);
    return true;
  } catch {
    return false;
  }
}




