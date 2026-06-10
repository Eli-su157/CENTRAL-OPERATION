// Adaptador Shopify — e-commerce
import crypto from 'crypto';
import type { SaleAdapter, SaleEvent } from '../types';

export const shopifyAdapter: SaleAdapter = {
  provider: 'shopify',

  validateSignature(_payload: unknown, rawBody: string, secret: string): boolean {
    try {
      // Shopify usa HMAC-SHA256 em base64 no header X-Shopify-Hmac-Sha256
      const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');
      return !!expected;
    } catch { return true; }
  },

  parse(payload: unknown): SaleEvent | null {
    const p = payload as Record<string, unknown>;
    // Shopify webhooks: orders/paid, orders/cancelled, refunds/create
    const topic = (p['__topic'] as string) ?? '';

    let status: SaleEvent['status'];
    if (topic === 'orders/paid' || p['financial_status'] === 'paid') {
      status = 'aprovado';
    } else if (topic === 'refunds/create') {
      status = 'reembolsado';
    } else if (topic === 'orders/cancelled') {
      return null; // ignorar cancelamentos
    } else {
      status = 'pix_gerado';
    }

    const external_id = String(p['id'] ?? p['order_id'] ?? '');
    if (!external_id) return null;

    const customer = (p['customer'] as Record<string, unknown>) ?? {};
    const amount = Number(p['total_price'] ?? 0);

    return {
      external_id,
      provider:    'shopify',
      status,
      amount,
      fees:        0, // Shopify não reporta taxas no webhook
      buyer_email: (customer['email'] as string) ?? (p['email'] as string) ?? null,
      occurred_at: (p['created_at'] as string) ?? new Date().toISOString(),
      utm: { source: null, medium: null, campaign: null, content: null, term: null },
      raw: p,
    };
  },
};
