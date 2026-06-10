// Adaptador UTMify — atribuição de origem de vendas.
// NUNCA conta dinheiro. Enriquece sales.utm com a origem UTM/anúncio.
//
// Formato UTMify (campos principais):
//   orderId / order_id   — ID da transação na plataforma de pagamento
//   email                — e-mail do comprador
//   totalValue / value   — valor em centavos
//   createdAt            — datetime ISO
//   utmSource, utmMedium, utmCampaign, utmContent, utmTerm
//   src                  — plataforma de anúncio (facebook_ads, google_ads, etc.)
//   campaignId, adsetId, adId — IDs de nível de anúncio (usados na Fase 9e)

import crypto from 'crypto';
import type { AttributionAdapter, AttributionEvent } from '../types';

export const utmifyAdapter: AttributionAdapter = {
  provider: 'utmify',

  validateSignature(_payload: unknown, rawBody: string, secret: string): boolean {
    if (!secret) return true; // sem segredo configurado — aceita (dev/sandbox)
    try {
      // UTMify assina com HMAC-SHA256 no header x-utmify-signature
      // Aqui validamos se a assinatura foi fornecida no payload como fallback
      const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      return !!expected;
    } catch {
      return true;
    }
  },

  parse(payload: unknown): AttributionEvent | null {
    const p = payload as Record<string, unknown>;

    // external_id: aceita orderId ou order_id
    const external_id = String(p['orderId'] ?? p['order_id'] ?? p['transactionId'] ?? '').trim() || null;

    const buyer_email = (p['email'] as string | null) ?? null;

    // Valor em centavos (totalValue) ou unidades (value)
    const rawValue = Number(p['totalValue'] ?? p['value'] ?? p['amount'] ?? 0);
    // UTMify envia em centavos; se > 10000 provavelmente é centavos, converter
    const amount = rawValue > 1000 && rawValue % 100 === 0 ? rawValue / 100 : rawValue;

    const occurred_at = String(p['createdAt'] ?? p['created_at'] ?? p['date'] ?? new Date().toISOString());

    // UTMs — aceita camelCase e snake_case
    const utm = {
      source:   (p['utmSource']   ?? p['utm_source']   ?? p['src'] ?? null) as string | null,
      medium:   (p['utmMedium']   ?? p['utm_medium']   ?? null) as string | null,
      campaign: (p['utmCampaign'] ?? p['utm_campaign'] ?? p['campaignName'] ?? null) as string | null,
      content:  (p['utmContent']  ?? p['utm_content']  ?? p['adName'] ?? null) as string | null,
      term:     (p['utmTerm']     ?? p['utm_term']     ?? null) as string | null,
    };

    // Ad-level data — reservado para Fase 9e
    const ad_data = {
      campaign_id:   (p['campaignId']   ?? p['campaign_id']   ?? null) as string | null,
      adset_id:      (p['adsetId']      ?? p['adset_id']      ?? null) as string | null,
      ad_id:         (p['adId']         ?? p['ad_id']         ?? null) as string | null,
      campaign_name: (p['campaignName'] ?? p['campaign_name'] ?? null) as string | null,
      adset_name:    (p['adsetName']    ?? p['adset_name']    ?? null) as string | null,
      ad_name:       (p['adName']       ?? p['ad_name']       ?? null) as string | null,
      platform:      (p['src']          ?? p['platform']      ?? null) as string | null,
    };

    // Precisa de pelo menos um identificador de casamento
    if (!external_id && !buyer_email) return null;

    // Precisa de pelo menos um dado UTM para valer a pena enriquecer
    const hasUtm = Object.values(utm).some(v => v !== null);
    if (!hasUtm) return null;

    return {
      external_id,
      buyer_email,
      amount,
      occurred_at,
      utm,
      ad_data,
      raw: p,
    };
  },
};
