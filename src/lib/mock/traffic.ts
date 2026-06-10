// Camada mock de tráfego — espelha a futura fonte real (Meta/Google Ads API).
// Assinatura pronta para swap: basta trocar a implementação de getTrafficData()
// sem alterar nada na UI. Nível: conta + campanha (não conjunto/anúncio — Fase 6+).

export type AdAccountStatus = 'ativa' | 'limitada' | 'bloqueada';
export type CampaignSemaphore = 'escalar' | 'observar' | 'matar';

export interface AdAccount {
  id: string;
  name: string;
  platform: 'Meta Ads' | 'Google Ads' | 'YouTube' | 'Kwai';
  status: AdAccountStatus;
  gasto_dia: number;
  limite_dia: number | null;
}

export interface Campaign {
  id: string;
  account_id: string;
  account_name: string;
  platform: string;
  name: string;
  status: 'ativa' | 'pausada';
  gasto_dia: number;
  impressoes: number;
  cliques: number;
  ctr: number;           // %
  cpc: number;           // R$
  checkout_iniciado: number;
  pix_gerado: number;
  pix_pago: number;
  cartao_aprovado: number;
  vendas_confirmadas: number;
  roas_confirmado: number;  // só venda paga — NÚMERO OFICIAL
  roas_projetado: number;   // confirmado + pix gerado via taxa histórica
  cpa: number;
  semaforo: CampaignSemaphore;
}

export interface DailyPoint {
  date: string;      // YYYY-MM-DD
  gasto: number;
  faturamento: number;
  roas_confirmado: number;
  roas_projetado: number;
}

export interface TrafficData {
  // Resumo do dia (para SummaryStrip e TrafficBlock)
  gasto_dia: number;
  faturamento_dia: number;
  roas_confirmado: number;   // OFICIAL — só vendas pagas
  roas_projetado: number;    // apoio — inclui pix gerado não pago
  cpa: number;
  roi: number;               // %

  // Reconciliação de fontes
  tracker_faturamento: number;   // UTMify/tracker atribuído
  plataforma_faturamento: number; // confirmado pela plataforma

  // Contas de anúncio
  accounts: AdAccount[];

  // Campanhas (ordenáveis, com semáforo)
  campaigns: Campaign[];

  // Funil agregado
  funil: {
    impressoes: number;
    cliques: number;
    checkout_iniciado: number;
    pix_gerado: number;
    pix_pago: number;
    cartao_aprovado: number;
    vendas_confirmadas: number;
  };

  // Série temporal dos últimos 30 dias
  series: DailyPoint[];

  // Alertas
  alertas: {
    id: string;
    type: 'warning' | 'danger' | 'info';
    message: string;
  }[];
}

// Perfis de tráfego — determinísticos por dashboardId
const TRAFFIC_A: Omit<TrafficData, 'series'> = {
  gasto_dia: 18_400,
  faturamento_dia: 82_400,
  roas_confirmado: 4.48,
  roas_projetado: 4.82,
  cpa: 438,
  roi: 68,
  tracker_faturamento: 79_800,
  plataforma_faturamento: 82_400,
  accounts: [
    { id: 'a1', name: 'BM Principal', platform: 'Meta Ads', status: 'ativa', gasto_dia: 11_200, limite_dia: 15_000 },
    { id: 'a2', name: 'Google Performance', platform: 'Google Ads', status: 'ativa', gasto_dia: 7_200, limite_dia: null },
  ],
  campaigns: [
    {
      id: 'c1', account_id: 'a1', account_name: 'BM Principal', platform: 'Meta Ads',
      name: 'CBO — VSL 28min — Retenção Alta', status: 'ativa',
      gasto_dia: 6_800, impressoes: 245_000, cliques: 3_920, ctr: 1.6, cpc: 1.73,
      checkout_iniciado: 312, pix_gerado: 148, pix_pago: 128, cartao_aprovado: 32,
      vendas_confirmadas: 160, roas_confirmado: 5.12, roas_projetado: 5.58, cpa: 425,
      semaforo: 'escalar',
    },
    {
      id: 'c2', account_id: 'a1', account_name: 'BM Principal', platform: 'Meta Ads',
      name: 'ABO — Criativos Novos — Fase Teste', status: 'ativa',
      gasto_dia: 4_400, impressoes: 187_000, cliques: 2_244, ctr: 1.2, cpc: 1.96,
      checkout_iniciado: 198, pix_gerado: 87, pix_pago: 65, cartao_aprovado: 18,
      vendas_confirmadas: 83, roas_confirmado: 3.89, roas_projetado: 4.22, cpa: 530,
      semaforo: 'observar',
    },
    {
      id: 'c3', account_id: 'a2', account_name: 'Google Performance', platform: 'Google Ads',
      name: 'PMAX — Conversão — Pix', status: 'ativa',
      gasto_dia: 7_200, impressoes: 312_000, cliques: 5_616, ctr: 1.8, cpc: 1.28,
      checkout_iniciado: 421, pix_gerado: 198, pix_pago: 171, cartao_aprovado: 45,
      vendas_confirmadas: 216, roas_confirmado: 4.32, roas_projetado: 4.75, cpa: 333,
      semaforo: 'escalar',
    },
  ],
  funil: {
    impressoes: 744_000, cliques: 11_780, checkout_iniciado: 931,
    pix_gerado: 433, pix_pago: 364, cartao_aprovado: 95, vendas_confirmadas: 459,
  },
  alertas: [],
};

