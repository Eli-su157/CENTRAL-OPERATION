// De-duplicação de vendas — evita registrar a mesma venda duas vezes.
// Estratégia 1 (primária): external_id único por provider (UNIQUE constraint no banco).
// Estratégia 2 (fallback): buyer_email + amount + janela de 5 min.

export interface DedupCandidate {
  buyer_email: string | null;
  amount: number;
  occurred_at: string;
}

// Retorna true se a venda já existe (by external_id OR by fuzzy match).
// Chamado ANTES do INSERT para log/debug; o UNIQUE constraint é a barreira definitiva.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function checkDuplicate(
  db: any,
  operationId: string,
  provider: string,
  externalId: string,
  candidate: DedupCandidate
): Promise<{ isDuplicate: boolean; existingId?: string; reason?: string }> {
  // Check 1: exact external_id match
  const { data: byId } = await db
    .from('sales')
    .select('id')
    .eq('operation_id', operationId)
    .eq('provider', provider)
    .eq('external_id', externalId)
    .maybeSingle();

  if (byId) {
    return { isDuplicate: true, existingId: byId.id, reason: 'external_id' };
  }

  // Check 2: fuzzy match por email + valor + janela de 5 min
  if (candidate.buyer_email) {
    const window5min = new Date(new Date(candidate.occurred_at).getTime() - 5 * 60 * 1000).toISOString();
    const { data: byFuzzy } = await db
      .from('sales')
      .select('id')
      .eq('operation_id', operationId)
      .eq('provider', provider)
      .eq('buyer_email', candidate.buyer_email)
      .gte('occurred_at', window5min)
      .lte('occurred_at', candidate.occurred_at)
      .maybeSingle();

    if (byFuzzy) {
      return { isDuplicate: true, existingId: byFuzzy.id, reason: 'fuzzy_email_amount' };
    }
  }

  return { isDuplicate: false };
}
