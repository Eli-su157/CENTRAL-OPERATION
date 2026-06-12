import Link from 'next/link';
import { formatNumber } from '@/lib/utils/format';
import type { DashboardMetrics } from '@/lib/mock/metrics';
import type { RealTeamData } from '@/lib/types/tasks';

interface Props {
  data: DashboardMetrics;
  realTeam?: RealTeamData | null;
}

export function TeamBlock({ data, realTeam }: Props) {
  const atrasadas      = realTeam?.tarefas_atrasadas         ?? data.team.tarefas_atrasadas;
  const pendentes      = realTeam?.tarefas_pendentes_total   ?? data.team.entregas_pendentes;
  const membros        = realTeam?.membros_ativos            ?? data.team.membros_ativos;
  const totalAtrasadas = atrasadas.reduce((s, x) => s + x.quantidade, 0);
  const isRealData     = !!realTeam;
  const tudoOk         = isRealData && totalAtrasadas === 0 && pendentes === 0;

  return (
    <div className="relative bg-[#161616] border border-white/[0.06] rounded-xl p-5 shadow-card overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 bg-white/[0.04] rounded-lg p-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </span>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-[0.1em]">Equipe</p>
        </div>
        {isRealData && (
          <Link href="/app/tarefas" className="text-[11px] link-action transition-colors font-medium">
            Ver quadro →
          </Link>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCell
          label="Atrasadas"
          value={formatNumber(totalAtrasadas)}
          valueClass={totalAtrasadas > 0 ? 'text-red-400' : 'text-emerald-400'}
          highlight={totalAtrasadas > 0}
        />
        <StatCell
          label="Pendentes"
          value={formatNumber(pendentes)}
          valueClass={pendentes > 5 ? 'text-amber-400' : 'text-white'}
        />
        <StatCell label="Membros" value={formatNumber(membros)} />
      </div>

      {atrasadas.length > 0 && (
        <div className="pt-4 border-t border-white/[0.05]">
          <p className="text-[10px] text-zinc-600 uppercase tracking-[0.1em] font-semibold mb-3">Atrasos por setor</p>
          <div className="flex flex-col gap-1.5">
            {atrasadas.map(item => (
              <div key={item.setor} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white/[0.02]">
                <span className="text-sm text-zinc-400 capitalize">{item.setor}</span>
                <span className="text-sm text-amber-400 tabular-nums font-semibold">
                  {item.quantidade}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tudoOk && (
        <div className="pt-4 border-t border-white/[0.05] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <p className="text-xs text-emerald-400">Tudo em dia. Nenhuma tarefa atrasada.</p>
        </div>
      )}
    </div>
  );
}

function StatCell({
  label, value, valueClass = 'text-white', highlight = false,
}: {
  label: string; value: string; valueClass?: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg p-2.5 ${highlight ? 'bg-red-500/5 border border-red-500/10' : 'bg-white/[0.02]'}`}>
      <p className="text-[10px] text-zinc-500 uppercase tracking-wide font-medium mb-1">{label}</p>
      <p className={`text-base font-bold tabular-nums leading-tight ${valueClass}`}>{value}</p>
    </div>
  );
}
