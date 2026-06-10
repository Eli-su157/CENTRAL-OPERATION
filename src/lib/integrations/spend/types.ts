// Tipos do motor de spend (pull de gasto de tráfego).
// Espelha o padrão dos sale adapters: interface por provider, isolada e trocável.

export type SpendProvider = 'meta_ads' | 'google_ads';
export type AccountStatus = 'ativa' | 'limitada' | 'bloqueada';
export type CampaignStatus = 'ativa' | 'pausada';

// Um registro de gasto diário por campanha — shape normalizado de qualquer provider
export interface SpendRecord {
  account_id:      string;
  account_name:    string;
  account_status:  AccountStatus;
  campaign_id:     string;
  campaign_name:   string;
  campaign_status: CampaignStatus;
  spend:           number;      // R$ (ou currency)
  impressions:     number;
  clicks:          number;
  results:         number;      // conversões reportadas pela plataforma
  currency:        string;
  spend_date:      string;      // YYYY-MM-DD
}

// Interface que cada provider implementa
export interface SpendAdapter {
  provider: SpendProvider;
  // Puxa gasto/métricas do período (geralmente today).
  // credentials: JSON decriptado das integration_connections.
  // config: campo config da connection (account_id, etc.).
  // Throws em erro fatal; retorna [] se sem dados.
  pull(
    credentials: Record<string, string>,
    config: Record<string, unknown>,
    dateFrom: string,  // YYYY-MM-DD
    dateTo: string     // YYYY-MM-DD
  ): Promise<SpendRecord[]>;
}
