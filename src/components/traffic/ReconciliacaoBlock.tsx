import { formatCurrency, formatPercent } from '@/lib/utils/format';

type ReconciliationSource = 'real' | 'mock' | 'pending';

interface Props {
  tracker_faturamento: number;
  plataforma_faturamento: number;
  source?: ReconciliationSource;
  // Extras para o estado real
  attributed_count?: number;
  total_count?: number;
}

export function ReconciliacaoBlock({
  tracker_faturamento,
  plataforma_faturamento,
  source = 'mock',
  attributed_count,
  total_count,
}: Props) {
  // Estado "pendente": dados de vendas existem mas UTMify ainda não atribuiu nada
  if (source === 'pending') {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Reconciliação de Fontes</p>
          <span className="text-xs bg-zinc-800 text-zinc-600 px-1.5 py-0.5 rounded font-medium">pendente</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-6 rounded-lg bg-zinc-800/40 border border-zinc-700/40">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500 shrink-0">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <p className="text-sm text-zinc-400">Aguardando atribuição UTMify</p>
            <p className="text-xs text-zinc-600 mt-0.5">
              {plataforma_faturamento > 0
                ? `${formatCurrency(plataforma_faturamento)} confirmados pela plataforma — nenhum atribuído ao tracker ainda`
                : 'Configure a conexão UTMify no Centro de Integrações'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const diff    = plataforma_faturamento - tracker_faturamento;
  const denominator = Math.max(plataforma_faturamento, 1);
  const diffPct = tracker_faturamento > 0 || plataforma_faturamento > 0
    ? ((diff / denominator) * 100).toFixed(1)
    : '0';
  const ok = Math.abs(diff) / denominator < 0.08;

  const attributionRate =
    total_count && total_count > 0 && attributed_count !== undefined
      ? (attributed_count / total_count) * 100
      : null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Reconciliação de Fontes</p>
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
          source === 'real' ? 'bg-emerald-950 text-emerald-600' : 'bg-zinc-800 text-zinc-700'
        }`}>
          {source}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-zinc-800/60 rounded-lg p-3.5">
          <p className="text-xs text-zinc-500 mb-1">Tracker (UTMify)</p>
          <p className="text-lg font-bold text-white tabular-nums">{formatCurrency(tracker_faturamento)}</p>
          <p className="text-xs text-zinc-600 mt-1">
            {source === 'real' && attributionRate !== null
              ? `${formatPercent(attributionRate)} das vendas atribuídas`
              : 'Atribuído por parâmetro UTM'}
          </p>
        </div>
        <div className="bg-zinc-800/60 rounded-lg p-3.5">
          <p className="text-xs text-zinc-500 mb-1">Plataforma (real)</p>
          <p className="text-lg font-bold text-white tabular-nums">{formatCurrency(plataforma_faturamento)}</p>
          <p className="text-xs text-zinc-600 mt-1">
            {source === 'real' && total_count !== undefined
              ? `${total_count} venda${total_count !== 1 ? 's' : ''} confirmada${total_count !== 1 ? 's' : ''}`
              : 'Vendas confirmadas/pagas'}
          </p>
        </div>
      </div>

      <div className={`flex items-center gap-2.5 px-4 py-3 rounded-lg ${
        ok ? 'bg-emerald-950/40 border border-emerald-800/30' : 'bg-amber-950/40 border border-amber-800/30'
      }`}>
        <span className={`w-2 h-2 rounded-full shrink-0 ${ok ? 'bg-emerald-400' : 'bg-amber-400'}`} />
        <div>
          <p className={`text-sm font-medium ${ok ? 'text-emerald-300' : 'text-amber-300'}`}>
            {diff >= 0 ? '+' : ''}{formatCurrency(diff)} ({diff >= 0 ? '+' : ''}{diffPct}%)
          </p>
          <p className={`text-xs ${ok ? 'text-emerald-600' : 'text-amber-600'}`}>
            {ok
              ? 'Divergência dentro do normal (<8%)'
              : 'Divergência alta — revisar pixel e UTMs'}
          </p>
        </div>
      </div>
    </div>
  );
}
