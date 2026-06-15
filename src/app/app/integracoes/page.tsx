import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/auth/getPermissions';
import { createClient } from '@/lib/supabase/server';

const CATALOG: {
  key: string;
  name: string;
  description: string;
  category: string;
  categoryColor: string;
  status: 'disponivel' | 'em_breve';
  icon: React.ReactNode;
}[] = [
  // ── Vendas ──────────────────────────────────────────────────
  {
    key: 'hotmart',
    name: 'Hotmart',
    description: 'Webhooks de compra, reembolso e abandono. Receita em tempo real.',
    category: 'Vendas',
    categoryColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    status: 'disponivel',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
        <path d="M8 12h8M12 8v8" />
      </svg>
    ),
  },
  {
    key: 'paradise',
    name: 'Paradise',
    description: 'Integração via webhook. Vendas e estornos sincronizados.',
    category: 'Vendas',
    categoryColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    status: 'disponivel',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  },
  {
    key: 'vega',
    name: 'Vega',
    description: 'API key para leitura de vendas e comissões.',
    category: 'Vendas',
    categoryColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    status: 'disponivel',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    key: 'shopify',
    name: 'Shopify',
    description: 'Webhook de pedidos e reembolsos para e-commerce.',
    category: 'Vendas',
    categoryColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    status: 'disponivel',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    key: 'kiwify',
    name: 'Kiwify',
    description: 'Webhook de vendas e eventos de assinatura.',
    category: 'Vendas',
    categoryColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    status: 'em_breve',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 12h8M12 8v8" />
      </svg>
    ),
  },
  {
    key: 'eduzz',
    name: 'Eduzz',
    description: 'Integração com webhooks de transação e assinatura.',
    category: 'Vendas',
    categoryColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    status: 'em_breve',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    key: 'yampi',
    name: 'Yampi',
    description: 'Checkout nativo com webhook de pedidos.',
    category: 'Vendas',
    categoryColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    status: 'em_breve',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    ),
  },

  // ── Tráfego ──────────────────────────────────────────────────
  {
    key: 'meta_ads',
    name: 'Meta Ads',
    description: 'Gasto diário, alcance e CPM via API de Marketing do Facebook.',
    category: 'Tráfego',
    categoryColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    status: 'disponivel',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    ),
  },
  {
    key: 'google_ads',
    name: 'Google Ads',
    description: 'Métricas de campanha, custo por clique e conversões.',
    category: 'Tráfego',
    categoryColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    status: 'disponivel',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    key: 'tiktok_ads',
    name: 'TikTok Ads',
    description: 'Campanhas, impressões e custo por resultado.',
    category: 'Tráfego',
    categoryColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    status: 'em_breve',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
      </svg>
    ),
  },
  {
    key: 'taboola',
    name: 'Taboola',
    description: 'Mídia nativa: cliques, impressões e gasto diário.',
    category: 'Tráfego',
    categoryColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    status: 'em_breve',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },

  // ── Atribuição ──────────────────────────────────────────────
  {
    key: 'utmify',
    name: 'UTMify',
    description: 'Atribuição multi-touch por UTM. API key para leitura de conversões.',
    category: 'Atribuição',
    categoryColor: 'text-orange-400 bg-orange-500/10 border-orange-500/15',
    status: 'disponivel',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
  {
    key: 'google_analytics',
    name: 'Google Analytics 4',
    description: 'Eventos de comportamento, sessões e taxa de conversão.',
    category: 'Atribuição',
    categoryColor: 'text-orange-400 bg-orange-500/10 border-orange-500/15',
    status: 'em_breve',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },

  // ── CRM / Comunicação ────────────────────────────────────────
  {
    key: 'activecampaign',
    name: 'ActiveCampaign',
    description: 'Sincronização de leads, tags e funis de automação.',
    category: 'CRM',
    categoryColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    status: 'em_breve',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
  {
    key: 'rd_station',
    name: 'RD Station',
    description: 'Leads, conversões e oportunidades do funil de vendas.',
    category: 'CRM',
    categoryColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    status: 'em_breve',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </svg>
    ),
  },
  {
    key: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Notificações de compra e mensagens automatizadas via API oficial.',
    category: 'CRM',
    categoryColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    status: 'em_breve',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
];

const CATEGORIES = ['Vendas', 'Tráfego', 'Atribuição', 'CRM'] as const;

export default async function IntegracoesPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/');
  if (ctx.profile.role !== 'dono' && ctx.profile.role !== 'head') redirect('/app');

  const supabase = await createClient();

  const [{ data: connections }, { data: dashboards }] = await Promise.all([
    supabase
      .from('integration_connections')
      .select('provider, status, dashboard_id')
      .eq('operation_id', ctx.profile.operation_id),
    supabase
      .from('dashboards')
      .select('id, name')
      .eq('operation_id', ctx.profile.operation_id)
      .order('created_at'),
  ]);

  const connByProvider: Record<string, { count: number; dashboardIds: string[] }> = {};
  for (const c of connections ?? []) {
    if (!connByProvider[c.provider]) connByProvider[c.provider] = { count: 0, dashboardIds: [] };
    connByProvider[c.provider].count++;
    if (c.dashboard_id) connByProvider[c.provider].dashboardIds.push(c.dashboard_id);
  }

  const dashboardMap = Object.fromEntries((dashboards ?? []).map(d => [d.id, d.name]));
  const firstDashboardId = (dashboards ?? [])[0]?.id ?? null;

  const totalDisponivel = CATALOG.filter(p => p.status === 'disponivel').length;
  const totalConectadas = Object.values(connByProvider).reduce((s, v) => s + v.count, 0);
  const plataformasAtivas = Object.keys(connByProvider).length;

  return (
    <div className="min-h-screen bg-[#08080a]">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="border-b border-white/[0.05] relative overflow-hidden">
        {/* Decorativo */}
        <div className="absolute top-0 right-0 w-px h-full bg-white/[0.03]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-orange-500/20 via-orange-500/5 to-transparent" />
        <div className="absolute top-1/2 right-16 -translate-y-1/2 w-48 h-48 rounded-full border border-orange-500/[0.07]" />
        <div className="absolute top-1/2 right-8 -translate-y-1/2 w-24 h-24 rounded-full border border-orange-500/[0.07]" />

        <div className="px-6 sm:px-10 py-10 max-w-6xl relative z-10">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-[2px] h-6 bg-orange-500 rounded-sm shrink-0 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
            <h1 className="text-xl font-bold text-white tracking-tight">Integrações</h1>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-8 mt-8">
            <div>
              <p className="text-2xl font-bold text-white tabular-nums">{plataformasAtivas}</p>
              <p className="text-xs text-zinc-600 mt-0.5">Plataformas ativas</p>
            </div>
            <div className="w-px h-8 bg-white/[0.06]" />
            <div>
              <p className="text-2xl font-bold text-white tabular-nums">{totalConectadas}</p>
              <p className="text-xs text-zinc-600 mt-0.5">Conexões configuradas</p>
            </div>
            <div className="w-px h-8 bg-white/[0.06]" />
            <div>
              <p className="text-2xl font-bold text-white tabular-nums">{totalDisponivel}</p>
              <p className="text-xs text-zinc-600 mt-0.5">Disponíveis agora</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Categorias ──────────────────────────────────────────── */}
      <div className="px-6 sm:px-10 py-10 max-w-6xl mx-auto">

        {CATEGORIES.map(cat => {
          const items = CATALOG.filter(p => p.category === cat);
          return (
            <section key={cat} className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-px h-5 bg-white/[0.12]" />
                <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-widest">{cat}</h2>
                <span className="text-xs text-zinc-700">{items.filter(i => i.status === 'disponivel').length} disponíveis</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map(platform => {
                  const conn = connByProvider[platform.key];
                  const isConnected = !!conn && conn.count > 0;
                  const isAvailable = platform.status === 'disponivel';

                  return (
                    <div
                      key={platform.key}
                      className={`relative bg-[#0f0f12] border rounded-xl p-5 flex flex-col gap-4 transition-all duration-200 overflow-hidden ${
                        isConnected
                          ? 'border-orange-500/25 shadow-[0_0_20px_rgba(249,115,22,0.06)]'
                          : 'border-white/[0.06] hover:border-white/[0.1]'
                      }`}
                    >
                      {/* Top gradient line */}
                      <div className={`absolute top-0 left-0 right-0 h-px ${
                        isConnected
                          ? 'bg-gradient-to-r from-transparent via-orange-500/40 to-transparent'
                          : 'bg-gradient-to-r from-transparent via-white/[0.05] to-transparent'
                      }`} />

                      <div className="flex items-start justify-between gap-3">
                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                          isConnected
                            ? 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                            : isAvailable
                            ? 'bg-white/[0.04] border-white/[0.08] text-zinc-400'
                            : 'bg-white/[0.02] border-white/[0.04] text-zinc-700'
                        }`}>
                          {platform.icon}
                        </div>

                        <div className="flex flex-col items-end gap-1.5">
                          {/* Status badge */}
                          {isConnected ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Ativo
                            </span>
                          ) : isAvailable ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full bg-white/[0.04] text-zinc-500 border border-white/[0.06]">
                              Disponível
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full bg-zinc-800/60 text-zinc-600 border border-white/[0.04]">
                              Em breve
                            </span>
                          )}
                          {/* Category badge */}
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${platform.categoryColor}`}>
                            {platform.category}
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className={`text-sm font-semibold mb-1 ${isAvailable ? 'text-white' : 'text-zinc-600'}`}>
                          {platform.name}
                        </p>
                        <p className={`text-xs leading-relaxed ${isAvailable ? 'text-zinc-500' : 'text-zinc-700'}`}>
                          {platform.description}
                        </p>
                      </div>

                      {/* Dashboards conectados */}
                      {isConnected && conn.dashboardIds.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {conn.dashboardIds.slice(0, 3).map(id => (
                            <span key={id} className="text-[10px] bg-orange-500/10 text-orange-400/80 border border-orange-500/15 px-2 py-0.5 rounded-full">
                              {dashboardMap[id] ?? id.slice(0, 8)}
                            </span>
                          ))}
                          {conn.dashboardIds.length > 3 && (
                            <span className="text-[10px] text-zinc-600 px-1">+{conn.dashboardIds.length - 3}</span>
                          )}
                        </div>
                      )}

                      {/* CTA */}
                      {isAvailable && firstDashboardId && (
                        <a
                          href={`/app/d/${firstDashboardId}/dev`}
                          className={`mt-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                            isConnected
                              ? 'bg-orange-500/10 hover:bg-orange-500/15 text-orange-400 border border-orange-500/20'
                              : 'bg-white/[0.04] hover:bg-white/[0.07] text-zinc-400 hover:text-zinc-200 border border-white/[0.06]'
                          }`}
                        >
                          {isConnected ? 'Gerenciar' : 'Conectar'}
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </a>
                      )}
                      {(!isAvailable || !firstDashboardId) && (
                        <div className="mt-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-zinc-700 border border-white/[0.04] cursor-not-allowed">
                          {!firstDashboardId ? 'Crie um produto primeiro' : 'Em desenvolvimento'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Nota de rodapé */}
        <div className="mt-6 pt-8 border-t border-white/[0.04] flex items-center gap-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-700 shrink-0">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-xs text-zinc-700">
            Conexões são configuradas por produto (dashboard). Acesse o painel Dev de cada produto para adicionar ou editar credenciais.
          </p>
        </div>
      </div>
    </div>
  );
}
