// Motor central de alertas — avalia todas as regras e grava/resolve alertas no banco.
// Chamado pelo cron health-check. Idempotente: não duplica alerta ativo do mesmo tipo.
//
// Regras implementadas:
//   meta_gasto_em_risco         pace de gasto abaixo do necessário
//   meta_faturamento_em_risco   pace de faturamento abaixo do necessário
//   reembolso_alto              taxa de reembolso > 5%
//   conversao_pix_baixa         pix_pago/pix_gerado < 70%
//   roas_abaixo_alvo            ROAS confirmado < roas_alvo × 0.85
//   conta_bloqueada             ad_spend.account_status = 'bloqueada'
//   plataforma_desconectada     integration_connections.status = 'desconectada/erro'
//   pixel_sem_disparar          utmify/atribuicao sem evento há >6h (quando esperado)
//   recurso_fora                monitored_resources.status = 'fora'
//   recurso_lento               monitored_resources.status = 'lento'

export type AlertType =
  | 'meta_gasto_em_risco'
  | 'meta_faturamento_em_risco'
  | 'reembolso_alto'
  | 'conversao_pix_baixa'
  | 'roas_abaixo_alvo'
  | 'conta_bloqueada'
  | 'plataforma_desconectada'
  | 'pixel_sem_disparar'
  | 'recurso_fora'
  | 'recurso_lento';

type Severity  = 'info' | 'warning' | 'danger';
type Visibility = 'todos' | 'dono_head';

interface AlertSpec {
  type: AlertType;
  severity: Severity;
  message: string;
  context?: Record<string, unknown>;
  visible_to?: Visibility;
}

