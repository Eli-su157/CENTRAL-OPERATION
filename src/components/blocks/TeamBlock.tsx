import Link from 'next/link';
import { formatNumber } from '@/lib/utils/format';
import type { DashboardMetrics } from '@/lib/mock/metrics';
import type { RealTeamData } from '@/lib/types/tasks';

interface Props {
  data: DashboardMetrics;
  realTeam?: RealTeamData | null;
}

export function TeamBlock({ data, realTeam }: Props) {
  // Usa dados reais se disponíveis; senão, mantém o mock como fallback
  const atrasadas = realTeam?.tarefas_atrasadas ?? data.team.tarefas_atrasadas;
  const pendentes = realTeam?.tarefas_pendentes_total ?? data.team.entregas_pendentes;
  const membros = realTeam?.membros_ativos ?? data.team.membros_ativos;
  const totalAtrasadas = atrasadas.reduce((s, x) => s + x.quantidade, 0);
  const isRealData = !!realTeam;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Equipe & Operação</p>
        {isRealData && (
          <Link href="/app/tarefas" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
            Ver quadro →
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">Tarefas atrasadas</p>
          <p className={`text-xl font-bold tabular-nums ${totalAtrasadas > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {formatNumber(totalAtrasadas)}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">Pendentes</p>
          <p className={`text-xl font-bold tabular-nums ${pendentes > 5 ? 'text-amber-400' : 'text-white'}`}>
            {formatNumber(pendentes)}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">Membros ativos</p>
          <p className="text-sm font-bold text-white tabular-nums">{formatNumber(membros)}</p>
        </div>
      </div>

      {atrasadas.length > 0 && (
        <div className="pt-4 border-t border-zinc-800/60">
          <p className="text-xs text-zinc-600 uppercase tracking-widest font-medium mb-3">Atrasos por setor</p>
          <div className="flex flex-col gap-2">
            {atrasadas.map(item => (
              <div key={item.setor} className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">{item.setor}</span>
                <span className="text-amber-400 tabular-nums font-medium">
                  {item.quantidade} {item.quantidade === 1 ? 'tarefa' : 'tarefas'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isRealData && atrasadas.length === 0 && pendentes === 0 && (
        <p className="text-xs text-emerald-400 pt-3 border-t border-zinc-800/60">
          Nenhuma tarefa atrasada. Tudo em dia!
        </p>
      )}
    </div>
  );
}
