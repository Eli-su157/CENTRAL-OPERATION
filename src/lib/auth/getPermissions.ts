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

// profiles + permission_overrides em paralelo — cached por user_id, TTL 60s
// Invalidado via revalidateTag('auth-profile') quando um admin muda papel/override
const getCachedProfileAndOverrides = unstable_cache(
  async (userId: string): Promise<CachedAuth> => {
    const supabase = await createClient();
    const admin = createAdminClient();

    const [profileRes, overridesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
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

export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  if (process.env.NEXT_PUBLIC_DEMO === 'true') {
    const { DEMO_AUTH_CONTEXT } = await import('@/lib/demo');
    return DEMO_AUTH_CONTEXT;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

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
