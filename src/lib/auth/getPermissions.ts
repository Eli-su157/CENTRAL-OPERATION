import { cache } from 'react';
import { unstable_cache } from 'next/cache';
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

type CachedAuth = {
  profile: ProfileRow | null;
  rawOverrides: { type: string; value: Record<string, unknown> | null }[];
};

// Usa SOMENTE o admin client (não usa cookies) — compatível com unstable_cache.
// Ambas as queries rodam em paralelo, resultado cacheado por user_id por 60s.
const getCachedProfileAndOverrides = unstable_cache(
  async (userId: string): Promise<CachedAuth> => {
    const admin = createAdminClient();

    const [profileRes, overridesRes] = await Promise.all([
      admin.from('profiles').select('*').eq('id', userId).single(),
      admin.from('permission_overrides').select('type, value').eq('user_id', userId),
    ]);

    return {
      profile: (profileRes.data as ProfileRow | null),
      rawOverrides: (overridesRes.data ?? []) as { type: string; value: Record<string, unknown> | null }[],
    };
  },
  ['auth-profile-overrides'],
  { revalidate: 60, tags: ['auth-profile'] }
);

// React.cache() deduplica dentro do mesmo request (layout + page não chamam 2x)
// unstable_cache persiste entre requests por 60s, invalidado por revalidateTag
export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  if (process.env.NEXT_PUBLIC_DEMO === 'true') {
    const { DEMO_AUTH_CONTEXT } = await import('@/lib/demo');
    return DEMO_AUTH_CONTEXT;
  }

  // auth.getUser() usa cookies — fica FORA da cache (validação de sessão sempre fresca)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Profile + overrides: cacheados por 60s via unstable_cache (sem cookies dentro)
  const { profile, rawOverrides } = await getCachedProfileAndOverrides(user.id);
  if (!profile) return null;

  const overrides: PermissionOverride[] = rawOverrides.map(o => ({
    type: o.type as PermissionOverride['type'],
    value: o.value,
  }));

  const permissions = resolvePermissions({
    role: profile.role,
    sector: profile.sector,
    overrides,
  });

  return { userId: user.id, profile, permissions, overrides };
});
