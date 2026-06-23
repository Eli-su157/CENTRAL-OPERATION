import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthContext } from '@/lib/auth/getPermissions';
import { InvitePanel } from '@/components/team/InvitePanel';
import { MemberCard, type Member, type MemberStats } from '@/components/team/MemberCard';
import type { UserRole, UserSector } from '@/lib/types/database';
import type { OverrideType } from '@/lib/auth/permissions';
import { monthStart, monthEnd } from '@/lib/finance/calc';
import { KPICard } from '@/components/ui';
import { formatCurrency } from '@/lib/utils/format';


export default async function EquipePage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/');
  if (!ctx.permissions.pode_gerenciar_equipe) redirect('/app');

  const today = new Date().toISOString().split('T')[0];
  const mesStart = monthStart();
  const mesEnd   = monthEnd();

  const supabase = await createClient();
  const admin = createAdminClient();
  const canSeeCost = ctx.permissions.pode_ver_financeiro;

  const headersList = await headers();
  const host = headersList.get('host') ?? 'localhost:3000';
  const protocol = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;

  // Busca tudo em paralelo
  const [operationRes, membersResult, overridesResult, invitesResult, tasksResult, dashboardsResult, materialsResult, financeResult] = await Promise.all([
    supabase.from('operations').select('name').eq('id', ctx.profile.operation_id).single(),

    supabase.from('profiles').select('*')
      .eq('operation_id', ctx.profile.operation_id)
      .order('created_at', { ascending: true }),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('permission_overrides').select('user_id, type, value')
      .eq('operation_id', ctx.profile.operation_id),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('invites').select('*')
      .eq('operation_id', ctx.profile.operation_id)
      .eq('status', 'pendente')
      .order('created_at', { ascending: false }),

    // Todas as tarefas da operação (sem selecionar comentários/anexos — só campos de stats)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('tasks')
      .select('id, assignee_user_id, status, due_date, created_at, updated_at')
      .eq('operation_id', ctx.profile.operation_id),

    supabase.from('dashboards').select('id, name')
      .eq('operation_id', ctx.profile.operation_id),

    // Materiais no ar por criador — para acender "criativos vencedores por editor"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('materials')
      .select('created_by, status, ad_reference')
      .eq('operation_id', ctx.profile.operation_id),

    // Custo do mês por pessoa (comissões/pagamentos com related_user_id)
    // Só buscado se canSeeCost — proteção adicional no servidor
    canSeeCost
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('finance_entries')
          .select('related_user_id, amount, direction, status')
          .eq('operation_id', ctx.profile.operation_id)
          .eq('direction', 'saida')
          .in('status', ['pago', 'a_pagar'])
          .gte('entry_date', mesStart)
          .lte('entry_date', mesEnd)
          .not('related_user_id', 'is', null)
      : Promise.resolve({ data: [] }),
  ]);

  const rawOverrides = overridesResult.data ?? [];
  const tasks = (tasksResult.data ?? []) as {
    id: string; assignee_user_id: string | null;
    status: string; due_date: string | null; created_at: string; updated_at: string;
  }[];
  const dashboards = (dashboardsResult.data ?? []) as { id: string; name: string }[];
  const materialsRows = (materialsResult.data ?? []) as {
    created_by: string | null; status: string; ad_reference: string | null;
  }[];

  const financeRows = (financeResult.data ?? []) as {
    related_user_id: string; amount: number; direction: string; status: string;
  }[];

  // ── Computa stats por membro ──────────────────────────────────────────────

  // Mapa de criativos no_ar por criador (para exibir na Equipe)
  const criativosNoArByMember: Record<string, number> = {};
  for (const m of materialsRows) {
    if (m.created_by && m.status === 'no_ar') {
      criativosNoArByMember[m.created_by] = (criativosNoArByMember[m.created_by] ?? 0) + 1;
    }
  }

  function getStats(memberId: string): MemberStats {
    const mine = tasks.filter(t => t.assignee_user_id === memberId);
    const atrasadas = mine.filter(t =>
      t.due_date && t.due_date < today && t.status !== 'concluida'
    ).length;
    const concluida_mes = mine.filter(t =>
      t.status === 'concluida' && (t.updated_at ?? t.created_at) >= mesStart
    ).length;
    return {
      fazendo:       mine.filter(t => t.status === 'fazendo').length,
      a_fazer:       mine.filter(t => t.status === 'a_fazer').length,
      atrasadas,
      concluida_mes,
      criativos_no_ar: criativosNoArByMember[memberId] ?? 0,
    };
  }

  // Custo do mês por pessoa
  const custoByMember: Record<string, number> = {};
  for (const r of financeRows) {
    if (!r.related_user_id) continue;
    custoByMember[r.related_user_id] = (custoByMember[r.related_user_id] ?? 0) + Number(r.amount);
  }

  // ── Monta membros com overrides ────────────────────────────────────────────

  const members: Member[] = (membersResult.data ?? []).map(m => ({
    id: m.id,
    full_name: m.full_name,
    email: m.email,
    role: m.role as UserRole,
    sector: m.sector as UserSector | null,
    created_at: m.created_at,
    overrides: rawOverrides
      .filter((o: { user_id: string }) => o.user_id === m.id)
      .map((o: { type: string; value: unknown }) => ({
        type: o.type as OverrideType,
        value: o.value as Record<string, unknown> | null,
      })),
  }));

  const pendingInvites = (invitesResult.data ?? []).map((i: {
    id: string; email: string; role: string; sector: string | null;
    token: string; created_at: string;
  }) => ({
    id: i.id,
    email: i.email,
    role: i.role as UserRole,
    sector: i.sector as UserSector | null,
    token: i.token,
    link: `${baseUrl}/convite/${i.token}`,
    created_at: i.created_at,
  }));

  // ── KPIs da equipe ─────────────────────────────────────────────────────────

  const totalTasks      = tasks.filter(t => t.status !== 'concluida').length;
  const totalAtrasadas  = tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'concluida').length;
  const totalConclMes   = tasks.filter(t => t.status === 'concluida' && (t.updated_at ?? t.created_at) >= mesStart).length;
  const totalCustoMes   = Object.values(custoByMember).reduce((s, v) => s + v, 0);

  return (
    <main className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-white/[0.06] relative anim-slide-down border-bottom-run overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-orange-500/30 via-orange-500/8 to-transparent" />
        <div className="absolute -top-8 -left-8 w-48 h-48 bg-orange-500/[0.04] blur-3xl rounded-full pointer-events-none" />
        <div className="flex items-center gap-4 relative">
          <div className="w-1.5 h-8 bg-gradient-to-b from-orange-400 to-orange-600 rounded-full shrink-0 shadow-[0_0_12px_rgba(249,115,22,0.8)]" />
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Equipe</h1>
            <p className="text-[11px] text-zinc-500 font-mono mt-0.5 tracking-widest uppercase">Gestão de membros · permissões</p>
          </div>
        </div>
      </div>

      {/* KPIs da equipe */}
      <div className="anim-slide-up delay-150">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <KPICard label="Membros" value={String(members.length)} accent="brand" />
        <KPICard
          label="Tarefas abertas"
          value={String(totalTasks)}
          accent={totalAtrasadas > 0 ? 'negative' : 'neutral'}
          sub={totalAtrasadas > 0 ? `${totalAtrasadas} atrasadas` : 'tudo em dia'}
          subClass={totalAtrasadas > 0 ? 'text-red-400' : 'text-zinc-600'}
        />
        <KPICard
          label="Concluídas (mês)"
          value={String(totalConclMes)}
          accent={totalConclMes > 0 ? 'positive' : 'neutral'}
        />
        {canSeeCost && (
          <KPICard
            label="Custo equipe (mês)"
            value={formatCurrency(totalCustoMes)}
            accent={totalCustoMes > 0 ? 'negative' : 'neutral'}
            sub="comissões + pagamentos"
          />
        )}
      </div>

      </div>{/* end anim-slide-up */}

      {/* Convites + Membros */}
      <div className="anim-fade-in delay-300">
      <div className="flex flex-col gap-4">
        <InvitePanel pendingInvites={pendingInvites} />

        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-0.5 h-4 bg-orange-500 rounded-full" />
            <p className="text-xs font-semibold text-zinc-300 uppercase tracking-[0.12em]">
              Membros ({members.length})
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {members.map(member => (
              <MemberCard
                key={member.id}
                member={member}
                currentUserId={ctx.userId}
                stats={getStats(member.id)}
                custoMes={canSeeCost ? (custoByMember[member.id] ?? 0) : undefined}
                dashboards={dashboards}
              />
            ))}
          </div>
        </div>
      </div>
      </div>{/* end anim-fade-in */}
    </main>
  );
}