// -----------------------------------------------------------------------
// Helpers de upsert / resolve
// -----------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertAlert(admin: any, operationId: string, dashboardId: string | null, spec: AlertSpec) {
  const dashId = dashboardId ?? null;

  // Verifica se já existe alerta ativo deste tipo
  let q = admin
    .from('alerts')
    .select('id, message')
    .eq('operation_id', operationId)
    .eq('type', spec.type)
    .eq('status', 'ativo');

  if (dashId) q = q.eq('dashboard_id', dashId);
  else        q = q.is('dashboard_id', null);

  const { data: existing } = await q.maybeSingle();

  if (existing) {
    // Atualiza message se mudou (ex: percentual diferente)
    if (existing.message !== spec.message) {
      await admin.from('alerts')
        .update({ message: spec.message, context: spec.context ?? {} })
        .eq('id', existing.id);
    }
    return;
  }

  await admin.from('alerts').insert({
    operation_id: operationId,
    dashboard_id: dashId,
    type:         spec.type,
    severity:     spec.severity,
    message:      spec.message,
    context:      spec.context ?? {},
    visible_to:   spec.visible_to ?? 'todos',
    status:       'ativo',
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveAlert(admin: any, operationId: string, dashboardId: string | null, type: AlertType) {
  let q = admin
    .from('alerts')
    .update({ status: 'resolvido', resolved_at: new Date().toISOString() })
    .eq('operation_id', operationId)
    .eq('type', type)
    .eq('status', 'ativo');

  if (dashboardId) q = q.eq('dashboard_id', dashboardId);
  else             q = q.is('dashboard_id', null);

  await q;
}

// -----------------------------------------------------------------------
// Regras por dashboard
// -----------------------------------------------------------------------

interface DashboardAlertInput {
  dashboardId: string;
  primaryProvider: string | null;
  roasAlvo: number;
  // Vendas do mês (aprovadas + reembolsadas + pix)
  approvedCount: number;
  refundedCount: number;
  pixGeradoCount: number;
  pixPagoCount: number;
  totalRevenue: number;
  // Gasto do mês
  totalSpend: number;
  // Metas
  metaGasto: number | null;
  metaFaturamento: number | null;
  // Progresso do mês
  diaAtual: number;
  diasNoMes: number;
  // Contas de anúncio com status bloqueado
  blockedAccounts: string[];
  // Integration connections com problema
  disconnectedProviders: string[];
  pixelSilentHours: number | null;  // horas sem evento utmify (null = sem conexão utmify)
  // Recursos monitorados
  resourcesDown: string[];
  resourcesSlow: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function evaluateDashboardAlerts(admin: any, operationId: string, input: DashboardAlertInput) {
  const {
    dashboardId, roasAlvo,
    approvedCount, refundedCount, pixGeradoCount, pixPagoCount,
    totalRevenue, totalSpend,
    metaGasto, metaFaturamento, diaAtual, diasNoMes,
    blockedAccounts, disconnectedProviders, pixelSilentHours,
    resourcesDown, resourcesSlow,
  } = input;

  // ---- Taxa de reembolso ----
  const taxaReembolso = approvedCount > 0 ? (refundedCount / approvedCount) * 100 : 0;
  if (taxaReembolso > 5 && approvedCount >= 5) {
    await upsertAlert(admin, operationId, dashboardId, {
      type:       'reembolso_alto',
      severity:   taxaReembolso > 10 ? 'danger' : 'warning',
      message:    `Taxa de reembolso em ${taxaReembolso.toFixed(1)}% — acima do limite de 5%.`,
      context:    { taxa: taxaReembolso, count: refundedCount },
      visible_to: 'dono_head',
    });
  } else {
    await resolveAlert(admin, operationId, dashboardId, 'reembolso_alto');
  }

  // ---- Conversão Pix ----
  const totalPix = pixGeradoCount + pixPagoCount + approvedCount;
  const convPix = totalPix > 0 ? ((pixPagoCount + approvedCount) / totalPix) * 100 : null;
  if (convPix !== null && convPix < 70 && totalPix >= 5) {
    await upsertAlert(admin, operationId, dashboardId, {
      type:     'conversao_pix_baixa',
      severity: convPix < 60 ? 'danger' : 'warning',
      message:  `Conversão Pix: ${convPix.toFixed(1)}% — queda abaixo de 70%.`,
      context:  { conversao: convPix, total_pix: totalPix },
    });
  } else {
    await resolveAlert(admin, operationId, dashboardId, 'conversao_pix_baixa');
  }

  // ---- ROAS abaixo do alvo ----
  const roas = totalSpend > 0 ? totalRevenue / totalSpend : null;
  if (roas !== null && roas < roasAlvo * 0.85 && totalSpend > 200) {
    await upsertAlert(admin, operationId, dashboardId, {
      type:       'roas_abaixo_alvo',
      severity:   roas < roasAlvo * 0.5 ? 'danger' : 'warning',
      message:    `ROAS confirmado ${roas.toFixed(2)}x abaixo do alvo ${roasAlvo.toFixed(2)}x.`,
      context:    { roas, roas_alvo: roasAlvo },
      visible_to: 'dono_head',
    });
  } else {
    await resolveAlert(admin, operationId, dashboardId, 'roas_abaixo_alvo');
  }

  // ---- Pace de gasto ----
  if (metaGasto && diaAtual > 0) {
    const gastoAte = totalSpend;
    const gastoPace = (gastoAte / diaAtual) * diasNoMes;
    const pct = gastoPace / metaGasto;
    if (pct < 0.75) {
      await upsertAlert(admin, operationId, dashboardId, {
        type:       'meta_gasto_em_risco',
        severity:   'warning',
        message:    `Meta de gasto em risco: pace de ${(pct * 100).toFixed(0)}% do target mensal.`,
        context:    { pace_pct: pct, meta: metaGasto, pace_valor: gastoPace },
        visible_to: 'dono_head',
      });
    } else {
      await resolveAlert(admin, operationId, dashboardId, 'meta_gasto_em_risco');
    }
  }

  // ---- Pace de faturamento ----
  if (metaFaturamento && diaAtual > 0) {
    const fatPace = (totalRevenue / diaAtual) * diasNoMes;
    const pct = fatPace / metaFaturamento;
    if (pct < 0.75) {
      await upsertAlert(admin, operationId, dashboardId, {
        type:       'meta_faturamento_em_risco',
        severity:   pct < 0.5 ? 'danger' : 'warning',
        message:    `Meta de faturamento em risco: pace ${(pct * 100).toFixed(0)}% — projeção ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fatPace)} / meta ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metaFaturamento)}.`,
        context:    { pace_pct: pct, meta: metaFaturamento, pace_valor: fatPace },
        visible_to: 'dono_head',
      });
    } else {
      await resolveAlert(admin, operationId, dashboardId, 'meta_faturamento_em_risco');
    }
  }

  // ---- Contas bloqueadas ----
  if (blockedAccounts.length > 0) {
    await upsertAlert(admin, operationId, dashboardId, {
      type:    'conta_bloqueada',
      severity: 'danger',
      message: `Conta(s) de anúncio BLOQUEADA(S): ${blockedAccounts.join(', ')}.`,
      context: { accounts: blockedAccounts },
    });
  } else {
    await resolveAlert(admin, operationId, dashboardId, 'conta_bloqueada');
  }

  // ---- Plataformas desconectadas ----
  if (disconnectedProviders.length > 0) {
    await upsertAlert(admin, operationId, dashboardId, {
      type:     'plataforma_desconectada',
      severity: 'warning',
      message:  `Plataforma(s) desconectada(s): ${disconnectedProviders.join(', ')}.`,
      context:  { providers: disconnectedProviders },
    });
  } else {
    await resolveAlert(admin, operationId, dashboardId, 'plataforma_desconectada');
  }

  // ---- Pixel sem disparar ----
  if (pixelSilentHours !== null && pixelSilentHours > 6) {
    await upsertAlert(admin, operationId, dashboardId, {
      type:    'pixel_sem_disparar',
      severity: pixelSilentHours > 12 ? 'danger' : 'warning',
      message: `UTMify sem eventos há ${Math.round(pixelSilentHours)}h — verificar pixel e integração.`,
      context: { silent_hours: pixelSilentHours },
    });
  } else {
    await resolveAlert(admin, operationId, dashboardId, 'pixel_sem_disparar');
  }

  // ---- Recursos fora/lentos ----
  if (resourcesDown.length > 0) {
    await upsertAlert(admin, operationId, dashboardId, {
      type:    'recurso_fora',
      severity: 'danger',
      message: `Recursos FORA do ar: ${resourcesDown.join(', ')}.`,
      context: { resources: resourcesDown },
    });
  } else {
    await resolveAlert(admin, operationId, dashboardId, 'recurso_fora');
  }

  if (resourcesSlow.length > 0) {
    await upsertAlert(admin, operationId, dashboardId, {
      type:    'recurso_lento',
      severity: 'warning',
      message: `Recursos lentos: ${resourcesSlow.join(', ')}.`,
      context: { resources: resourcesSlow },
    });
  } else {
    await resolveAlert(admin, operationId, dashboardId, 'recurso_lento');
  }
}

// -----------------------------------------------------------------------
// Função principal — avalia todos os dashboards de uma operação
// -----------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function evaluateOperationAlerts(admin: any, operationId: string): Promise<{ evaluated: number }> {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const period   = `${year}-${month}`;
  const monthStr = `${year}-${month}-01`;
  const diaAtual = now.getDate();
  const diasNoMes = new Date(year, now.getMonth() + 1, 0).getDate();

  // 1. Dashboards
  const { data: dashboards } = await admin
    .from('dashboards')
    .select('id, primary_sale_provider')
    .eq('operation_id', operationId);
  if (!dashboards?.length) return { evaluated: 0 };

  const dashboardIds = dashboards.map((d: { id: string }) => d.id);

  // 2. Bulk fetch (uma vez por operação)
  const [salesRes, spendRes, goalsRes, connectionsRes, resourcesRes] = await Promise.all([
    // Vendas do mês por dashboard
    admin.from('sales')
      .select('dashboard_id, provider, status, amount')
      .eq('operation_id', operationId)
      .gte('occurred_at', monthStr)
      .in('dashboard_id', dashboardIds),

    // Gasto do mês por dashboard + status de conta
    admin.from('ad_spend')
      .select('dashboard_id, account_name, account_status, spend, spend_date')
      .eq('operation_id', operationId)
      .gte('spend_date', monthStr),

    // Metas do período por dashboard
    admin.from('traffic_goals')
      .select('dashboard_id, meta_gasto, meta_faturamento, roas_alvo')
      .eq('operation_id', operationId)
      .eq('period', period),

    // Integration connections com last_event_at
    admin.from('integration_connections')
      .select('dashboard_id, provider, category, status, last_event_at')
      .eq('operation_id', operationId),

    // Recursos monitorados
    admin.from('monitored_resources')
      .select('dashboard_id, label, status')
      .eq('operation_id', operationId)
      .in('dashboard_id', dashboardIds),

  ]);

  const allSales       = (salesRes.data       ?? []) as { dashboard_id: string; provider: string; status: string; amount: number }[];
  const allSpend       = (spendRes.data        ?? []) as { dashboard_id: string; account_name: string; account_status: string; spend: number; spend_date: string }[];
  const allGoals       = (goalsRes.data        ?? []) as { dashboard_id: string; meta_gasto: number | null; meta_faturamento: number | null; roas_alvo: number | null }[];
  const allConnections = (connectionsRes.data  ?? []) as { dashboard_id: string | null; provider: string; category: string; status: string; last_event_at: string | null }[];
  const allResources   = (resourcesRes.data    ?? []) as { dashboard_id: string | null; label: string; status: string }[];

  let evaluated = 0;

  for (const dash of dashboards as { id: string; primary_sale_provider: string | null }[]) {
    const did = dash.id;
    const primary = dash.primary_sale_provider ?? null;

    // Sales filtradas pelo provider primário
    const dashSales = allSales.filter(s =>
      s.dashboard_id === did && (!primary || s.provider === primary)
    );
    const approvedCount = dashSales.filter(s => s.status === 'aprovado').length;
    const refundedCount = dashSales.filter(s => s.status === 'reembolsado').length;
    const pixGeradoCount = dashSales.filter(s => s.status === 'pix_gerado').length;
    const pixPagoCount   = dashSales.filter(s => s.status === 'pix_pago').length;
    const totalRevenue   = dashSales.filter(s => s.status === 'aprovado').reduce((s, v) => s + Number(v.amount), 0);

    // Gasto do mês
    const dashSpend = allSpend.filter(s => s.dashboard_id === did);
    const totalSpend = dashSpend.reduce((s, v) => s + Number(v.spend), 0);

    // Metas
    const goals = allGoals.find(g => g.dashboard_id === did);
    const roasAlvo = goals?.roas_alvo ?? 3.0;

    // Contas bloqueadas (hoje)
    const blockedAccounts = [...new Set(
      allSpend.filter(s => s.dashboard_id === did && s.account_status === 'bloqueada').map(s => s.account_name)
    )];

    // Connections com problema para este dashboard
    const dashConns = allConnections.filter(c => c.dashboard_id === did || c.dashboard_id === null);
    const disconnected = dashConns
      .filter(c => (c.category === 'venda' || c.category === 'atribuicao') &&
        (c.status === 'desconectada' || c.status === 'erro'))
      .map(c => c.provider);

    // Pixel sem disparar (utmify)
    const utmifyConn = dashConns.find(c => c.provider === 'utmify' && c.category === 'atribuicao');
    let pixelSilentHours: number | null = null;
    if (utmifyConn?.last_event_at) {
      const diffMs = Date.now() - new Date(utmifyConn.last_event_at).getTime();
      pixelSilentHours = diffMs / 3_600_000;
    }

    // Recursos
    const dashResources = allResources.filter(r => r.dashboard_id === did);
    const resourcesDown = dashResources.filter(r => r.status === 'fora').map(r => r.label);
    const resourcesSlow = dashResources.filter(r => r.status === 'lento').map(r => r.label);

    await evaluateDashboardAlerts(admin, operationId, {
      dashboardId:           did,
      primaryProvider:       primary,
      roasAlvo,
      approvedCount,
      refundedCount,
      pixGeradoCount,
      pixPagoCount,
      totalRevenue,
      totalSpend,
      metaGasto:             goals?.meta_gasto ?? null,
      metaFaturamento:       goals?.meta_faturamento ?? null,
      diaAtual,
      diasNoMes,
      blockedAccounts,
      disconnectedProviders: disconnected,
      pixelSilentHours,
      resourcesDown,
      resourcesSlow,
    });

    evaluated++;
  }

  return { evaluated };
}

// -----------------------------------------------------------------------
// Helper: busca alertas ativos formatados para AlertsBar
// -----------------------------------------------------------------------

export interface AlertBarItem {
  id: string;
  type: 'warning' | 'danger' | 'info';
  message: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchActiveAlerts(
  supabase: any,
  dashboardId: string,
  canSeeFinancial: boolean
): Promise<AlertBarItem[]> {
  const { data } = await supabase
    .from('alerts')
    .select('id, severity, message, visible_to')
    .eq('dashboard_id', dashboardId)
    .eq('status', 'ativo')
    .order('created_at', { ascending: false })
    .limit(10);

  return ((data ?? []) as {
    id: string; severity: string; message: string; visible_to: string;
  }[])
    .filter(a => a.visible_to === 'todos' || (a.visible_to === 'dono_head' && canSeeFinancial))
    .map(a => ({
      id:      a.id,
      type:    a.severity as 'warning' | 'danger' | 'info',
      message: a.message,
    }));
}
