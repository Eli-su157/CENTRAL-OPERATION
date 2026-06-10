import { formatCurrency } from '@/lib/utils/format';
import type { AdAccount, AdAccountStatus } from '@/lib/mock/traffic';

const statusStyle: Record<AdAccountStatus, { label: string; dot: string; border: string }> = {
  ativa:     { label: 'Ativa',     dot: 'bg-emerald-400', border: 'border-zinc-800' },
  limitada:  { label: 'Limitada',  dot: 'bg-amber-400',   border: 'border-amber-800/40' },
  bloqueada: { label: 'Bloqueada', dot: 'bg-red-500',     border: 'border-red-800/40' },
};

export function SaudeContasBlock({ accounts }: { accounts: AdAccount[] }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">Saúde das Contas</p>
      <div className="flex flex-col gap-3">
        {accounts.map(acc => {
          const s = statusStyle[acc.status];
          const limitePct = acc.limite_dia ? (acc.gasto_dia / acc.limite_dia) * 100 : null;
          const limiteRisk = limitePct !== null && limitePct > 80;
          return (
            <div key={acc.id} className={`flex items-center justify-between p-3.5 rounded-lg border bg-zinc-800/40 ${s.border}`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                <div className="min-w-0">
                  <p className="text-sm text-white font-medium truncate">{acc.name}</p>
                  <p className="text-xs text-zinc-500">{acc.platform} · {s.label}</p>
                </div>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className={`text-sm font-bold tabular-nums ${acc.status === 'bloqueada' ? 'text-red-400' : 'text-white'}`}>
                  {acc.status === 'bloqueada' ? 'Bloqueada' : formatCurrency(acc.gasto_dia)}
                </p>
                {acc.limite_dia && acc.status !== 'bloqueada' && (
                  <p className={`text-xs tabular-nums ${limiteRisk ? 'text-amber-400' : 'text-zinc-600'}`}>
                    {limitePct?.toFixed(0)}% do limite ({formatCurrency(acc.limite_dia)})
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
