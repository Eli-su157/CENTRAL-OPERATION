'use client';

import { useState, useTransition } from 'react';
import {
  createConnectionAction,
  updateConnectionAction,
} from '@/app/app/d/[dashboardId]/dev/actions';
import { formatProvider } from '@/lib/mock/structure';
import type { IntegrationConnection } from '@/lib/mock/structure';

const PROVIDERS_BY_CATEGORY = {
  venda:      ['hotmart', 'paradise', 'vega', 'shopify'],
  tracker:    ['utmify'],
  atribuicao: ['utmify'],
  trafego:    ['meta_ads', 'google_ads'],
} as const;

const CATEGORY_LABEL = {
  venda:      'Venda',
  tracker:    'Tracker de Atribuição (recomendado)',
  atribuicao: 'Atribuição (legado)',
  trafego:    'Tráfego',
};

const PROVIDER_PLACEHOLDER: Record<string, string> = {
  hotmart:    '{"webhook_secret":"xxxxx","token":"xxxxx"}',
  paradise:   '{"webhook_secret":"xxxxx"}',
  vega:       '{"api_key":"xxxxx"}',
  shopify:    '{"shop_domain":"loja.myshopify.com","webhook_secret":"xxxxx"}',
  utmify:     '{"api_key":"xxxxx"}',
  meta_ads:   '{"app_id":"xxxxx","app_secret":"xxxxx","access_token":"xxxxx","account_id":"act_xxxxx"}',
  google_ads: '{"client_id":"xxxxx","client_secret":"xxxxx","refresh_token":"xxxxx","customer_id":"xxxxx"}',
};

interface Props {
  dashboardId: string;
  editConnection?: IntegrationConnection;
  onClose: () => void;
}

const inputCls = 'w-full bg-[#0D0D0D] border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/40 placeholder-zinc-600';

export function ConnectionForm({ dashboardId, editConnection, onClose }: Props) {
  const isEditing = !!editConnection;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<keyof typeof PROVIDERS_BY_CATEGORY>(
    (editConnection?.category as keyof typeof PROVIDERS_BY_CATEGORY) ?? 'venda'
  );
  const [provider, setProvider] = useState(
    editConnection?.provider ?? 'hotmart'
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const action = isEditing ? updateConnectionAction : createConnectionAction;
      const result = await action(null, fd);
      if (result && 'error' in result) setError(result.error);
      else onClose();
    });
  }

  const configPlaceholder = PROVIDER_PLACEHOLDER[provider] ?? '{}';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
          <h2 className="text-sm font-semibold text-white">
            {isEditing ? `Editar ${formatProvider(editConnection.provider)}` : 'Nova conexão'}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <input type="hidden" name="dashboard_id" value={dashboardId} />
          {isEditing && <input type="hidden" name="connectionId" value={editConnection.id} />}

          <div className="px-5 py-4 flex flex-col gap-4">
            {!isEditing && (
              <>
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block font-medium">Categoria *</label>
                  <select
                    name="category"
                    value={category}
                    onChange={e => {
                      const cat = e.target.value as keyof typeof PROVIDERS_BY_CATEGORY;
                      setCategory(cat);
                      setProvider(PROVIDERS_BY_CATEGORY[cat][0]);
                    }}
                    className={inputCls + ' cursor-pointer'}
                  >
                    {Object.entries(CATEGORY_LABEL).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                    <option value="" disabled>── Open Finance / Banco (Em breve) ──</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block font-medium">Provider *</label>
                  <select
                    name="provider"
                    value={provider}
                    onChange={e => setProvider(e.target.value)}
                    className={inputCls + ' cursor-pointer'}
                  >
                    {PROVIDERS_BY_CATEGORY[category].map(p => (
                      <option key={p} value={p}>{formatProvider(p)}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Config pública (não sensível) */}
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block font-medium">
                Config pública <span className="text-zinc-600">(JSON — IDs, URLs, etc.)</span>
              </label>
              <textarea
                name="config"
                rows={4}
                defaultValue={isEditing ? JSON.stringify(editConnection.config, null, 2) : '{}'}
                placeholder={configPlaceholder}
                className={inputCls + ' font-mono text-xs resize-none'}
              />
              <p className="text-xs text-zinc-600 mt-1">
                Campos não sensíveis: account_id, shop_domain, webhook URL, etc.
              </p>
            </div>

            {/* Credenciais — criptografadas no servidor, nunca retornadas */}
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block font-medium">
                Credenciais sensíveis
                <span className="ml-2 text-xs text-emerald-600 font-normal">🔒 AES-256-GCM</span>
              </label>
              <textarea
                name="credentials"
                rows={3}
                placeholder={isEditing ? '(deixe em branco para manter as credenciais atuais)' : 'API key, token secreto, etc.'}
                className={inputCls + ' font-mono text-xs resize-none'}
              />
              <p className="text-xs text-zinc-600 mt-1">
                Criptografadas antes de persistir. Nunca expostas ao browser após salvas.
                {isEditing && ' Deixe vazio para manter as credenciais atuais.'}
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/60 rounded-lg px-3 py-2">{error}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-zinc-800 sticky bottom-0 bg-zinc-900">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className="px-4 py-2 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-400 text-white transition-colors disabled:opacity-50">
              {isPending ? 'Salvando…' : isEditing ? 'Atualizar' : 'Conectar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
