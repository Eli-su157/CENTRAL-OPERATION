// Camada de desempenho por criativo — MOCK até Fase 7 (integração nível-anúncio).
//
// IMPORTANTE: dados reais por criativo exigem a integração com a API do Meta Ads
// no nível de anúncio (não apenas campanha), casando pelo campo ad_reference da
// tabela materials com o ID/nome do criativo na plataforma. Isso é escopo da Fase 7.
//
// Para substituir por dado real: implemente getMaterialPerformance(materialId)
// consultando a tabela de métricas por anúncio (a criar na Fase 7) — a UI não muda.

export type MaterialVerdict = 'vencedor' | 'escalando' | 'testando' | 'morto' | 'sem_dados';

export interface MaterialPerformance {
  gasto: number;
  vendas: number;
  roas: number;
  impressoes: number;
  verdict: MaterialVerdict;
}

const PERF_PROFILES: MaterialPerformance[] = [
  { gasto: 6_400, vendas: 48, roas: 5.2, impressoes: 284_000, verdict: 'vencedor' },
  { gasto: 3_200, vendas: 21, roas: 4.1, impressoes: 148_000, verdict: 'escalando' },
  { gasto: 1_800, vendas: 12, roas: 3.6, impressoes: 89_000,  verdict: 'escalando' },
  { gasto: 900,   vendas: 6,  roas: 3.1, impressoes: 54_000,  verdict: 'testando' },
  { gasto: 1_200, vendas: 3,  roas: 1.6, impressoes: 71_000,  verdict: 'morto' },
  { gasto: 0,     vendas: 0,  roas: 0,   impressoes: 0,       verdict: 'sem_dados' },
];

export function getMaterialPerformance(materialId: string): MaterialPerformance {
  const code = (materialId.charCodeAt(0) ?? 0) + (materialId.charCodeAt(2) ?? 0);
  return PERF_PROFILES[code % PERF_PROFILES.length];
}

export const VERDICT_LABEL: Record<MaterialVerdict, string> = {
  vencedor:  'Vencedor',
  escalando: 'Escalando',
  testando:  'Testando',
  morto:     'Morto',
  sem_dados: 'Sem dados',
};

export const VERDICT_STYLE: Record<MaterialVerdict, string> = {
  vencedor:  'bg-emerald-950 border-emerald-700 text-emerald-400',
  escalando: 'bg-blue-950 border-blue-700 text-blue-400',
  testando:  'bg-amber-950 border-amber-700 text-amber-400',
  morto:     'bg-red-950 border-red-800 text-red-400',
  sem_dados: 'bg-zinc-800 border-zinc-700 text-zinc-500',
};
