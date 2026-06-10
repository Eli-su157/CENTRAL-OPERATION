// Dados reais de reconciliação UTMify × Plataforma.
//
// tracker_faturamento  = vendas aprovadas com UTM atribuído (sales.utm.source != null)
// plataforma_faturamento = total de vendas aprovadas do provider primário
//
// A divergência (< 8% = ok) mede quantas conversões o pixel/UTMify não capturou.

export interface ReconciliationData {
  tracker_faturamento:    number;
  plataforma_faturamento: number;
  attributed_count:       number;  // vendas com UTM atribuído
  total_count:            number;  // total vendas aprovadas
  has_data:               boolean;
}

interface RawSaleRow {
  amount: number;
  utm: Record<string, unknown> | null;
}

// Busca vendas aprovadas do dashboard no período e calcula os totais de reconciliação.
// primaryProvider: filtra o provider oficial de receita (igual ao usado no DRE).
export async function getReconciliationData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  dashboardId: string,
  primaryProvider: string | null,
  from: string,  // YYYY-MM-DD
  to: string     // YYYY-MM-DD
): Promise<ReconciliationData> {
  let query = supabase
    .from('sales')
    .select('amount, utm')
    .eq('dashboard_id', dashboardId)
    .eq('status', 'aprovado')
    .gte('occurred_at', from)
    .lte('occurred_at', `${to}T23:59:59.999Z`);

  if (primaryProvider) {
    query = query.eq('provider', primaryProvider);
  }

  const { data } = await query;
  const rows = (data ?? []) as RawSaleRow[];

  if (rows.length === 0) {
    return {
      tracker_faturamento: 0,
      plataforma_faturamento: 0,
      attributed_count: 0,
      total_count: 0,
      has_data: false,
    };
  }

  let plataforma = 0;
  let tracker    = 0;
  let attributed = 0;

  for (const row of rows) {
    const amt = Number(row.amount);
    plataforma += amt;

    // Considera "atribuído" quando utm.source está preenchido
    const utmSource = row.utm?.['source'] ?? row.utm?.['utm_source'];
    if (utmSource) {
      tracker    += amt;
      attributed += 1;
    }
  }

  return {
    tracker_faturamento:    tracker,
    plataforma_faturamento: plataforma,
    attributed_count:       attributed,
    total_count:            rows.length,
    has_data:               true,
  };
}
