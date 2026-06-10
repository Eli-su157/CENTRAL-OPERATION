// Desempenho real de criativos via ad_performance + sales.
// Casamento: materials.ad_reference == ad_id (exato) OU ad_name (case-insensitive).
// Receita atribuída: sales.utm->>'content' == ad_name OU sales.utm->>'term' == ad_id.

import type { MaterialPerformance, MaterialVerdict } from '@/lib/mock/materials';

export interface RealMaterialPerformance extends MaterialPerformance {
  source: 'real' | 'mock';
  ad_id: string | null;
  ad_name: string | null;
  fetched_at: string | null;
  cliques: number;
}

// Shape mínimo necessário das linhas de ad_performance
export interface AdPerfRow {
  ad_id:      string;
  ad_name:    string;
  spend:      number;
  impressions: number;
  clicks:     number;
  results:    number;
  fetched_at: string;
}

// Shape mínimo das vendas com UTM para atribuição
export interface SaleForPerf {
  amount:   number;
  utm:      Record<string, string | null> | null;
}

// Thresholds para veredito
const MIN_SPEND_TO_EVALUATE = 200;   // R$ — abaixo disso é 'testando'
const WINNER_MULTIPLIER     = 1.3;   // ROAS >= alvo * 1.3 → vencedor
const OK_MULTIPLIER         = 0.85;  // ROAS >= alvo * 0.85 → escalando
const DEAD_MULTIPLIER        = 0.5;  // ROAS < alvo * 0.5 → morto

function computeVerdict(roas: number, spend: number, roasAlvo: number): MaterialVerdict {
  if (spend < MIN_SPEND_TO_EVALUATE) return 'testando';
  if (roas >= roasAlvo * WINNER_MULTIPLIER) return 'vencedor';
  if (roas >= roasAlvo * OK_MULTIPLIER)    return 'escalando';
  if (roas < roasAlvo * DEAD_MULTIPLIER)   return 'morto';
  return 'testando';
}

// Computa o desempenho real de um criativo a partir dos dados agregados.
// Retorna null se não houver ad_performance para o ad_reference do material.
export function computeMaterialPerformance(
  adReference: string | null,
  adPerfRows: AdPerfRow[],
  sales: SaleForPerf[],
  roasAlvo = 3.0
): RealMaterialPerformance | null {
  if (!adReference || adPerfRows.length === 0) return null;

  const normalizedRef = adReference.toLowerCase().trim();

  // Casamento: ad_id exato (preferencial) ou ad_name case-insensitive
  const matchedRows = adPerfRows.filter(r =>
    r.ad_id === adReference ||
    r.ad_name.toLowerCase().trim() === normalizedRef
  );

  if (matchedRows.length === 0) return null;

  // Agrega métricas do período
  const spend      = matchedRows.reduce((s, r) => s + Number(r.spend), 0);
  const impressoes = matchedRows.reduce((s, r) => s + Number(r.impressions), 0);
  const cliques    = matchedRows.reduce((s, r) => s + Number(r.clicks), 0);

  // Referências para atribuição por UTM
  const adId   = matchedRows[0].ad_id;
  const adName = matchedRows[0].ad_name.toLowerCase();

  // Atribuição de receita: vendas cujo utm.content casa com ad_name ou utm.term com ad_id
  const attributedSales = sales.filter(s => {
    const content = (s.utm?.['content'] ?? '').toLowerCase().trim();
    const term    = (s.utm?.['term']    ?? '').toLowerCase().trim();
    return content === adName || content === adId || term === adId;
  });

  const revenue = attributedSales.reduce((s, sale) => s + Number(sale.amount), 0);
  const vendas  = attributedSales.length;
  const roas    = spend > 0 ? revenue / spend : 0;
  const verdict = computeVerdict(roas, spend, roasAlvo);

  const fetched_at = matchedRows.reduce(
    (best, r) => (!best || r.fetched_at > best ? r.fetched_at : best),
    null as string | null
  );

  return {
    gasto:      spend,
    vendas,
    roas,
    impressoes,
    cliques,
    verdict,
    source:     'real',
    ad_id:      adId,
    ad_name:    matchedRows[0].ad_name,
    fetched_at,
  };
}

// Busca linhas de ad_performance agregadas por ad_id para um dashboard no período.
export async function fetchAdPerformance(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  dashboardId: string,
  from: string,  // YYYY-MM-DD
  to: string
): Promise<AdPerfRow[]> {
  const { data } = await supabase
    .from('ad_performance')
    .select('ad_id, ad_name, spend, impressions, clicks, results, fetched_at')
    .eq('dashboard_id', dashboardId)
    .gte('spend_date', from)
    .lte('spend_date', to);
  return (data ?? []) as AdPerfRow[];
}

// Retorna lista única de (ad_id, ad_name) para o seletor de vínculo manual.
export function getAvailableAds(
  adPerfRows: AdPerfRow[]
): { ad_id: string; ad_name: string }[] {
  const seen = new Map<string, string>();
  for (const r of adPerfRows) {
    if (!seen.has(r.ad_id)) seen.set(r.ad_id, r.ad_name);
  }
  return Array.from(seen.entries())
    .map(([ad_id, ad_name]) => ({ ad_id, ad_name }))
    .sort((a, b) => a.ad_name.localeCompare(b.ad_name));
}
