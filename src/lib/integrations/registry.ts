// Registro central de adaptadores de venda.

import { hotmartAdapter }  from './adapters/hotmart';
import { paradiseAdapter } from './adapters/paradise';
import { vegaAdapter }     from './adapters/vega';
import { shopifyAdapter }  from './adapters/shopify';
import type { SaleAdapter, SaleProvider } from './types';

const ADAPTERS: Record<SaleProvider, SaleAdapter> = {
  hotmart:  hotmartAdapter,
  paradise: paradiseAdapter,
  vega:     vegaAdapter,
  shopify:  shopifyAdapter,
};

export function getAdapter(provider: string): SaleAdapter | null {
  return ADAPTERS[provider as SaleProvider] ?? null;
}

export const SALE_PROVIDERS: SaleProvider[] = ['hotmart', 'paradise', 'vega', 'shopify'];
