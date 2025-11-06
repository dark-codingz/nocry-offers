'use client'

import { createClient } from './supabase/client'

/**
 * Insere registro em uma tabela do Supabase
 */
export async function insertRecord<T extends Record<string, any>>(
  schema: string,
  table: string,
  data: T
): Promise<{ success: true; data: any } | { success: false; error: string }> {
  try {
    const supabase = createClient()

    console.log(`[INSERT] Schema: ${schema}, Table: ${table}`)
    const { data: result, error } = await supabase.schema(schema).from(table).insert(data).select().single()

    if (error) {
      console.error(`[INSERT_${table.toUpperCase()}_ERROR]`, error)
      if (error.code === '42P01') {
        return {
          success: false,
          error: `TABLE_NOT_FOUND:${table} - Tabela não encontrada (schema ${schema}). Rode o SQL de migração.`,
        }
      }
      return { success: false, error: error.message }
    }

    return { success: true, data: result }
  } catch (err) {
    console.error(`[INSERT_${table.toUpperCase()}_EXCEPTION]`, err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro desconhecido',
    }
  }
}

/**
 * Deleta registro de uma tabela do Supabase
 */
export async function deleteRecord(
  schema: string,
  table: string,
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = createClient()

    console.log(`[DELETE] Schema: ${schema}, Table: ${table}, ID: ${id}`)
    const { error } = await supabase.schema(schema).from(table).delete().eq('id', id)

    if (error) {
      console.error(`[DELETE_${table.toUpperCase()}_ERROR]`, error)
      if (error.code === '42P01') {
        return {
          success: false,
          error: `TABLE_NOT_FOUND:${table} - Tabela não encontrada (schema ${schema}). Rode o SQL de migração.`,
        }
      }
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error(`[DELETE_${table.toUpperCase()}_EXCEPTION]`, err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro desconhecido',
    }
  }
}

