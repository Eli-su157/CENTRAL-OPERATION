'use client';

// IntegrationsPanel — DenseTable de integration_connections com saúde em tempo real.
// Substitui o IntegrationCenterClient raso na visão técnica da Sala de Controle.
// (IntegrationCenterClient continua existindo para configuração/edição.)

import { DenseTable, type DenseColumn } from '@/components/ui';
import type { IntegrationConnection } from '@/lib/mock/structure';
import { formatProvider, STATUS_DOT, STATUS_COLOR, STATUS_LABEL } from '@/lib/mock/structure';

const CATEGORY_LABEL: Record<string, string> = {
  venda: 'Venda', tracker: 'Tracker', atribuicao: 'Atribuição', trafego: 'Tráfego', banco: 'Banco',
};

function relativeTime(iso: string | null): string {
  if (!iso) return 'nunca';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1)  return 'agora';
  if (min < 60) return `${min}m atrás`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

const statusDotMap = STATUS_DOT as Record<string, string>;
const statusColorMap = STATUS_COLOR as Record<string, string>;
const statusLabelMap = STATUS_LABEL as Record<string, string>;

function StatusDot({ status }: { status: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${statusDotMap[status] ?? 'bg-zinc-700'} ${status === 'erro' ? 'animate-pulse' : ''}`} />
      <span className={`text-xs ${statusColorMap[status] ?? 'text-zinc-500'}`}>{statusLabelMap[status] ?? status}</span>
    </div>
  );
}

interface Props {
  connections: IntegrationConnection[];
  canManage: boolean;
  manageHref?: string;
}

const columns: DenseColumn<IntegrationConnection>[] = [
  {
    key: 'provider', label: 'Plataforma',
    render: c => (
      <div>
        <p className="text-sm text-zinc-200 font-medium">{formatProvider(c.provider)}</p>
        <p className="text-[10px] text-zinc-600">{CATEGORY_LABEL[c.category] ?? c.category}</p>
      </div>
    ),
  },
  {
    key: 'status', label: 'Estado',
    render: c => <StatusDot status={c.status} />,
  },
  {
    key: 'last_event_at', label: 'Último evento', sortable: true,
    render: c => (
      <span className="text-xs text-zinc-500 font-mono">
        {relativeTime(c.last_event_at)}
      </span>
    ),
  },
  {
    key: 'config', label: 'Config',
    render: c => {
      const keys = Object.keys(c.config ?? {}).filter(k => !k.includes('secret') && !k.includes('token'));
      return keys.length > 0
        ? <span className="text-[10px] text-zinc-700 font-mono truncate">{keys[0]}: {String(c.config[keys[0]]).slice(0, 20)}</span>
        : <span className="text-[10px] text-zinc-800">—</span>;
    },
  },
];

export function IntegrationsPanel({ connections, canManage, manageHref }: Props) {
  const connected   = connections.filter(c => c.status === 'conectada').length;
  const withError   = connections.filter(c => c.status === 'erro' || c.status === 'desconectada').length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          {connected > 0 && <span className="text-emerald-400 font-medium">{connected} ativas</span>}
          {withError > 0 && <span className="text-red-400 font-medium">{withError} com problema</span>}
        </div>
        {canManage && manageHref && (
          <a
            href={manageHref}
            className="ml-auto text-xs text-zinc-500 hover:text-orange-400 transition-colors font-medium"
          >
            Gerenciar credenciais →
          </a>
        )}
      </div>

      <DenseTable<IntegrationConnection>
        columns={columns}
        rows={connections}
        keyExtractor={c => c.id}
        sortFn={(rows, key, desc) => {
          if (key !== 'last_event_at') return rows;
          return [...rows].sort((a, b) => {
            const av = a.last_event_at ?? '';
            const bv = b.last_event_at ?? '';
            return desc ? bv.localeCompare(av) : av.localeCompare(bv);
          });
        }}
        initialSortKey="last_event_at"
        emptyMessage="Nenhuma integração configurada para este produto."
      />
    </div>
  );
}
