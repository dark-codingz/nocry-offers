/**
 * Barrel file para Server Actions de ofertas.
 * Centraliza exports para facilitar imports e manutenção.
 * Se a estrutura de pastas mudar, ajuste apenas aqui.
 * 
 * Nota: Não usar 'use server' aqui - apenas re-exports.
 */

// Re-exportar todas as Server Actions do módulo de ofertas
export {
  // Criativos Originais
  saCreateCreativeOriginal,
  createCreativeOriginal,
  deleteCreativeOriginal,
  
  // Criativos Modelados
  createCreativeModeled,
  deleteCreativeModeled,
  
  // Páginas/Funil
  createSimplePage,
  deletePage,
  
  // Entregáveis (Bônus)
  saCreateBonus,
  createBonus,
  deleteBonus,
  
  // Upsell
  createUpsell,
  deleteUpsell,
  
  // Pixel
  savePixel,
  deletePixel,
  togglePixelActive,
  
  // Anexos
  saCreateAttachment,
  createAttachment,
  deleteAttachment,
  
  // Comentários
  createComment,
  deleteComment,
} from '@/app/(protected)/ofertas/[id]/actions'

