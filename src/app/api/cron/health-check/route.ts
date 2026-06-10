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
// Recursos sem resposta em 8s = 'fora'. Resposta > 2s = 'lento'. 2xx < 2s = 'no_ar'.

import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { evaluateOperationAlerts } from '@/lib/alerts/engine';

// Thresholds de heartbeat (ms sem evento → desconectada)
const HEARTBEAT_THRESHOLDS: Record<string, number> = {
  venda:      6 * 3600_000,   // 6h sem venda = suspeito
  atribuicao: 24 * 3600_000,  // 24h sem UTMify = suspeito
  trafego:    2 * 3600_000,   // não aplicado aqui (pull é cron)
};

// Threshold de resposta lenta (ms)
const SLOW_THRESHOLD_MS = 2000;
const REQUEST_TIMEOUT_MS = 8000;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization') ?? '';

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  // 1. Busca todos os monitored_resources
  const { data: resources } = await admin
    .from('monitored_resources')
    .select('id, operation_id, kind, url, label');

  let checkedResources = 0;
  let updatedConnections = 0;

  // 2. Verifica cada recurso monitorado
  for (const r of (resources ?? []) as {
    id: string; operation_id: string; kind: string; url: string; label: string;
  }[]) {
    const result = await checkUrl(r.url, r.kind);
    await admin
      .from('monitored_resources')
      .update({ status: result.status, last_checked_at: new Date().toISOString() })
      .eq('id', r.id);
    checkedResources++;
  }

  // 3. Verifica heartbeat das integration_connections (venda + atribuicao)
  const { data: connections } = await admin
    .from('integration_connections')
    .select('id, provider, category, status, last_event_at')
    .in('category', ['venda', 'atribuicao'])
    .eq('status', 'conectada');

  const now = Date.now();
  for (const conn of (connections ?? []) as {
    id: string; provider: string; category: string; status: string; last_event_at: string | null;
  }[]) {
    if (!conn.last_event_at) continue; // sem histórico — não marcar como desconectada

    const threshold = HEARTBEAT_THRESHOLDS[conn.category] ?? 24 * 3600_000;
    const msSinceEvent = now - new Date(conn.last_event_at).getTime();

    if (msSinceEvent > threshold) {
      await admin
        .from('integration_connections')
        .update({ status: 'desconectada' })
        .eq('id', conn.id);
      updatedConnections++;
    }
  }

  // 4. Avalia motor de alertas para todas as operações distintas
  const { data: operations } = await admin
    .from('operations')
    .select('id');

  let alertsEvaluated = 0;
  for (const op of (operations ?? []) as { id: string }[]) {
    try {
      const result = await evaluateOperationAlerts(admin, op.id);
      alertsEvaluated += result.evaluated;
    } catch {
      // Falha em uma operação não cancela as outras
    }
  }

  return NextResponse.json({
    checked_resources:    checkedResources,
    updated_connections:  updatedConnections,
    alerts_evaluated:     alertsEvaluated,
    timestamp:            new Date().toISOString(),
  });
}

// Verifica URL e classifica status
async function checkUrl(rawUrl: string, kind: string): Promise<{ status: string }> {
  // Normaliza a URL
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

    if (!res.ok && res.status >= 500) {
      return { status: 'fora' };
    }

    if (elapsed > SLOW_THRESHOLD_MS) {
      return { status: 'lento' };
    }

    return { status: 'no_ar' };
  } catch (err) {
    // AbortError (timeout) ou SSL/rede error → fora
    const msg = err instanceof Error ? err.message.toLowerCase() : '';
    if (msg.includes('ssl') || msg.includes('certificate') || msg.includes('cert')) {
      return { status: 'fora' }; // SSL inválido/expirado
    }
    return { status: 'fora' };
  }
}
