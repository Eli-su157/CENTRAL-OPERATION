// Tipos normalizados do motor de integrações.
// Organizado por FUNÇÃO (venda, atribuição, tráfego), não por plataforma.

export type SaleStatus = 'pix_gerado' | 'pix_pago' | 'aprovado' | 'reembolsado' | 'chargeback';
export type SaleProvider = 'hotmart' | 'paradise' | 'vega' | 'shopify';

// Evento de venda normalizado — saída de qualquer SaleAdapter
export interface SaleEvent {
  external_id:  string;        // ID único na plataforma de origem
  provider:     SaleProvider;
  status:       SaleStatus;
  amount:       number;        // valor bruto em BRL
  fees:         number;        // taxas da plataforma em BRL
  buyer_email:  string | null;
  occurred_at:  string;        // ISO datetime
  utm: {
    source:    string | null;
    medium:    string | null;
    campaign:  string | null;
    content:   string | null;
    term:      string | null;
  };
  raw: Record<string, unknown>; // payload original para auditoria
}

// Interface que cada adaptador de plataforma deve implementar
export interface SaleAdapter {
  provider: SaleProvider;
  // Valida a assinatura/segredo do webhook (retorna true se válido)
  validateSignature(payload: unknown, rawBody: string, secret: string): boolean;
  // Converte o payload bruto para SaleEvent normalizado (null = ignorar)
  parse(payload: unknown): SaleEvent | null;
}

// ----------------------------------------------------------------
// Atribuição (UTMify e similares) — NÃO cria vendas, só enriquece
// ----------------------------------------------------------------

// Evento de atribuição normalizado — saída do UTMifyAdapter
export interface AttributionEvent {
  // Para casamento com a venda existente em sales
  external_id:  string | null;   // ID da transação na plataforma de pagamento
  buyer_email:  string | null;
  amount:       number;           // valor para matching fuzzy
  occurred_at:  string;           // ISO datetime

  // Dados UTM a gravar em sales.utm
  utm: {
    source:    string | null;
    medium:    string | null;
    campaign:  string | null;
    content:   string | null;
    term:      string | null;
  };

  // Dados de nível de anúncio — reservados para Fase 9e
  ad_data: {
    campaign_id:   string | null;
    adset_id:      string | null;
    ad_id:         string | null;
    campaign_name: string | null;
    adset_name:    string | null;
    ad_name:       string | null;
    platform:      string | null;
  };

  raw: Record<string, unknown>;
}

export interface AttributionAdapter {
  provider: 'utmify';
  validateSignature(payload: unknown, rawBody: string, secret: string): boolean;
  parse(payload: unknown): AttributionEvent | null;
}

// Conexão de integração vinda do banco (sem credentials_encrypted)
export interface IntegrationConfig {
  id:          string;
  operation_id: string;
  dashboard_id: string | null;
  provider:    string;
  category:    string;
  status:      string;
  config:      Record<string, unknown>;
}
