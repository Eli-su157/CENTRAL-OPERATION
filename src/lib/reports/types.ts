// Estrutura do snapshot gerado automaticamente para cada relatório.
// Imutável após o congelamento — nunca reprocessar um relatório congelado.

export interface ReportFinanceiro {
  receita_bruta: number;
  taxas_plataforma: number;
  reembolsos: number;
  gasto_trafego: number;
  comissoes: number;
  custos_fixos: number;
  outros_custos: number;
  lucro_liquido: number;
  a_receber: number;
  a_pagar: number;
  total_entradas: number;
  total_saidas: number;
}

export interface ReportTrafego {
  gasto_total: number;
  faturamento_total: number;
  roas_confirmado: number;
  roas_projetado: number;
  campanhas_ativas: number;
  note: string; // ex: 'dados mock — swap real na Fase 9d'
}

export interface ReportProducao {
  materiais_entregues: number;
  materiais_no_ar: number;
  materiais_em_producao: number;
  criativo_destaque: string | null;
  roas_criativo_destaque: number | null;
  por_tipo: Record<string, number>;
}

export interface ReportOperacao {
  tarefas_concluidas: number;
  tarefas_atrasadas: number;
  tarefas_pendentes: number;
  total_tarefas: number;
  gargalos: { setor: string; quantidade: number }[];
}

export interface ReportData {
  period_type: 'semanal' | 'mensal';
  period_ref: string;
  period_start: string;
  period_end: string;
  financeiro: ReportFinanceiro;
  trafego: ReportTrafego;
  producao: ReportProducao;
  operacao: ReportOperacao;
  gerado_em: string;
}
