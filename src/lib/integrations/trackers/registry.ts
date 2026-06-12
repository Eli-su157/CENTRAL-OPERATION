// Registro central de adaptadores de tracker.
// Para adicionar um novo tracker: crie adapters/novotracker.ts e adicione aqui.

import { utmifyTrackerAdapter } from './adapters/utmify';
import type { TrackerAdapter } from './types';

export const TRACKER_PROVIDERS = ['utmify'] as const;
export type TrackerProvider = typeof TRACKER_PROVIDERS[number];

const ADAPTERS: Record<TrackerProvider, TrackerAdapter> = {
  utmify: utmifyTrackerAdapter,
};

export function getTrackerAdapter(provider: string): TrackerAdapter | null {
  return ADAPTERS[provider as TrackerProvider] ?? null;
}

export function isTrackerProvider(provider: string): provider is TrackerProvider {
  return TRACKER_PROVIDERS.includes(provider as TrackerProvider);
}
