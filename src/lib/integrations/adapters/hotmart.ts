// Adaptador Hotmart — fonte primária de vendas mais comum no mercado brasileiro.
// Docs: https://developers.hotmart.com/docs/pt-BR/v2/events/purchase-events/
//
// Eventos suportados:
//   PURCHASE_COMPLETE  → aprovado
//   PURCHASE_APPROVED  → aprovado
//   PURCHASE_BILLET_PRINTED → pix_gerado (boleto/pix gerado)
//   PURCHASE_CANCELED  → ignorado
//   PURCHASE_REFUNDED  → reembolsado
//   PURCHASE_CHARGEBACK → chargeback
//   PURCHASE_PROTEST   → chargeback

import crypto from 'crypto';
import type { SaleAdapter, SaleEvent } from '../types';

const STATUS_MAP: Record<string, SaleEvent['status'] | null> = {
  PURCHASE_COMPLETE:       'aprovado',
  PURCHASE_APPROVED:       'aprovado',
  PURCHASE_BILLET_PRINTED: 'pix_gerado',
  PURCHASE_PROTEST:        'chargeback',
  PURCHASE_REFUNDED:       'reembolsado',
  PURCHASE_CHARGEBACK:     'chargeback',
  PURCHASE_CANCELED:       null, // ignorar
};

export const hotmartAdapter: SaleAdapter = {
  provider: 'hotmart',

  validateSignature(payload: unknown, rawBody: string, secret: string): boolean {
    // Hotmart assina com HMAC-SHA256 no header hottok (versão antiga)
    // ou via X-Hotmart-Hottok no header com hash do body
    // Aqui validamos via hash do payload
    try {
      const expected = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');
      const received = (payload as Record<string, unknown>)?.['hottok'] as string ?? '';
      return crypto.timingSafeEqual(
        Buffer.from(expected, 'hex'),
        Buffer.from(received.padEnd(expected.length, '0').slice(0, expected.length), 'hex')
      );
    } catch {
      return false; // em dev sem segredo configurado, aceita
    }
  },

  parse(payload: unknown): SaleEvent | null {
    const p = payload as Record<string, unknown>;
    const event = p['event'] as string;
    const status = STATUS_MAP[event];

    if (status === undefined) return null; // evento desconhecido
    if (status === null) return null;      // evento ignorado (CANCELED etc.)

    const data = (p['data'] as Record<string, unknown>) ?? {};
    const purchase = (data['purchase'] as Record<string, unknown>) ?? {};
    const buyer    = (data['buyer'] as Record<string, unknown>) ?? {};
    const prod     = (data['product'] as Record<string, unknown>) ?? {};

    // external_id: transaction ID do Hotmart
    const external_id = (purchase['transaction'] as string) ?? (purchase['order_id'] as string) ?? '';
    if (!external_id) return null;

    const price = (purchase['price'] as Record<string, unknown>) ?? {};
    const amount = Number(price['value'] ?? 0);
    const fees   = Number((purchase['commission'] as Record<string, unknown>)?.['total_amount'] ?? 0);

    // UTMs: Hotmart envia em purchase.tracking_source
    const tracking = (purchase['tracking_source'] as Record<string, unknown>) ?? {};

    return {
      external_id,
      provider:    'hotmart',
      status,
      amount,
      fees,
      buyer_email: (buyer['email'] as string) ?? null,
      occurred_at: (purchase['date_next_charge'] as string)
        ?? (purchase['approved_date'] as string)
        ?? new Date().toISOString(),
      utm: {
        source:   (tracking['source_sck'] as string) ?? null,
        medium:   null,
        campaign: (tracking['sck'] as string) ?? null,
        content:  null,
        term:     null,
      },
      raw: p,
    };
  },
};
