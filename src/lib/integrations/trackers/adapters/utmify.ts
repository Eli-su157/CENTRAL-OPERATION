// Adaptador UTMify para a camada de Tracker.
//
// UTMify envia eventos individuais de venda atribuída (kind='sale').
// Não envia aggregates — esses são computados localmente em buildTrackerMetrics().
//
// Mapeamento do payload UTMify → TrackerSaleEvent:
//
// orderId / order_id / transactionId  → external_id (casamento com sales)
// email                               → buyer_email
// totalValue / value / amount         → amount (centavos se > 10000, BRL caso contrário)
// createdAt / created_at / date       → occurred_at
// utmSource / utm_source / src        → utm_source + platform
// utmMedium / utm_medium              → utm_medium
// utmCampaign / utm_campaign          → utm_campaign
// utmContent / utm_content / adName   → utm_content + ad_name
// utmTerm / utm_term                  → utm_term
// campaignId / campaign_id            → campaign_id
// campaignName / campaign_name        → campaign_name
// adsetId / adset_id                  → adset_id
// adsetName / adset_name              → adset_name
// adId / ad_id                        → ad_id
// adName / ad_name                    → ad_name
// src                                 → platform (facebook_ads, google_ads, etc.)
// status / orderStatus                → status (aprovado, reembolsado, ...)

import crypto from 'crypto';
import type { TrackerAdapter, TrackerSaleEvent, TrackerAggregateEvent, TrackerEventKind } from '../types';

function pick(p: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = p[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return null;
}

function normalizeStatus(raw: string | null): string {
  if (!raw) return 'aprovado';
  const s = raw.toLowerCase();
  if (s.includes('refund') || s.includes('reembolso')) return 'reembolsado';
  if (s.includes('chargeback')) return 'chargeback';
  if (s.includes('pix_gerado') || s.includes('generated')) return 'pix_gerado';
  if (s.includes('pix_pago') || s.includes('paid')) return 'pix_pago';
  return 'aprovado';
}

function normalizePlatform(src: string | null): string | null {
  if (!src) return null;
  const s = src.toLowerCase();
  if (s.includes('facebook') || s.includes('meta') || s.includes('fb')) return 'facebook_ads';
  if (s.includes('google')) return 'google_ads';
  if (s.includes('tiktok')) return 'tiktok_ads';
  if (s.includes('youtube') || s.includes('yt')) return 'youtube_ads';
  return src;
}

export const utmifyTrackerAdapter: TrackerAdapter = {
  provider: 'utmify',

  validateSignature(_payload: unknown, rawBody: string, secret: string): boolean {
    if (!secret) return true;
    try {
      const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      return !!expected;
    } catch {
      return true;
    }
  },

  detectKind(payload: unknown): TrackerEventKind | null {
    const p = payload as Record<string, unknown>;
    // UTMify só envia eventos de venda individual
    // Se tiver orderId/order_id/transactionId OU email com utm — é sale
    const hasId = !!(p['orderId'] ?? p['order_id'] ?? p['transactionId']);
    const hasEmail = !!(p['email']);
    const hasUtm = !!(p['utmSource'] ?? p['utm_source'] ?? p['src'] ?? p['campaignId']);

    if ((hasId || hasEmail) && hasUtm) return 'sale';
    return null;
  },

  parseSale(payload: unknown): TrackerSaleEvent | null {
    const p = payload as Record<string, unknown>;

    const external_id = pick(p, 'orderId', 'order_id', 'transactionId', 'transaction_id');
    const buyer_email = pick(p, 'email', 'buyer_email');

    const rawValue = Number(p['totalValue'] ?? p['value'] ?? p['amount'] ?? 0);
    // UTMify envia em centavos para totalValue; normaliza para BRL
    const amount = rawValue > 10000 && rawValue % 1 === 0 ? rawValue / 100 : rawValue;

    const occurred_at = pick(p, 'createdAt', 'created_at', 'date', 'occurred_at')
      ?? new Date().toISOString();

    const rawStatus = pick(p, 'status', 'orderStatus', 'order_status');
    const status = normalizeStatus(rawStatus);

    const src = pick(p, 'src', 'source', 'platform');
    const platform = normalizePlatform(src);

    const utm_source   = pick(p, 'utmSource',   'utm_source',   'src') ?? platform ?? null;
    const utm_medium   = pick(p, 'utmMedium',   'utm_medium');
    const utm_campaign = pick(p, 'utmCampaign', 'utm_campaign', 'campaignName', 'campaign_name');
    const utm_content  = pick(p, 'utmContent',  'utm_content',  'adName', 'ad_name');
    const utm_term     = pick(p, 'utmTerm',     'utm_term');

    const campaign_id   = pick(p, 'campaignId',  'campaign_id');
    const campaign_name = pick(p, 'campaignName','campaign_name') ?? utm_campaign;
    const adset_id      = pick(p, 'adsetId',     'adset_id');
    const adset_name    = pick(p, 'adsetName',   'adset_name');
    const ad_id         = pick(p, 'adId',        'ad_id');
    const ad_name       = pick(p, 'adName',      'ad_name') ?? utm_content;

    // Deve ter ao menos um identificador de casamento + algum dado de atribuição
    if (!external_id && !buyer_email) return null;
    const hasAttribution = campaign_id || campaign_name || utm_source || ad_id;
    if (!hasAttribution) return null;

    return {
      external_id,
      buyer_email,
      amount,
      status,
      occurred_at,
      campaign_id,
      campaign_name,
      adset_id,
      adset_name,
      ad_id,
      ad_name,
      platform,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      raw: p,
    };
  },

  // UTMify não envia aggregates — retorna null sempre
  parseAggregate(_payload: unknown): TrackerAggregateEvent | null {
    return null;
  },
};
