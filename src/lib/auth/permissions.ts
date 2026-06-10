import type { UserRole, UserSector } from '@/lib/types/database';

export type OverrideType = 'ver_financeiro' | 'atribuir_tarefa' | 'restrito_a_dashboard';
export type AssignScope = 'todos' | 'meu_setor' | 'nenhum';

export interface PermissionOverride {
  type: OverrideType;
  value: Record<string, unknown> | null;
}

export interface UserContext {
  role: UserRole;
  sector: UserSector | null;
  overrides: PermissionOverride[];
}

export interface Permissions {
  pode_ver_financeiro: boolean;
  pode_atribuir_tarefa: AssignScope;
  pode_ver_setor: (setor: UserSector) => boolean;
  pode_gerenciar_conta: boolean;
  pode_gerenciar_equipe: boolean;
  pode_criar_dashboard: boolean;
  restrito_a_dashboard: string | null;
}

export function resolvePermissions(ctx: UserContext): Permissions {
  const { role, sector, overrides } = ctx;

  const getOverride = (type: OverrideType) => overrides.find(o => o.type === type) ?? null;

  // Escopo de atribuição pela regra-base
  const baseAssign: AssignScope =
    role === 'dono' || role === 'head' ? 'todos' :
    role === 'lider' ? 'meu_setor' :
    'nenhum';

  // Override de atribuição: só eleva o escopo, nunca reduz
  const assignOverride = getOverride('atribuir_tarefa');
  let assignScope: AssignScope = baseAssign;
  if (assignOverride && baseAssign !== 'todos') {
    const escopo = (assignOverride.value as { escopo?: AssignScope } | null)?.escopo ?? 'meu_setor';
    // só sobe o nível
    if (escopo === 'todos') assignScope = 'todos';
    else if (escopo === 'meu_setor' && baseAssign === 'nenhum') assignScope = 'meu_setor';
  }

  // Override restrito_a_dashboard
  const dashboardOverride = getOverride('restrito_a_dashboard');
  const restricttoDashboard =
    (dashboardOverride?.value as { dashboard_id?: string } | null)?.dashboard_id ?? null;

  return {
    pode_ver_financeiro:
      role === 'dono' || role === 'head' || !!getOverride('ver_financeiro'),

    pode_atribuir_tarefa: assignScope,

    pode_ver_setor: (setor: UserSector) => {
      if (role === 'dono' || role === 'head') return true;
      return sector === setor;
    },

    pode_gerenciar_conta: role === 'dono',
    pode_gerenciar_equipe: role === 'dono',
    pode_criar_dashboard: role === 'dono',
    restrito_a_dashboard: restricttoDashboard,
  };
}
