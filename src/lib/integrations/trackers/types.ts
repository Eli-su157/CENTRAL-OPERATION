// Camada de Tracker — modelo interno de métricas de atribuição.
//
// O sistema NÃO conhece "UTMify" — conhece TrackerSaleEvent e TrackerAggregateEvent.
// Cada plataforma (UTMify, Hyros, RedTrack…) implementa TrackerAdapter e mapeia
// seu payload para esse modelo. A UI lê TrackerMetrics — independente da fonte.

// ── Tipos de evento que o webhook do tracker pode enviar ──────────────────────

/** Venda individual atribuída pelo tracker */
export interface TrackerSaleEvent {
  // Casamento com a venda na plataforma de pagamento
  external_id:    string | null;
  buyer_email:    string | null;
  amount:         number;
  status:         string;         // 'aprovado' | 'reembolsado' | 'chargeback' | ...
  occurred_at:    string;         // ISO 8601

  // Atribuição de anúncio
  campaign_id:    string | null;
  campaign_name:  string | null;
  adset_id:       string | null;
  adset_name:     string | null;
  ad_id:          string | null;
  ad_name:        string | null;
  platform:       string | null;  // 'facebook_ads' | 'google_ads' | 'tiktok_ads' | ...

  // UTM
  utm_source:     string | null;
  utm_medium:     string | null;
  utm_campaign:   string | null;
  utm_content:    string | null;
  utm_term:       string | null;

  raw: Record<string, unknown>;
}

/** Resumo agregado diário/por-campanha do tracker.
 *  Trackers como Hyros/RedTrack enviam esse tipo — inclui spend + ROAS prontos.
 *  UTMify não envia; é gerado localmente a partir de tracker_sales. */
export interface TrackerAggregateEvent {
  aggregate_date:  string;        // YYYY-MM-DD
  campaign_id:     string | null;
  campaign_name:   string | null;
  adset_id:        string | null;
  ad_id:           string | null;
  ad_name:         string | null;

  // Métricas prontas do tracker (ROAS/ROI calculados pela plataforma)
  spend:           number;
  revenue:         number;
  attributed_sales: number;
  roas:            number;
  roi:             number;

  raw: Record<string, unknown>;
}

export type TrackerEventKind = 'sale' | 'aggregate';

// ── Interface que cada adaptador de tracker deve implementar ──────────────────

export interface TrackerAdapter {
  provider:        string;

  /** Valida a assinatura do webhook (retorna true se válido ou sem segredo) */
  validateSignature(payload: unknown, rawBody: string, secret: string): boolean;

  /** Detecta o tipo de evento: 'sale', 'aggregate' ou null (ignorar) */
  detectKind(payload: unknown): TrackerEventKind | null;

  /** Mapeia para TrackerSaleEvent (chamado quando detectKind='sale') */
  parseSale(payload: unknown): TrackerSaleEvent | null;

  /** Mapeia para TrackerAggregateEvent (chamado quando detectKind='aggregate') */
  parseAggregate(payload: unknown): TrackerAggregateEvent | null;
}

// ── Modelo interno agregado — o que a UI de tráfego consome ──────────────────

export interface TrackerCampaignMetrics {
  campaign_id:       string;
  campaign_name:     string;
  ad_id:             string | null;
  ad_name:           string | null;
  platform:          string | null;

  // Vindos do tracker (fonte de verdade)
  attributed_revenue: number;
  attributed_sales:   number;

  // Spend pode vir de tracker_aggregates ou de ad_spend (complementar)
  spend:             number;
  roas:              number;   // attributed_revenue / spend (0 se sem spend)
  roi:               number;   // (revenue - spend) / spend × 100
}

export interface TrackerDailySeries {
  date:               string;   // YYYY-MM-DD
  attributed_revenue: number;
  attributed_sales:   number;
  spend:              number;   // 0 se sem dado de spend
}

export interface TrackerMetrics {
  provider:                  string;

  // Totais do período
  total_attributed_revenue:  number;
  total_attributed_sales:    number;
  total_spend:               number;    // de tracker_aggregates ou ad_spend
  overall_roas:              number;    // total_revenue / total_spend
  overall_roi:               number;

  // Top criativo
  top_ad: {
    ad_id:    string;
    ad_name:  string;
    revenue:  number;
    sales:    number;
    roas:     number;
  } | null;

  // Breakdown por campanha/criativo (para DecisaoTable)
  campaigns:  TrackerCampaignMetrics[];

  // Série temporal (para TemporalChart)
  series:     TrackerDailySeries[];

  // Quando o dado mais recente foi recebido
  fetched_at: string | null;
}
