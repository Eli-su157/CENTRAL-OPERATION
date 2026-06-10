// Modo demo: dados fixos para visualização da UI sem Supabase conectado.
// Ativado via NEXT_PUBLIC_DEMO=true no .env.local.
// Remove esse env var quando conectar o banco real.

import type { AuthContext } from '@/lib/auth/getPermissions';
import { resolvePermissions } from '@/lib/auth/permissions';

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO === 'true';

export const DEMO_OPERATION_ID = 'demo-op-00000000-0000-0000-0000-000000000001';
export const DEMO_USER_ID      = 'demo-user-0000-0000-0000-000000000001';

export const DEMO_DASHBOARDS = [
  { id: 'demo-dash-0000-0000-0000-000000000001', name: 'Produto Alpha', operation_id: DEMO_OPERATION_ID, created_at: new Date().toISOString() },
  { id: 'demo-dash-0000-0000-0000-000000000002', name: 'Produto Beta',  operation_id: DEMO_OPERATION_ID, created_at: new Date().toISOString() },
];

export const DEMO_AUTH_CONTEXT: AuthContext = {
  userId: DEMO_USER_ID,
  profile: {
    id: DEMO_USER_ID,
    operation_id: DEMO_OPERATION_ID,
    full_name: 'Demo Dono',
    email: 'demo@centraloperacoes.com',
    role: 'dono',
    sector: null,
    created_at: new Date().toISOString(),
  },
  permissions: resolvePermissions({
    role: 'dono',
    sector: null,
    overrides: [],
  }),
  overrides: [],
};
