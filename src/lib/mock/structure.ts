// Camada isolada de monitoramento de estrutura técnica.
//
// SWAP REAL (Fase 10): substituir a lógica mock por:
//   - monitored_resources status real (ping ativo via cron)
//   - integration_connections.status real (webhook heartbeat)
//   - SSL/domínio via checagem ativa
//
// A assinatura de getStructureHealth NÃO muda — apenas o corpo.

export type ResourceKind = 'pagina' | 'dominio';
export type ResourceStatus = 'no_ar' | 'fora' | 'lento' | 'desconhecido';
export type IntegrationStatus = 'conectada' | 'desconectada' | 'erro';

export interface MonitoredResource {
  id: string;
  kind: ResourceKind;
  label: string;
  url: string;
  status: ResourceStatus;
  manual_note: string | null;
  last_checked_at: string | null;
}

export interface IntegrationConnection {
  id: string;
  provider: string;
  category: 'venda' | 'atribuicao' | 'trafego';
  status: IntegrationStatus;
  last_event_at: string | null;
  // config público (sem credenciais)
  config: Record<string, unknown>;
}

export interface StructureHealth {
  pages: MonitoredResource[];
  domains: MonitoredResource[];
  connections: IntegrationConnection[];
  // Alertas derivados do status das conexões e recursos
  alerts: string[];
}

// Chamado pela page.tsx passando dados REAIS do banco.
// O mock só preenche campos que ainda não têm dado real (ex: last_checked_at quando cron ainda não rodou).
export function buildStructureHealth(
  resources: MonitoredResource[],
  connections: IntegrationConnection[]
): StructureHealth {
  const pages = resources.filter(r => r.kind === 'pagina');
  const domains = resources.filter(r => r.kind === 'dominio');

  const alerts: string[] = [];

  for (const r of resources) {
    if (r.status === 'fora') alerts.push(`${r.label} está FORA do ar`);
    else if (r.status === 'lento') alerts.push(`${r.label} está lento`);
  }
  for (const c of connections) {
    if (c.status === 'desconectada')
      alerts.push(`${formatProvider(c.provider)} desconectado`);
    else if (c.status === 'erro')
      alerts.push(`${formatProvider(c.provider)} com erro`);
  }

  return { pages, domains, connections, alerts };
}

// Mock para quando não há recursos cadastrados ainda
export function getStructureHealthMock(dashboardId: string): StructureHealth {
  // Dados exemplares para orientar o dev no cadastro
  const pages: MonitoredResource[] = [
    {
      id: `mock-pg-${dashboardId}-1`,
      kind: 'pagina',
      label: 'Página de Vendas',
      url: 'https://seudominio.com/vendas',
      status: 'desconhecido',
      manual_note: null,
      last_checked_at: null,
    },
    {
      id: `mock-pg-${dashboardId}-2`,
      kind: 'pagina',
      label: 'Checkout',
      url: 'https://checkout.seudominio.com',
      status: 'desconhecido',
      manual_note: null,
      last_checked_at: null,
    },
  ];
  const domains: MonitoredResource[] = [
    {
      id: `mock-dom-${dashboardId}-1`,
      kind: 'dominio',
      label: 'Domínio principal',
      url: 'seudominio.com',
      status: 'desconhecido',
      manual_note: null,
      last_checked_at: null,
    },
  ];
  return { pages, domains, connections: [], alerts: [] };
}

export function formatProvider(provider: string): string {
  const labels: Record<string, string> = {
    hotmart: 'Hotmart',
    paradise: 'Paradise',
    vega: 'Vega',
    shopify: 'Shopify',
    utmify: 'UTMify',
    meta_ads: 'Meta Ads',
    google_ads: 'Google Ads',
  };
  return labels[provider] ?? provider;
}

export const STATUS_COLOR: Record<ResourceStatus | IntegrationStatus, string> = {
  no_ar:        'text-emerald-400',
  conectada:    'text-emerald-400',
  fora:         'text-red-400',
  desconectada: 'text-zinc-500',
  lento:        'text-amber-400',
  erro:         'text-red-400',
  desconhecido: 'text-zinc-600',
};

export const STATUS_DOT: Record<ResourceStatus | IntegrationStatus, string> = {
  no_ar:        'bg-emerald-400',
  conectada:    'bg-emerald-400',
  fora:         'bg-red-500',
  desconectada: 'bg-zinc-600',
  lento:        'bg-amber-400',
  erro:         'bg-red-500',
  desconhecido: 'bg-zinc-700',
};

export const STATUS_LABEL: Record<ResourceStatus | IntegrationStatus, string> = {
  no_ar:        'No ar',
  conectada:    'Conectada',
  fora:         'Fora',
  desconectada: 'Desconectada',
  lento:        'Lento',
  erro:         'Erro',
  desconhecido: 'Desconhecido',
};
