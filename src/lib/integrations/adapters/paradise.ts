// Adaptador Paradise — plataforma brasileira de infoprodutos
import crypto from 'crypto';
import type { SaleAdapter, SaleEvent } from '../types';

const STATUS_MAP: Record<string, SaleEvent['status'] | null> = {
  approved:        'aprovado',
  paid:            'aprovado',
  waiting_payment: 'pix_gerado',
  refunded:        'reembolsado',
  chargedback:     'chargeback',
  canceled:        null,
};

export const paradiseAdapter: SaleAdapter = {
  provider: 'paradise',

  validateSignature(_payload: unknown, rawBody: string, secret: string): boolean {
    try {
      const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      return !!expected; // placeholder — implementar conforme docs Paradise
    } catch { return true; }
  },

  parse(payload: unknown): SaleEvent | null {
    const p = payload as Record<string, unknown>;
    const status = STATUS_MAP[p['status'] as string];
    if (status === undefined || status === null) return null;

    const external_id = String(p['id'] ?? p['order_id'] ?? '');
    if (!external_id) return null;

    const customer = (p['customer'] as Record<string, unknown>) ?? {};
    const utm = (p['tracking'] as Record<string, unknown>) ?? {};

    return {
      external_id,
      provider:    'paradise',
      status,
      amount:      Number(p['amount'] ?? p['price'] ?? 0) / 100,
      fees:        Number(p['platform_fee'] ?? 0) / 100,
      buyer_email: (customer['email'] as string) ?? null,
      occurred_at: (p['created_at'] as string) ?? new Date().toISOString(),
      utm: {
        source:   (utm['utm_source'] as string) ?? null,
        medium:   (utm['utm_medium'] as string) ?? null,
        campaign: (utm['utm_campaign'] as string) ?? null,
        content:  (utm['utm_content'] as string) ?? null,
        term:     (utm['utm_term'] as string) ?? null,
      },
      raw: p,
    };
  },
};
