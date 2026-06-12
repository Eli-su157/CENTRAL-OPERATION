// Motor de regras — executa automações ao receber um evento.
//
// FILOSOFIA MISTA:
//   Alertas automáticos: criados imediatamente (sem confirmação)
//   Ações (tarefas):     SUGERIDAS como pending_actions — 1 clique para confirmar
//   Notificações:        enviadas para o setor/papel relevante
//
// Cada evento tem donos definidos em EVENT_RULES (types.ts).
// Notifica por relevância: notifica só quem age sobre aquele tipo de evento.

import { EVENT_RULES, type AppEvent, type NotifyTarget } from './types';

const HIGH_TICKET_THRESHOLD = 500; // R$ — acima disso sugere onboarding

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function processEventRules(admin: any, event: AppEvent): Promise<void> {
  const rule = EVENT_RULES[event.type];
  if (!rule) return;

  const { operation_id, dashboard_id, id: event_id, payload } = event;

  // 1. Busca membros da operação para resolução de destinatários
  const { data: members } = await admin
    .from('profiles')
    .select('id, role, sector')
    .eq('operation_id', operation_id);

  if (!members?.length) return;

  const memberList = members as { id: string; role: string; sector: string | null }[];

  // 2. Resolve destinatários com base nos targets da regra
  const recipientIds = resolveRecipients(memberList, rule.notify);

  // 3. Monta título e body da notificação
  const { title, body, link } = buildNotificationContent(event);

  // 4. Cria notificações para cada destinatário
  if (recipientIds.length > 0) {
    const notifications = recipientIds.map(user_id => ({
      operation_id,
      user_id,
      event_id: event_id ?? null,
      type: event.type,
      title,
      body,
      link,
    }));

    await admin.from('notifications').insert(notifications).then(() => {});
  }

  // 5. Cria pending_action quando a regra define suggest_action
  //    Exceção: venda_aprovada — só sugere se for high-ticket
  if (rule.suggest_action) {
    const shouldSuggest = event.type !== 'venda_aprovada'
      || Number(payload['amount'] ?? 0) >= HIGH_TICKET_THRESHOLD;

    if (shouldSuggest) {
      await admin.from('pending_actions').insert({
        operation_id,
        dashboard_id:   dashboard_id ?? null,
        event_id:       event_id ?? null,
        type:           rule.suggest_action.type,
        title:          rule.suggest_action.title,
        description:    rule.suggest_action.description,
        target_role:    rule.suggest_action.target_role ?? null,
        target_sector:  rule.suggest_action.target_sector ?? null,
        link:           buildActionLink(event),
        task_payload:   buildTaskPayload(event),
        status:         'pendente',
      }).then(() => {});
    }
  }

  // 6. Evento criativo_vencedor — sem pending_action, mas notifica editor
  //    (já tratado nas notificações acima)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveRecipients(
  members: { id: string; role: string; sector: string | null }[],
  targets: NotifyTarget[]
): string[] {
  const ids = new Set<string>();
  for (const target of targets) {
    for (const m of members) {
      if (target === 'dono'       && m.role === 'dono')                      ids.add(m.id);
      if (target === 'head'       && (m.role === 'head' || m.role === 'dono')) ids.add(m.id);
      if (target === 'financeiro' && (m.sector === 'financeiro' || m.role === 'dono' || m.role === 'head')) ids.add(m.id);
      if (target === 'trafego'    && (m.sector === 'trafego'    || m.role === 'dono' || m.role === 'head')) ids.add(m.id);
      if (target === 'edicao'     && (m.sector === 'edicao'     || m.role === 'dono' || m.role === 'head')) ids.add(m.id);
      if (target === 'dev'        && (m.sector === 'dev'        || m.role === 'dono' || m.role === 'head')) ids.add(m.id);
    }
  }
  return Array.from(ids);
}

