// Camada de dados mock — estruturada como se fossem chamadas reais.
// Para integrar dados reais na Fase de Integrações, basta trocar a
// implementação destas funções sem alterar nada na UI.

export interface DashboardMetrics {
  summary: {
    faturamento_dia: number;
    lucro_liquido: number;
    roas: number;
    delta_faturamento: number; // % vs ontem
    delta_lucro: number;       // % vs ontem
    delta_roas: number;        // pts vs ontem
  };
  sales: {
    aprovadas_qtd: number;
    aprovadas_valor: number;
    ticket_medio: number;
    taxa_reembolso: number;  // %
    conversao_pix: number;   // %
    delta_valor: number;     // % vs ontem
  };
  traffic: {
    gasto_dia: number;
    roas: number;
    cpa: number;
    roi: number; // %
    plataformas: { nome: string; gasto: number; roas: number }[];
  };
  team: {
    tarefas_atrasadas: { setor: string; quantidade: number }[];
    entregas_pendentes: number;
    membros_ativos: number;
  };
  financial: {
    saldo: number;
    a_receber: number;
    a_pagar: number;
    projecao_mes: number;
  };
  alerts: {
    id: string;
    type: 'warning' | 'danger' | 'info';
    message: string;
  }[];
}

export interface ConsolidatedMetrics {
  faturamento_dia: number;
  lucro_liquido: number;
  roas: number;
  delta_faturamento: number;
  delta_lucro: number;
}

// Três perfis representando diferentes estágios de um produto
const PROFILE_A: DashboardMetrics = {
  summary: {
    faturamento_dia: 82_400,
    lucro_liquido: 30_900,
    roas: 4.48,
    delta_faturamento: 18.3,
    delta_lucro: 14.2,
    delta_roas: 0.42,
  },
  sales: {
    aprovadas_qtd: 42,
    aprovadas_valor: 82_400,
    ticket_medio: 1_962,
    taxa_reembolso: 2.4,
    conversao_pix: 87.3,
    delta_valor: 18.3,
  },
  traffic: {
    gasto_dia: 18_400,
    roas: 4.48,
    cpa: 438,
    roi: 68,
    plataformas: [
      { nome: 'Meta Ads', gasto: 11_200, roas: 4.6 },
      { nome: 'Google Ads', gasto: 7_200, roas: 4.3 },
    ],
  },
  team: {
    tarefas_atrasadas: [
      { setor: 'Edição', quantidade: 1 },
    ],
    entregas_pendentes: 3,
    membros_ativos: 7,
  },
  financial: {
    saldo: 128_500,
    a_receber: 42_000,
    a_pagar: 18_300,
    projecao_mes: 1_890_000,
  },
  alerts: [],
};

const PROFILE_B: DashboardMetrics = {
  summary: {
    faturamento_dia: 54_200,
    lucro_liquido: 18_200,
    roas: 3.87,
    delta_faturamento: 6.1,
    delta_lucro: 3.8,
    delta_roas: -0.11,
  },
  sales: {
    aprovadas_qtd: 28,
    aprovadas_valor: 54_200,
    ticket_medio: 1_936,
    taxa_reembolso: 3.1,
    conversao_pix: 82.1,
    delta_valor: 6.1,
  },
  traffic: {
    gasto_dia: 14_000,
    roas: 3.87,
    cpa: 500,
    roi: 30,
    plataformas: [
      { nome: 'Meta Ads', gasto: 9_800, roas: 3.9 },
      { nome: 'YouTube', gasto: 4_200, roas: 3.8 },
    ],
  },
  team: {
    tarefas_atrasadas: [
      { setor: 'Tráfego', quantidade: 2 },
      { setor: 'Edição', quantidade: 1 },
    ],
    entregas_pendentes: 5,
    membros_ativos: 6,
  },
  financial: {
    saldo: 78_200,
    a_receber: 28_000,
    a_pagar: 11_800,
    projecao_mes: 1_240_000,
  },
  alerts: [
    { id: 'a1', type: 'warning', message: 'Meta de faturamento em risco: 67% atingido com 5h restantes.' },
  ],
};

const PROFILE_C: DashboardMetrics = {
  summary: {
    faturamento_dia: 31_800,
    lucro_liquido: 7_400,
    roas: 2.94,
    delta_faturamento: -4.2,
    delta_lucro: -9.1,
    delta_roas: -0.33,
  },
  sales: {
    aprovadas_qtd: 18,
    aprovadas_valor: 31_800,
    ticket_medio: 1_767,
    taxa_reembolso: 5.2,
    conversao_pix: 71.4,
    delta_valor: -4.2,
  },
  traffic: {
    gasto_dia: 10_820,
    roas: 2.94,
    cpa: 601,
    roi: -8,
    plataformas: [
      { nome: 'Meta Ads', gasto: 10_820, roas: 2.94 },
    ],
  },
  team: {
    tarefas_atrasadas: [
      { setor: 'Tráfego', quantidade: 3 },
      { setor: 'Dev', quantidade: 2 },
    ],
    entregas_pendentes: 8,
    membros_ativos: 5,
  },
  financial: {
    saldo: 31_400,
    a_receber: 14_200,
    a_pagar: 9_600,
    projecao_mes: 720_000,
  },
  alerts: [
    { id: 'b1', type: 'danger', message: 'ROAS abaixo de 3x pelo 2° dia consecutivo. Revisar criativos.' },
    { id: 'b2', type: 'danger', message: 'Taxa de reembolso em 5,2% — acima do limite de 5%. Ação imediata.' },
    { id: 'b3', type: 'info', message: 'Conversão Pix caindo: 71,4% hoje vs 79,2% na semana passada.' },
  ],
};

function pickProfile(dashboardId: string): DashboardMetrics {
  const code = (dashboardId.charCodeAt(0) ?? 0) + (dashboardId.charCodeAt(2) ?? 0);
  const profiles = [PROFILE_A, PROFILE_B, PROFILE_C];
  return profiles[code % 3];
}

export function getDashboardMetrics(dashboardId: string): DashboardMetrics {
  return pickProfile(dashboardId);
}

export function getDashboardSummary(dashboardId: string): {
  faturamento_dia: number;
  lucro_liquido: number;
  roas: number;
  delta_faturamento: number;
} {
  const m = pickProfile(dashboardId);
  return {
    faturamento_dia: m.summary.faturamento_dia,
    lucro_liquido: m.summary.lucro_liquido,
    roas: m.summary.roas,
    delta_faturamento: m.summary.delta_faturamento,
  };
}

export function getConsolidatedMetrics(dashboardIds: string[]): ConsolidatedMetrics {
  if (dashboardIds.length === 0) {
    return { faturamento_dia: 0, lucro_liquido: 0, roas: 0, delta_faturamento: 0, delta_lucro: 0 };
  }
  const summaries = dashboardIds.map(id => pickProfile(id).summary);
  const total_fat = summaries.reduce((s, m) => s + m.faturamento_dia, 0);
  const total_lucro = summaries.reduce((s, m) => s + m.lucro_liquido, 0);
  const avg_roas = summaries.reduce((s, m) => s + m.roas, 0) / summaries.length;
  const avg_delta_fat = summaries.reduce((s, m) => s + m.delta_faturamento, 0) / summaries.length;
  const avg_delta_lucro = summaries.reduce((s, m) => s + m.delta_lucro, 0) / summaries.length;
  return {
    faturamento_dia: total_fat,
    lucro_liquido: total_lucro,
    roas: avg_roas,
    delta_faturamento: avg_delta_fat,
    delta_lucro: avg_delta_lucro,
  };
}
