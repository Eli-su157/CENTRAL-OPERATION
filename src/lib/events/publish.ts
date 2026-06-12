// publishEvent — grava o evento no log e dispara automações.
// Chamado de: webhooks de venda, webhook de tracker, health-check, finance actions.
// Todas as chamadas usam o admin client (service role) para bypassar RLS.

import { processEventRules } from './rules';
import type { AppEvent } from './types';

export async function publishEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  event: Omit<AppEvent, 'id' | 'created_at'>
): Promise<void> {
  try {
    const { data: inserted } = await admin
      .from('events')
      .insert({
        operation_id: event.operation_id,
        dashboard_id: event.dashboard_id,
        type:         event.type,
        payload:      event.payload,
      })
      .select('id')
      .single();

    // Dispara regras de forma assíncrona (fire-and-forget com catch silencioso)
    // Não propaga erro para não bloquear o webhook que chamou publishEvent
    processEventRules(admin, { ...event, id: inserted?.id }).catch(() => {});
  } catch {
    // publishEvent nunca deve quebrar o fluxo do chamador
  }
}
