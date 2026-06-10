// Sistema de registro de blocos do dashboard.
// Cada bloco declara sua visibilidade. DashboardGrid usa canSeeBlock()
// para filtrar quais blocos renderizar por usuário.
// Fases futuras plugam novos blocos adicionando entradas aqui + o componente.

import type { UserRole, UserSector } from '@/lib/types/database';
import type { Permissions } from '@/lib/auth/permissions';

export type BlockAudience = UserRole | UserSector | 'all' | 'financial';

export interface BlockMeta {
  id: string;
  title: string;
  /** Define quem pode ver o bloco. Ver canSeeBlock() para a lógica. */
  visibleTo: BlockAudience[];
}

export const BLOCK_REGISTRY: BlockMeta[] = [
  {
    id: 'sales',
    title: 'Vendas',
    visibleTo: ['all'],
  },
  {
    id: 'traffic',
    title: 'Tráfego',
    // Dono e head veem implicitamente; lider/executor só se setor = trafego
    visibleTo: ['trafego'],
  },
  {
    id: 'team',
    title: 'Equipe & Operação',
    // Dono, head, e qualquer lider (gestão de equipe)
    visibleTo: ['lider'],
  },
  {
    id: 'financial',
    title: 'Financeiro',
    // Controlado pela capacidade pode_ver_financeiro (override possível)
    visibleTo: ['financial'],
  },
  {
    id: 'edicao',
    title: 'Edição & Materiais',
    visibleTo: ['edicao'],
  },
  {
    id: 'dev',
    title: 'Dev & Integrações',
    visibleTo: ['dev'],
  },
];

/**
 * Determina se o usuário atual pode ver um bloco.
 *
 * Regras:
 * - 'all'       → sempre visível
 * - 'financial' → requer permissions.pode_ver_financeiro
 * - setor/papel → dono e head veem qualquer bloco não-financeiro;
 *                 lider/executor verificam se sua role/sector está em visibleTo
 */
export function canSeeBlock(
  meta: BlockMeta,
  profile: { role: UserRole; sector: UserSector | null },
  permissions: Permissions
): boolean {
  if (meta.visibleTo.includes('all')) return true;
  if (meta.visibleTo.includes('financial')) return permissions.pode_ver_financeiro;

  // Dono e head veem todos os blocos não-financeiros
  if (profile.role === 'dono' || profile.role === 'head') return true;

  // Demais: verificar se sua role ou sector está na lista
  return meta.visibleTo.some(
    audience => audience === profile.role || audience === profile.sector
  );
}
