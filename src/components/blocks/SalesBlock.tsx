import { formatCurrency, formatPercent, formatDelta, formatNumber, deltaColor } from '@/lib/utils/format';
import { MetricBlock } from '@/components/ui';
import type { DashboardMetrics } from '@/lib/mock/metrics';
import type { SalesMetrics } from '@/lib/sales/metrics';

interface Props {
  data: DashboardMetrics;
  realSales?: SalesMetrics | null;
}

export function SalesBlock({ data, realSales }: Props) {
  const useReal = !!realSales?.has_data;
  const s = data.sales;

  const aprovadas_valor = useReal ? realSales!.aprovadas_valor : s.aprovadas_valor;
  const aprovadas_qtd   = useReal ? realSales!.aprovadas_qtd   : s.aprovadas_qtd;
  const ticket_medio    = useReal ? realSales!.ticket_medio    : s.ticket_medio;
  const taxa_reembolso  = useReal ? realSales!.taxa_reembolso  : s.taxa_reembolso;
  const conversao_pix   = useReal ? realSales!.conversao_pix   : s.conversao_pix;
  const reembolsoHigh   = taxa_reembolso > 4;

  return (
    <BlockCard label="Vendas" badge={useReal ? 'real' : 'demo'} icon={
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 01-8 0"/>
      </svg>
    }>
      <div className="mb-5">
        <p className="text-3xl sm:text-[2rem] num font-bold text-white leading-none">
          {formatCurrency(aprovadas_valor)}
        </p>
        <p className="text-sm text-zinc-500 mt-1.5">
          {formatNumber(aprovadas_qtd)} pedidos aprovados
        </p>
        {!useReal && (
          <p className={`text-xs mt-1.5 font-medium tabular-nums ${deltaColor(s.delta_valor)}`}>
            {formatDelta(s.delta_valor)} vs ontem
          </p>
        )}
        {useReal && realSales!.no_primary_provider_warning && (
          <p className="text-xs mt-1.5 text-amber-400">Sem provider primário — somando todos</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/[0.05]">
        <MetricBlock label="Ticket médio" value={formatCurrency(ticket_medio)} />
        <MetricBlock
          label="Reembolso"
          value={formatPercent(taxa_reembolso)}
          valueClass={reembolsoHigh ? 'text-red-400' : 'text-zinc-200'}
          highlight={reembolsoHigh}
        />
        <MetricBlock
          label="Conv. Pix"
          value={conversao_pix > 0 ? formatPercent(conversao_pix) : '—'}
          valueClass={conversao_pix >= 80 ? 'text-emerald-400' : conversao_pix > 0 ? 'text-amber-400' : 'text-zinc-600'}
        />
        <MetricBlock label="Pedidos" value={String(aprovadas_qtd)} />
      </div>
    </BlockCard>
  );
}


function BlockCard({
  label, badge, icon, children,
}: {
  label: string; badge: string; icon?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="relative bg-[#161616] border border-white/[0.06] rounded-xl p-5 shadow-card overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          {icon && (
            <span className="text-zinc-500 bg-white/[0.04] rounded-lg p-1.5">{icon}</span>
          )}
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-[0.1em]">{label}</p>
        </div>
        <span className={`text-[10px] px-1.5 py-px rounded font-semibold ${
          badge === 'real'
            ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
            : 'bg-zinc-500/10 text-zinc-500 ring-1 ring-zinc-500/15'
        }`}>
          {badge}
        </span>
      </div>
      {children}
    </div>
  );
}
