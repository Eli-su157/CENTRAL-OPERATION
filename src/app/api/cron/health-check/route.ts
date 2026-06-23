// Cron de monitoramento ativo e avaliação de alertas — /api/cron/health-check
// Agendado a cada 5 min no vercel.json.
// Protegido por Authorization: Bearer <CRON_SECRET>.
//
// Etapas:
// 1. Para cada monitored_resource:
//    - kind='pagina': HTTP GET com timeout 8s → classifica no_ar/lento/fora
//    - kind='dominio': HTTPS GET → verifica alcançabilidade/SSL
// 2. Para cada integration_connection (venda/atribuicao):
//    - Se last_event_at != null AND > threshold sem evento → marca 'desconectada'
// 3. Avalia motor de alertas para todas as operações
//
// Paralelismo controlado: checks de URL em lotes de MAX_CONCURRENCY (evita DDoS acidental)
// Loops agora usam Promise.allSettled para não cancelar os demais quando um falha.

import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { evaluateOperationAlerts } from '@/lib/alerts/engine';
import { publishEvent } from '@/lib/events/publish';

const HEARTBEAT_THRESHOLDS: Record<string, number> = {
  venda:      6 * 3600_000,
  atribuicao: 24 * 3600_000,
  trafego:    2 * 3600_000,
};

const SLOW_THRESHOLD_MS = 2000;
const REQUEST_TIMEOUT_MS = 8000;
const MAX_CONCURRENCY = 5; // máx requests HTTP simultâneos

// Executa promises em lotes de `limit` concorrentes
async function pLimit<T>(tasks: (() => Promise<T>)[], limit: number): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  for (let i = 0; i < tasks.length; i += limit) {
    const batch = tasks.slice(i, i + limit).map(fn => fn());
    const batchResults = await Promise.allSettled(batch);
    results.push(...batchResults);
  }
  return results;
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization') ?? '';

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  // Busca inicial: recursos, conexões e operações em paralelo
  const [resourcesRes, connectionsRes, operationsRes] = await Promise.all([
    admin.from('monitored_resources').select('id, operation_id, kind, url, label'),
    admin
      .from('integration_connections')
      .select('id, provider, category, status, last_event_at')
      .in('category', ['venda', 'atribuicao', 'tracker'])
      .eq('status', 'conectada'),
    admin.from('operations').select('id'),
  ]);

  const resources = (resourcesRes.data ?? []) as {
    id: string; operation_id: string; kind: string; url: string; label: string;
  }[];
  const connections = (connectionsRes.data ?? []) as {
    id: string; provider: string; category: string; status: string; last_event_at: string | null;
  }[];
  const operations = (operationsRes.data ?? []) as { id: string }[];

  // 1. Verificação paralela dos recursos (lotes de MAX_CONCURRENCY)
  const resourceTasks = resources.map(r => async () => {
    const result = await checkUrl(r.url, r.kind);
    await admin
      .from('monitored_resources')
      .update({ status: result.status, last_checked_at: new Date().toISOString() })
      .eq('id', r.id);
  });

  const resourceResults = await pLimit(resourceTasks, MAX_CONCURRENCY);
  const checkedResources = resourceResults.filter(r => r.status === 'fulfilled').length;

  // 2. Verificação de heartbeat em paralelo (DB writes rápidas, sem limit)
  const now = Date.now();
  const expiredConnections = connections.filter(conn => {
    if (!conn.last_event_at) return false;
    const threshold = HEARTBEAT_THRESHOLDS[conn.category] ?? 24 * 3600_000;
    return now - new Date(conn.last_event_at).getTime() > threshold;
  });

  const heartbeatResults = await Promise.allSettled(
    expiredConnections.map(async conn => {
      await admin
        .from('integration_connections')
        .update({ status: 'desconectada' })
        .eq('id', conn.id);

      // Busca operation_id e dashboard_id para o evento
      const { data: connRow } = await admin
        .from('integration_connections')
        .select('operation_id, dashboard_id')
        .eq('id', conn.id)
        .maybeSingle();

      if (connRow) {
        const isTracker = conn.category === 'tracker';
        await publishEvent(admin, {
          operation_id: connRow.operation_id,
          dashboard_id: connRow.dashboard_id,
          type: isTracker ? 'tracker_desconectado' : 'plataforma_desconectada',
          payload: { provider: conn.provider, category: conn.category },
        });
      }
    })
  );
  const updatedConnections = heartbeatResults.filter(r => r.status === 'fulfilled').length;

  // 3. Avaliação de alertas em paralelo (uma por operação, allSettled para resiliência)
  const alertResults = await Promise.allSettled(
    operations.map(op => evaluateOperationAlerts(admin, op.id))
  );
  const alertsEvaluated = alertResults.reduce((sum, r) => {
    if (r.status === 'fulfilled') return sum + (r.value?.evaluated ?? 0);
    return sum;
  }, 0);

  return NextResponse.json({
    checked_resources:   checkedResources,
    updated_connections: updatedConnections,
    alerts_evaluated:    alertsEvaluated,
    timestamp:           new Date().toISOString(),
  });
}

async function checkUrl(rawUrl: string, kind: string): Promise<{ status: string }> {
  let url = rawUrl.trim();
  if (kind === 'dominio' && !url.startsWith('http')) {
    url = `https://${url}`;
  }

  try {
    const start = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(url, {
        method:   'GET',
        redirect: 'follow',
        signal:   controller.signal,
        headers:  { 'User-Agent': 'CentralOperacoes-HealthCheck/1.0' },
      });
    } finally {
      clearTimeout(timer);
    }

    const elapsed = Date.now() - start;
    if (!res.ok && res.status >= 500) return { status: 'fora' };
    if (elapsed > SLOW_THRESHOLD_MS) return { status: 'lento' };
    return { status: 'no_ar' };
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : '';
    if (msg.includes('ssl') || msg.includes('certificate') || msg.includes('cert')) {
      return { status: 'fora' };
    }
    return { status: 'fora' };
  }
}
