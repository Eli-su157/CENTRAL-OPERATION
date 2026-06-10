import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolvePermissions, type Permissions, type PermissionOverride } from './permissions';
import type { Database } from '@/lib/types/database';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export interface AuthContext {
  userId: string;
  profile: ProfileRow;
  permissions: Permissions;
  overrides: PermissionOverride[];
}

export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  // Modo demo: retorna usuário fictício sem tocar o Supabase
  if (process.env.NEXT_PUBLIC_DEMO === 'true') {
    const { DEMO_AUTH_CONTEXT } = await import('@/lib/demo');
    return DEMO_AUTH_CONTEXT;
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) return null;

  // Admin bypassa RLS para ler overrides do usuário atual
  const admin = createAdminClient();
  const { data: rawOverrides } = await admin
    .from('permission_overrides')
    .select('type, value')
    .eq('user_id', user.id);

  const overrides: PermissionOverride[] = (rawOverrides ?? []).map(o => ({
    type: o.type as PermissionOverride['type'],
    value: o.value as Record<string, unknown> | null,
  }));

  const permissions = resolvePermissions({
    role: profile.role,
    sector: profile.sector,
    overrides,
  });

  return { userId: user.id, profile, permissions, overrides };
});
