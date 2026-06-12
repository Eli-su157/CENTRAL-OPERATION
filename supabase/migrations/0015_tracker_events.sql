-- ============================================================
-- 0015 — Tracker (atribuição genérica) + ERP de Eventos
-- ============================================================

-- ── TRACKER_SALES: vendas atribuídas individualmente pelo tracker ──────────────
-- Uma linha por evento de venda recebido pelo webhook do tracker.
-- external_id + operation_id + provider são UNIQUE para idempotência.
CREATE TABLE tracker_sales (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_id    uuid        NOT NULL REFERENCES operations(id)  ON DELETE CASCADE,
  dashboard_id    uuid        REFERENCES dashboards(id)           ON DELETE SET NULL,
  provider        text        NOT NULL,  -- 'utmify', 'hyros', 'redtrack', ...

  -- Casamento com sales (pode ser nulo se venda ainda não chegou)
  sale_id         uuid        REFERENCES sales(id)                ON DELETE SET NULL,
  external_id     text,                  -- ID da venda na plataforma de pagamento

  -- Atribuição de anúncio (do tracker)
  campaign_id     text,
  campaign_name   text,
  adset_id        text,
  adset_name      text,
  ad_id           text,
  ad_name         text,
  platform        text,                  -- 'facebook_ads', 'google_ads', ...

  -- UTM
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  utm_content     text,
  utm_term        text,

  -- Venda
  amount          numeric     NOT NULL DEFAULT 0,
  status          text        NOT NULL DEFAULT 'aprovado',
  occurred_at     timestamptz NOT NULL,

  raw             jsonb       DEFAULT '{}',
  created_at      timestamptz DEFAULT now(),

  UNIQUE (operation_id, provider, external_id)
);

-- RLS: leitura apenas para membros da operação
ALTER TABLE tracker_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tracker_sales_member_read" ON tracker_sales
  FOR SELECT USING (
    operation_id = (
      SELECT operation_id FROM profiles WHERE id = auth.uid() LIMIT 1
    )
  );
-- Escrita somente via service role (webhook receiver usa admin client)
CREATE POLICY "tracker_sales_service_insert" ON tracker_sales
  FOR INSERT WITH CHECK (true);

-- ── TRACKER_AGGREGATES: métricas diárias agregadas do tracker ─────────────────
-- Alguns trackers (Hyros, RedTrack) enviam resumos diários com ROAS/ROI prontos.
-- UTMify não envia; a linha é criada computando da tracker_sales.
CREATE TABLE tracker_aggregates (
  id               uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_id     uuid    NOT NULL REFERENCES operations(id)  ON DELETE CASCADE,
  dashboard_id     uuid    REFERENCES dashboards(id)           ON DELETE SET NULL,
  provider         text    NOT NULL,

  aggregate_date   date    NOT NULL,
  campaign_id      text,
  campaign_name    text,
  adset_id         text,
  ad_id            text,
  ad_name          text,

  -- Métricas (preenchidas pelo tracker ou computadas localmente)
  spend            numeric DEFAULT 0,
  revenue          numeric DEFAULT 0,
  attributed_sales integer DEFAULT 0,
  roas             numeric DEFAULT 0,
  roi              numeric DEFAULT 0,

  raw              jsonb   DEFAULT '{}',
  fetched_at       timestamptz DEFAULT now(),

  UNIQUE (operation_id, provider, aggregate_date, campaign_id, adset_id, ad_id)
);

ALTER TABLE tracker_aggregates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tracker_aggregates_member_read" ON tracker_aggregates
  FOR SELECT USING (
    operation_id = (
      SELECT operation_id FROM profiles WHERE id = auth.uid() LIMIT 1
    )
  );
CREATE POLICY "tracker_aggregates_service_write" ON tracker_aggregates
  FOR ALL WITH CHECK (true);

-- ── EVENTS: log imutável de eventos do negócio ────────────────────────────────
CREATE TABLE events (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_id uuid        NOT NULL REFERENCES operations(id)  ON DELETE CASCADE,
  dashboard_id uuid        REFERENCES dashboards(id)           ON DELETE SET NULL,
  type         text        NOT NULL,  -- venda_aprovada | reembolso | chargeback | ...
  payload      jsonb       NOT NULL DEFAULT '{}',
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX events_operation_created ON events (operation_id, created_at DESC);
CREATE INDEX events_type ON events (type);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_member_read" ON events
  FOR SELECT USING (
    operation_id = (
      SELECT operation_id FROM profiles WHERE id = auth.uid() LIMIT 1
    )
  );
CREATE POLICY "events_service_write" ON events
  FOR INSERT WITH CHECK (true);

-- ── PENDING_ACTIONS: ações sugeridas aguardando confirmação (1 clique) ─────────
CREATE TABLE pending_actions (
  id                    uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_id          uuid    NOT NULL REFERENCES operations(id)  ON DELETE CASCADE,
  dashboard_id          uuid    REFERENCES dashboards(id)           ON DELETE SET NULL,
  event_id              uuid    REFERENCES events(id)               ON DELETE CASCADE,

  type                  text    NOT NULL,   -- 'criar_tarefa' | 'reconectar_plataforma' | 'investigar_reembolso'
  title                 text    NOT NULL,
  description           text,
  link                  text,               -- URL de ação direta (ex: /app/d/xxx/dev)

  -- Para quem a ação é direcionada (role ou sector)
  target_role           text,               -- 'dono' | 'head' | null
  target_sector         text,               -- 'trafego' | 'edicao' | 'dev' | 'financeiro' | null

  -- Payload para criar tarefa automaticamente ao confirmar
  task_payload          jsonb   DEFAULT '{}',

  status                text    NOT NULL DEFAULT 'pendente',  -- 'pendente' | 'confirmada' | 'descartada'
  confirmed_by          uuid    REFERENCES profiles(id)       ON DELETE SET NULL,
  confirmed_at          timestamptz,
  created_at            timestamptz DEFAULT now()
);

CREATE INDEX pending_actions_operation ON pending_actions (operation_id, status, created_at DESC);

ALTER TABLE pending_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pending_actions_read" ON pending_actions
  FOR SELECT USING (
    operation_id = (
      SELECT operation_id FROM profiles WHERE id = auth.uid() LIMIT 1
    )
  );
CREATE POLICY "pending_actions_update_own_op" ON pending_actions
  FOR UPDATE USING (
    operation_id = (
      SELECT operation_id FROM profiles WHERE id = auth.uid() LIMIT 1
    )
  );
CREATE POLICY "pending_actions_service_write" ON pending_actions
  FOR INSERT WITH CHECK (true);

-- ── NOTIFICATIONS: notificações por usuário ───────────────────────────────────
CREATE TABLE notifications (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_id uuid        NOT NULL REFERENCES operations(id)  ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES profiles(id)    ON DELETE CASCADE,
  event_id     uuid        REFERENCES events(id)               ON DELETE SET NULL,

  type         text        NOT NULL,
  title        text        NOT NULL,
  body         text        NOT NULL,
  link         text,
  read         boolean     NOT NULL DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX notifications_user_unread ON notifications (user_id, read, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
-- Usuário lê apenas suas próprias notificações
CREATE POLICY "notifications_own_read" ON notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_own_update" ON notifications
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "notifications_service_insert" ON notifications
  FOR INSERT WITH CHECK (true);
