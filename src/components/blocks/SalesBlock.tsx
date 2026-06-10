import { formatCurrency, formatPercent, formatDelta, formatNumber, deltaColor } from '@/lib/utils/format';
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
    <BlockCard label="Vendas" badge={useReal ? 'real' : 'demo'}>
      {/* Main metric */}
      <div className="mb-5">
        <p className="text-3xl font-bold text-white tabular-nums">{formatCurrency(aprovadas_valor)}</p>
        <p className="text-sm text-zinc-500 mt-1">{formatNumber(aprovadas_qtd)} pedidos aprovados</p>
        {!useReal && (
          <p className={`text-xs mt-1.5 font-medium tabular-nums ${deltaColor(s.delta_valor)}`}>
            {formatDelta(s.delta_valor)} vs ontem
          </p>
        )}
        {useReal && realSales!.no_primary_provider_warning && (
          <p className="text-xs mt-1.5 text-amber-500">Sem provider primário — somando todos</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-zinc-800/60">
        <Metric label="Ticket médio" value={formatCurrency(ticket_medio)} />
        <Metric
          label="Reembolso"
          value={formatPercent(taxa_reembolso)}
          valueClass={reembolsoHigh ? 'text-red-400' : 'text-white'}
        />
        <Metric
          label="Conv. Pix"
          value={conversao_pix > 0 ? formatPercent(conversao_pix) : '—'}
          valueClass={conversao_pix >= 80 ? 'text-emerald-400' : conversao_pix > 0 ? 'text-amber-400' : 'text-zinc-600'}
        />
        <Metric label="Pedidos" value={String(aprovadas_qtd)} />
      </div>
    </BlockCard>
  );
}

function Metric({
  label,
  value,
  valueClass = 'text-white',
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <p className="text-xs text-zinc-500 mb-0.5">{label}</p>
      <p className={`text-sm font-bold tabular-nums ${valueClass}`}>{value}</p>
    </div>
  );
}

function BlockCard({ label, badge, children }: { label: string; badge: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">{label}</p>
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
          badge === 'real' ? 'bg-emerald-950 text-emerald-600' : 'bg-zinc-800 text-zinc-700'
        }`}>
          {badge}
        </span>
      </div>
      {children}
    </div>
  );
}