function buildNotificationContent(event: AppEvent): { title: string; body: string; link: string | null } {
  const p = event.payload;
  const fmt = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

  switch (event.type) {
    case 'venda_aprovada':
      return {
        title: `Venda aprovada — ${fmt(Number(p['amount'] ?? 0))}`,
        body:  `Plataforma: ${p['provider'] ?? '—'}${p['campaign_name'] ? ` · ${p['campaign_name']}` : ''}`,
        link:  event.dashboard_id ? `/app/d/${event.dashboard_id}` : '/app',
      };
    case 'reembolso':
      return {
        title: `Reembolso — ${fmt(Number(p['amount'] ?? 0))}`,
        body:  `Transação ${p['external_id'] ?? '—'} reembolsada.`,
        link:  event.dashboard_id ? `/app/d/${event.dashboard_id}` : '/app',
      };
    case 'chargeback':
      return {
        title: `Chargeback detectado — ${fmt(Number(p['amount'] ?? 0))}`,
        body:  `Transação ${p['external_id'] ?? '—'}. Acione o suporte da plataforma.`,
        link:  event.dashboard_id ? `/app/d/${event.dashboard_id}` : '/app',
      };
    case 'comissao_lancada':
      return {
        title: `Comissão lançada — ${fmt(Number(p['amount'] ?? 0))}`,
        body:  `A pagar para ${p['user_name'] ?? 'membro da equipe'}.`,
        link:  '/app/financeiro',
      };
    case 'meta_em_risco':
      return {
        title: `Meta de ${p['tipo'] ?? ''} em risco`,
        body:  `Pace em ${Number(p['pct'] ?? 0).toFixed(0)}% do alvo. Verifique as campanhas.`,
        link:  event.dashboard_id ? `/app/d/${event.dashboard_id}/trafego` : '/app',
      };
    case 'criativo_vencedor':
      return {
        title: `Criativo vencedor — ROAS ${Number(p['roas'] ?? 0).toFixed(2)}x`,
        body:  `"${p['ad_name'] ?? p['campaign_name'] ?? '—'}" está performando acima do alvo. Escalar?`,
        link:  event.dashboard_id ? `/app/d/${event.dashboard_id}/edicao` : '/app',
      };
    case 'conta_bloqueada':
      return {
        title: `Conta bloqueada — ${p['platform'] ?? ''}`,
        body:  `${p['account_name'] ?? 'Conta'} foi bloqueada. Acesse a plataforma para desbloquear.`,
        link:  event.dashboard_id ? `/app/d/${event.dashboard_id}/trafego` : '/app',
      };
    case 'plataforma_desconectada':
      return {
        title: `Plataforma desconectada — ${p['provider'] ?? ''}`,
        body:  `A integração ${p['provider']} perdeu conexão. Verifique as credenciais.`,
        link:  event.dashboard_id ? `/app/d/${event.dashboard_id}/dev` : '/app',
      };
    case 'tracker_desconectado':
      return {
        title: `Tracker desconectado — ${p['provider'] ?? ''}`,
        body:  `Sem eventos do tracker há mais de 6h. Dados de atribuição podem estar desatualizados.`,
        link:  event.dashboard_id ? `/app/d/${event.dashboard_id}/dev` : '/app',
      };
    case 'recurso_caiu':
      return {
        title: `Recurso ${p['status'] === 'lento' ? 'lento' : 'fora do ar'} — ${p['label'] ?? ''}`,
        body:  `${p['url'] ?? '—'} está ${p['status'] === 'lento' ? 'respondendo lentamente' : 'fora do ar'}.`,
        link:  event.dashboard_id ? `/app/d/${event.dashboard_id}/dev` : '/app',
      };
    default:
      return { title: String(event.type), body: '', link: null };
  }
}

function buildActionLink(event: AppEvent): string | null {
  if (!event.dashboard_id) return '/app';
  const base = `/app/d/${event.dashboard_id}`;
  if (event.type === 'plataforma_desconectada' || event.type === 'tracker_desconectado') return `${base}/dev`;
  if (event.type === 'reembolso' || event.type === 'chargeback') return '/app/financeiro';
  if (event.type === 'conta_bloqueada' || event.type === 'meta_em_risco') return `${base}/trafego`;
  if (event.type === 'recurso_caiu') return `${base}/dev`;
  return base;
}

function buildTaskPayload(event: AppEvent): Record<string, unknown> {
  return {
    origin_event_type: event.type,
    origin_event_id:   event.id,
    dashboard_id:      event.dashboard_id,
    ...event.payload,
  };
}
