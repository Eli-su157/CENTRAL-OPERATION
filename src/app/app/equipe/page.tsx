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
        <div className="mb-8 pb-6 border-b border-white/[0.05] relative">
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-orange-500/20 via-orange-500/5 to-transparent" />
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-orange-500 rounded-full shrink-0" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Equipe</h1>
          </div>
          <p className="text-sm text-zinc-500 pl-4">{operation?.name ?? 'Operação'} · membros e convites</p>
        </div>

        <div className="flex flex-col gap-5">
          <InvitePanel pendingInvites={pendingInvites} />

          <div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-[0.1em] font-semibold mb-3 px-1">
              Membros ({members.length})
            </p>
            <div className="flex flex-col gap-2.5">
              {members.map(member => (
                <MemberCard key={member.id} member={member} currentUserId={ctx.userId} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
