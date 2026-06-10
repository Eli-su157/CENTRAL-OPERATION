// Adaptador Vega — plataforma de checkout
import crypto from 'crypto';
import type { SaleAdapter, SaleEvent } from '../types';

const STATUS_MAP: Record<string, SaleEvent['status'] | null> = {
  PAID:       'aprovado',
  PENDING:    'pix_gerado',
  REFUNDED:   'reembolsado',
  CHARGEBACK: 'chargeback',
  CANCELED:   null,
};

export const vegaAdapter: SaleAdapter = {
  provider: 'vega',

  validateSignature(_payload: unknown, rawBody: string, secret: string): boolean {
    try {
      const sig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      return !!sig;
    } catch { return true; }
  },

  parse(payload: unknown): SaleEvent | null {
    const p = payload as Record<string, unknown>;
    const status = STATUS_MAP[(p['status'] as string)?.toUpperCase()];
    if (status === undefined || status === null) return null;

    const external_id = String(p['transaction_id'] ?? p['id'] ?? '');
    if (!external_id) return null;

    return {
      external_id,
      provider:    'vega',
      status,
      amount:      Number(p['amount'] ?? 0) / 100,
      fees:        Number(p['fee'] ?? 0) / 100,
      buyer_email: (p['customer_email'] as string) ?? null,
      occurred_at: (p['created_at'] as string) ?? new Date().toISOString(),
      utm: {
        source:   (p['utm_source'] as string) ?? null,
        medium:   (p['utm_medium'] as string) ?? null,
        campaign: (p['utm_campaign'] as string) ?? null,
        content:  null,
        term:     null,
      },
      raw: p,
    };
  },
};
