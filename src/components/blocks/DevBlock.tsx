import Link from 'next/link';
import { getAuthContext } from '@/lib/auth/getPermissions';
import { STATUS_COLOR, STATUS_DOT, STATUS_LABEL, formatProvider } from '@/lib/mock/structure';

interface Props { dashboardId: string }

// Bloco do dashboard — resumo técnico com link pro painel Dev
export async function DevBlock({ dashboardId }: Props) {
  const ctx = await getAuthContext();
  if (!ctx) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = (await createClient()) as any;

  const [resourcesRes, connectionsRes] = await Promise.all([
    supabase
      .from('monitored_resources')
      .select('id, label, status, kind')
      .eq('operation_id', ctx.profile.operation_id)
      .eq('dashboard_id', dashboardId)
      .order('kind'),
    supabase
      .from('integration_connections')
      .select('id, provider, status, category')
      .eq('operation_id', ctx.profile.operation_id)
      .eq('dashboard_id', dashboardId)
      .order('category'),
  ]);

  const resources = (resourcesRes.data ?? []) as { id: string; label: string; status: string; kind: string }[];
  const connections = (connectionsRes.data ?? []) as { id: string; provider: string; status: string; category: string }[];

  const foraCount = resources.filter(r => r.status === 'fora').length;
  const erroCount = connections.filter(c => c.status === 'erro').length;
  const desconectadoCount = connections.filter(c => c.status === 'desconectada').length;

  const hasProblems = foraCount > 0 || erroCount > 0;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Dev & Integrações</p>
          {hasProblems && (
            <span className="text-xs bg-red-950 border border-red-800 text-red-400 px-1.5 py-0.5 rounded-full">
              {foraCount + erroCount} problema{foraCount + erroCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <Link href={`/app/d/${dashboardId}/dev`} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
          Painel dev →
        </Link>
      </div>

      {resources.length === 0 && connections.length === 0 ? (
        <p className="text-sm text-zinc-600">Nenhum recurso ou integração cadastrados.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Recursos */}
          {resources.length > 0 && (
            <div>
              <p className="text-xs text-zinc-600 uppercase tracking-widest font-medium mb-1.5">Recursos</p>
              <div className="flex flex-col gap-1">
                {resources.slice(0, 4).map(r => (
                  <div key={r.id} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[r.status as keyof typeof STATUS_DOT] ?? 'bg-zinc-700'}`} />
                    <span className="text-xs text-zinc-400 truncate">{r.label}</span>
                    <span className={`text-xs ml-auto shrink-0 ${STATUS_COLOR[r.status as keyof typeof STATUS_COLOR] ?? 'text-zinc-600'}`}>
                      {STATUS_LABEL[r.status as keyof typeof STATUS_LABEL] ?? r.status}
                    </span>
                  </div>
                ))}
                {resources.length > 4 && (
                  <p className="text-xs text-zinc-700">+{resources.length - 4} mais</p>
                )}
              </div>
            </div>
          )}

          {/* Integrações */}
          {connections.length > 0 && (
            <div className="border-t border-zinc-800/60 pt-3">
              <p className="text-xs text-zinc-600 uppercase tracking-widest font-medium mb-1.5">Integrações</p>
              <div className="flex flex-wrap gap-1.5">
                {connections.slice(0, 5).map(c => (
                  <span key={c.id} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
                    c.status === 'conectada'
                      ? 'bg-emerald-950 border-emerald-800 text-emerald-400'
                      : c.status === 'erro'
                      ? 'bg-red-950 border-red-800 text-red-400'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[c.status as keyof typeof STATUS_DOT] ?? 'bg-zinc-600'}`} />
                    {formatProvider(c.provider)}
                  </span>
                ))}
                {desconectadoCount > 0 && (
                  <span className="text-xs text-zinc-600">{desconectadoCount} desconect{desconectadoCount !== 1 ? 'adas' : 'ada'}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
