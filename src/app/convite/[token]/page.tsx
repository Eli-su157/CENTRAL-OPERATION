import { createAdminClient } from '@/lib/supabase/admin';
import { InviteAcceptForm } from '@/components/auth/InviteAcceptForm';
import type { UserRole, UserSector } from '@/lib/types/database';

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;

  const admin = createAdminClient();

  const { data: invite } = await admin
    .from('invites')
    .select('*, operations(name)')
    .eq('token', token)
    .eq('status', 'pendente')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (!invite) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-900 mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Convite inválido</h1>
          <p className="text-zinc-400 text-sm">
            Este convite não existe, já foi utilizado ou expirou.
          </p>
        </div>
      </main>
    );
  }

  const operation = invite.operations as { name: string } | null;

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-600 mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">CENTRAL DE OPERAÇÕES</h1>
          <p className="text-zinc-500 text-sm mt-1">Você foi convidado para uma operação</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 shadow-2xl">
          <h2 className="text-base font-semibold text-white mb-4">Aceitar convite</h2>

          <InviteAcceptForm
            token={token}
            email={invite.email}
            operationName={operation?.name ?? 'Operação'}
            role={invite.role as UserRole}
            sector={invite.sector as UserSector | null}
          />
        </div>
      </div>
    </main>
  );
}
