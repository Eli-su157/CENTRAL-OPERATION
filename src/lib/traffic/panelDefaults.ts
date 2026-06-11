// Constantes sem 'use client' — podem ser importadas por Server Components
export const DEFAULT_BLOCK_ORDER: string[] = [
  'metas', 'decisao', 'funil', 'reconciliacao', 'saude', 'temporal', 'alertas',
];

export const DEFAULT_ENABLED_BLOCKS: Record<string, boolean> = {
  metas: true, decisao: true, funil: true, reconciliacao: true,
  saude: true, temporal: true, alertas: true,
};
