import Link from 'next/link';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthContext } from '@/lib/auth/getPermissions';
import { InvitePanel } from '@/components/team/InvitePanel';
import { MemberCard, type Member } from '@/components/team/MemberCard';
import type { UserRole, UserSector } from '@/lib/types/database';
import type { OverrideType } from '@/lib/auth/permissions';

export default async function EquipePage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/');
  if (!ctx.permissions.pode_gerenciar_equipe) redirect('/app');

  const supabase = await createClient();
  const admin = createAdminClient();

  // Busca nome da operação
  const { data: operation } = await supabase
    .from('operations')
    .select('name')
    .eq('id', ctx.profile.operation_id)
    .single();

  // Base URL para links de convite
  const headersList = await headers();
  const host = headersList.get('host') ?? 'localhost:3000';
  const protocol = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;

  // Busca membros, overrides e convites pendentes em paralelo
  const [membersResult, overridesResult, invitesResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('operation_id', ctx.profile.operation_id)
      .order('created_at', { ascending: true }),
    admin
      .from('permission_overrides')
      .select('user_id, type, value')
      .eq('operation_id', ctx.profile.operation_id),
    admin
      .from('invites')
      .select('*')
      .eq('operation_id', ctx.profile.operation_id)
      .eq('status', 'pendente')
      .order('created_at', { ascending: false }),
  ]);

  const rawOverrides = overridesResult.data ?? [];

  const members: Member[] = (membersResult.data ?? []).map(m => ({
    id: m.id,
    full_name: m.full_name,
    email: m.email,
    role: m.role as UserRole,
    sector: m.sector as UserSector | null,
    created_at: m.created_at,
    overrides: rawOverrides
      .filter(o => o.user_id === m.id)
      .map(o => ({
        type: o.type as OverrideType,
        value: o.value as Record<string, unknown> | null,
      })),
  }));

  const pendingInvites = (invitesResult.data ?? []).map(i => ({
    id: i.id,
    email: i.email,
    role: i.role as UserRole,
    sector: i.sector as UserSector | null,
    token: i.token,
    link: `${baseUrl}/convite/${i.token}`,
    created_at: i.created_at,
  }));

  return (
    <main className="min-h-screen p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/app"
            className="text-zinc-500 hover:text-white transition-colors"
            aria-label="Voltar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Gestão de Equipe</h1>
            <p className="text-sm text-zinc-500">{operation?.name ?? 'Operação'}</p>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* Painel de convites */}
          <InvitePanel pendingInvites={pendingInvites} />

          {/* Lista de membros */}
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium mb-3">
              Membros ({members.length})
            </p>
            <div className="flex flex-col gap-3">
              {members.map(member => (
                <MemberCard
                  key={member.id}
                  member={member}
                  currentUserId={ctx.userId}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