const TRAFFIC_B: Omit<TrafficData, 'series'> = {
  gasto_dia: 14_000,
  faturamento_dia: 54_200,
  roas_confirmado: 3.87,
  roas_projetado: 4.15,
  cpa: 500,
  roi: 30,
  tracker_faturamento: 51_800,
  plataforma_faturamento: 54_200,
  accounts: [
    { id: 'b1', name: 'BM Teste', platform: 'Meta Ads', status: 'limitada', gasto_dia: 9_800, limite_dia: 12_000 },
    { id: 'b2', name: 'YouTube Brand', platform: 'YouTube', status: 'ativa', gasto_dia: 4_200, limite_dia: null },
  ],
  campaigns: [
    {
      id: 'c4', account_id: 'b1', account_name: 'BM Teste', platform: 'Meta Ads',
      name: 'CBO — Público Lookalike 3%', status: 'ativa',
      gasto_dia: 9_800, impressoes: 198_000, cliques: 2_376, ctr: 1.2, cpc: 4.12,
      checkout_iniciado: 189, pix_gerado: 95, pix_pago: 72, cartao_aprovado: 18,
      vendas_confirmadas: 90, roas_confirmado: 3.87, roas_projetado: 4.15, cpa: 500,
      semaforo: 'observar',
    },
    {
      id: 'c5', account_id: 'b2', account_name: 'YouTube Brand', platform: 'YouTube',
      name: 'Bumper Ads — Remarketing', status: 'ativa',
      gasto_dia: 4_200, impressoes: 421_000, cliques: 1_263, ctr: 0.3, cpc: 3.32,
      checkout_iniciado: 84, pix_gerado: 38, pix_pago: 29, cartao_aprovado: 7,
      vendas_confirmadas: 36, roas_confirmado: 3.62, roas_projetado: 3.95, cpa: 611,
      semaforo: 'observar',
    },
  ],
  funil: {
    impressoes: 619_000, cliques: 3_639, checkout_iniciado: 273,
    pix_gerado: 133, pix_pago: 101, cartao_aprovado: 25, vendas_confirmadas: 126,
  },
  alertas: [
    { id: 'ta1', type: 'warning', message: 'BM Teste com limite diário próximo: R$ 9.800 de R$ 12.000 (81%).' },
  ],
};

const TRAFFIC_C: Omit<TrafficData, 'series'> = {
  gasto_dia: 10_820,
  faturamento_dia: 31_800,
  roas_confirmado: 2.94,
  roas_projetado: 3.12,
  cpa: 601,
  roi: -8,
  tracker_faturamento: 29_400,
  plataforma_faturamento: 31_800,
  accounts: [
    { id: 'd1', name: 'BM Secundária', platform: 'Meta Ads', status: 'bloqueada', gasto_dia: 0, limite_dia: 8_000 },
    { id: 'd2', name: 'BM Reserva', platform: 'Meta Ads', status: 'ativa', gasto_dia: 10_820, limite_dia: 15_000 },
  ],
  campaigns: [
    {
      id: 'c6', account_id: 'd2', account_name: 'BM Reserva', platform: 'Meta Ads',
      name: 'ABO — VSL 12min — Cold', status: 'ativa',
      gasto_dia: 10_820, impressoes: 312_000, cliques: 2_184, ctr: 0.7, cpc: 4.95,
      checkout_iniciado: 152, pix_gerado: 61, pix_pago: 40, cartao_aprovado: 13,
      vendas_confirmadas: 53, roas_confirmado: 2.94, roas_projetado: 3.12, cpa: 601,
      semaforo: 'matar',
    },
  ],
  funil: {
    impressoes: 312_000, cliques: 2_184, checkout_iniciado: 152,
    pix_gerado: 61, pix_pago: 40, cartao_aprovado: 13, vendas_confirmadas: 53,
  },
  alertas: [
    { id: 'ta2', type: 'danger', message: 'BM Secundária BLOQUEADA. Migrar verba para BM Reserva imediatamente.' },
    { id: 'ta3', type: 'danger', message: 'ROAS confirmado (2.94x) abaixo do alvo por 2 dias consecutivos.' },
    { id: 'ta4', type: 'warning', message: 'Conversão Pix: 65,6% — queda de 12 pontos vs semana passada.' },
    { id: 'ta5', type: 'info', message: 'Pixel sem disparar evento Purchase nas últimas 3 horas.' },
  ],
};

function buildSeries(baseRoas: number, baseGasto: number, baseFat: number): DailyPoint[] {
  const today = new Date();
  const points: DailyPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const jitter = 0.85 + Math.random() * 0.30;
    const gasto = Math.round(baseGasto * jitter);
    const fat = Math.round(baseFat * jitter);
    points.push({
      date: d.toISOString().split('T')[0],
      gasto,
      faturamento: fat,
      roas_confirmado: parseFloat((fat / gasto).toFixed(2)),
      roas_projetado: parseFloat(((fat * 1.07) / gasto).toFixed(2)),
    });
  }
  return points;
}

function pickProfile(dashboardId: string): Omit<TrafficData, 'series'> {
  const code = (dashboardId.charCodeAt(0) ?? 0) + (dashboardId.charCodeAt(2) ?? 0);
  const profiles = [TRAFFIC_A, TRAFFIC_B, TRAFFIC_C];
  return profiles[code % 3];
}

export function getTrafficData(dashboardId: string, _period?: string): TrafficData {
  const profile = pickProfile(dashboardId);
  return {
    ...profile,
    series: buildSeries(profile.roas_confirmado, profile.gasto_dia, profile.faturamento_dia),
  };
}

// Summary compacto para o TrafficBlock no dashboard principal
export function getTrafficSummary(dashboardId: string) {
  const { gasto_dia, roas_confirmado, roas_projetado, cpa, roi } = pickProfile(dashboardId);
  return { gasto_dia, roas_confirmado, roas_projetado, cpa, roi };
}
