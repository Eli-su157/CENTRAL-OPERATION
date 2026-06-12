// Motor de Eventos — tipos centrais.
//
// Cada EventType representa um fato do negócio. O payload é livre (JSONB)
// mas cada tipo tem um shape documentado abaixo.

export type EventType =
  // ── Vendas ──────────────────────────────────────────────────────────
  | 'venda_aprovada'         // { sale_id, external_id, amount, provider, campaign_id?, ad_id? }
  | 'reembolso'              // { sale_id, external_id, amount, provider }
  | 'chargeback'             // { sale_id, external_id, amount, provider }

  // ── Financeiro ──────────────────────────────────────────────────────
  | 'comissao_lancada'       // { user_id, user_name, amount, finance_entry_id }

  // ── Tráfego / Tracker ───────────────────────────────────────────────
  | 'meta_em_risco'          // { tipo: 'gasto'|'faturamento', pct, meta, valor_atual }
  | 'criativo_vencedor'      // { ad_id, ad_name, campaign_name, roas, revenue }
  | 'conta_bloqueada'        // { account_name, platform }

  // ── Infraestrutura ──────────────────────────────────────────────────
  | 'plataforma_desconectada' // { provider, category }
  | 'tracker_desconectado'    // { provider }
  | 'recurso_caiu';           // { label, url, status: 'fora'|'lento' }

export interface AppEvent {
  id?:           string;
  operation_id:  string;
  dashboard_id:  string | null;
  type:          EventType;
  payload:       Record<string, unknown>;
  created_at?:   string;
}

// ── Mapas de responsabilidade por evento ─────────────────────────────────────
// Define qual setor/papel recebe notificação e/ou ação sugerida.

export type NotifyTarget = 'dono' | 'head' | 'financeiro' | 'trafego' | 'edicao' | 'dev';
export type ActionType   = 'criar_tarefa' | 'reconectar_plataforma' | 'investigar_reembolso';

export interface EventRule {
  // Quem recebe notificação
  notify: NotifyTarget[];
  // Se deve gerar alerta automático no AlertsBar
  auto_alert: boolean;
  // Se sugere uma pending_action
  suggest_action?: {
    type:         ActionType;
    title:        string;
    description:  string;
    target_sector?: string;
    target_role?:   string;
  };
}

// Tabela de regras: evento → comportamento
export const EVENT_RULES: Record<EventType, EventRule> = {
  venda_aprovada: {
    notify:      ['dono'],
    auto_alert:  false,
    suggest_action: {
      type:        'criar_tarefa',
      title:       'Onboarding — venda high-ticket',
      description: 'Venda de alto valor detectada. Considere criar tarefa de onboarding personalizado.',
      target_role: 'dono',
    },
  },
  reembolso: {
    notify:     ['dono', 'financeiro'],
    auto_alert: true,
    suggest_action: {
      type:          'investigar_reembolso',
      title:         'Investigar reembolso',
      description:   'Taxa de reembolso aumentou. Investigar causa e acionar suporte.',
      target_sector: 'financeiro',
    },
  },
  chargeback: {
    notify:     ['dono', 'financeiro'],
    auto_alert: true,
    suggest_action: {
      type:          'investigar_reembolso',
      title:         'Chargeback recebido — acionar plataforma',
      description:   'Chargeback detectado. Iniciar processo de contestação.',
      target_sector: 'financeiro',
    },
  },
  comissao_lancada: {
    notify:     ['financeiro'],
    auto_alert: false,
  },
  meta_em_risco: {
    notify:     ['trafego', 'dono'],
    auto_alert: true,
  },
  criativo_vencedor: {
    notify:     ['edicao', 'dono'],
    auto_alert: false,
  },
  conta_bloqueada: {
    notify:     ['trafego', 'dono'],
    auto_alert: true,
    suggest_action: {
      type:          'criar_tarefa',
      title:         'Desbloquear conta de anúncio',
      description:   'Conta bloqueada detectada. Acionar suporte da plataforma.',
      target_sector: 'trafego',
    },
  },
  plataforma_desconectada: {
    notify:     ['dev', 'dono'],
    auto_alert: true,
    suggest_action: {
      type:          'reconectar_plataforma',
      title:         'Reconectar plataforma',
      description:   'Integração desconectada. Verificar credenciais e webhook.',
      target_sector: 'dev',
    },
  },
  tracker_desconectado: {
    notify:     ['dev', 'trafego'],
    auto_alert: true,
    suggest_action: {
      type:          'reconectar_plataforma',
      title:         'Reconectar tracker de atribuição',
      description:   'Tracker desconectado. Dados de ROAS/criativo podem estar desatualizados.',
      target_sector: 'dev',
    },
  },
  recurso_caiu: {
    notify:     ['dev'],
    auto_alert: true,
    suggest_action: {
      type:          'criar_tarefa',
      title:         'Recurso fora do ar — verificar servidor',
      description:   'Página ou domínio com falha detectada.',
      target_sector: 'dev',
    },
  },
};
