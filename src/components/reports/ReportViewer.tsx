import { formatCurrency, formatPercent, formatDelta, deltaColor } from '@/lib/utils/format';
import { formatPeriodLabel } from '@/lib/reports/periods';
import { KPICard, MetricBlock, SectionHeader } from '@/components/ui';
import type { ReportData } from '@/lib/reports/types';

interface Props {
  report: {
    id: string;
    period_type: 'semanal' | 'mensal';
    period_ref: string;
    status: 'rascunho' | 'congelado';
    generated_data: ReportData;
    head_comment: string | null;
    frozen_at: string | null;
    created_at: string;
  };
  /** Snapshot do período anterior para cálculo de variação */
  prevData?: ReportData;
}

const SECTOR_LABEL: Record<string, string> = {
  trafego: 'Tráfego', edicao: 'Edição', dev: 'Dev', financeiro: 'Financeiro',
};

const TYPE_LABEL: Record<string, string> = {
  criativo_imagem: 'Criativo Imagem', criativo_video: 'Criativo Vídeo',
  vsl: 'VSL', pagina: 'Página', copy: 'Copy',
};

function pct(current: number, prev: number | undefined): number | null {
  if (prev == null || prev === 0) return null;
  return ((current - prev) / Math.abs(prev)) * 100;
}

function deltaSub(val: number | null, invertLogic = false): { sub?: string; subClass?: string } {
  if (val == null) return {};
  return {
    sub: formatDelta(val) + ' vs período ant.',
    subClass: deltaColor(val, invertLogic),
  };
}

function AreaCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-[#111111] border border-white/[0.06] rounded-xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/[0.05]">
        <span className="text-zinc-500">{icon}</span>
        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-[0.12em]">{title}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Row({ label, value, valueClass = 'text-white', indent = false, sub, subClass }: {
  label: string; value: string; valueClass?: string; indent?: boolean; sub?: string; subClass?: string;
}) {
  return (
    <div className={`flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0 ${indent ? 'pl-4' : ''}`}>
      <span className={`text-sm ${indent ? 'text-zinc-500' : 'text-zinc-300'}`}>{label}</span>
      <div className="text-right">
        <span className={`text-sm font-semibold tabular-nums ${valueClass}`}>{value}</span>
        {sub && <p className={`text-[11px] tabular-nums ${subClass ?? 'text-zinc-600'}`}>{sub}</p>}
      </div>
    </div>
  );
}

function TaskBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? (done / total) * 100 : 0;
  return (
    <div className="mt-3">
      <div className="flex justify-between text-[11px] text-zinc-500 mb-1.5">
        <span>{done} concluídas de {total}</span>
        <span>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function ReportViewer({ report, prevData }: Props) {
  const d = report.generated_data;
  const { financeiro: f, trafego: t, producao: p, operacao: o } = d;
  const pf = prevData?.financeiro;
  const pt = prevData?.trafego;
  const po = prevData?.operacao;

  // Cálculos derivados
  const margem = f.receita_bruta > 0 ? (f.lucro_liquido / f.receita_bruta) * 100 : 0;
  const prevMargem = pf && pf.receita_bruta > 0 ? (pf.lucro_liquido / pf.receita_bruta) * 100 : undefined;
  const margemDelta = prevMargem != null ? margem - prevMargem : null;

  const receitaDelta   = pct(f.receita_bruta,      pf?.receita_bruta);
  const lucroDelta     = pct(f.lucro_liquido,      pf?.lucro_liquido);
  const gastoTrafDelta = t ? pct(t.gasto_total,    pt?.gasto_total)    : null;
  const roasDelta      = t ? pct(t.roas_confirmado, pt?.roas_confirmado) : null;
  const tasksDelta     = pct(o.tarefas_concluidas, po?.tarefas_concluidas);

  const lucroPositivo = f.lucro_liquido >= 0;

  return (
    <article className="max-w-3xl space-y-5">
      {/* ── Cabeçalho ─────────────────────────────────────────── */}
      <div className="pb-5 border-b border-white/[0.05] relative">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-orange-500/15 via-orange-500/5 to-transparent" />
        <div className="flex flex-wrap items-center gap-3 mb-1">
          <h2 className="text-xl font-bold text-white tracking-tight">
            {formatPeriodLabel(report.period_type, report.period_ref)}
          </h2>
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
            report.status === 'congelado'
              ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400'
              : 'bg-amber-950/60 border-amber-800/60 text-amber-400'
          }`}>
            {report.status === 'congelado' ? '🔒 Congelado' : '✏️ Rascunho'}
          </span>
        </div>
        <p className="text-sm text-zinc-500">
          {d.period_start} → {d.period_end}
          {report.frozen_at && ` · congelado em ${new Date(report.frozen_at).toLocaleDateString('pt-BR')}`}
        </p>
      </div>

      {/* ── Resumo do período — KPIs principais ───────────────── */}
      <div>
        <SectionHeader title="Resumo do Período" variant="section" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <KPICard
            label="Receita Bruta"
            value={formatCurrency(f.receita_bruta)}
            accent="positive"
            {...deltaSub(receitaDelta)}
          />
          <KPICard
            label="Lucro Líquido"
            value={formatCurrency(f.lucro_liquido)}
            accent={lucroPositivo ? 'positive' : 'negative'}
            {...deltaSub(lucroDelta)}
          />
          <KPICard
            label="Margem"
            value={formatPercent(margem)}
            accent={margem >= 20 ? 'positive' : margem >= 0 ? 'brand' : 'negative'}
            sub={margemDelta != null
              ? formatDelta(margemDelta, 'pp') + ' vs período ant.'
              : undefined}
            subClass={margemDelta != null ? deltaColor(margemDelta) : undefined}
          />
          {t ? (
            <KPICard
              label="ROAS"
              value={`${t.roas_confirmado.toFixed(2)}x`}
              accent={t.roas_confirmado >= 2 ? 'positive' : t.roas_confirmado >= 1 ? 'brand' : 'negative'}
              {...deltaSub(roasDelta)}
            />
          ) : (
            <KPICard label="ROAS" value="—" accent="neutral" sub="sem tracker conectado" />
          )}
        </div>
      </div>

      {/* ── Análise do Head ───────────────────────────────────── */}
      {report.head_comment && (
        <div className="bg-white/[0.02] border border-orange-500/10 rounded-xl p-5">
          <p className="text-[10px] font-semibold text-orange-400 uppercase tracking-[0.12em] mb-2">
            Análise do Head
          </p>
          <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
            {report.head_comment}
          </p>
        </div>
      )}

      {/* ── Área: Financeiro ──────────────────────────────────── */}
      <AreaCard
        title="Financeiro"
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        }
      >
        <div className="grid sm:grid-cols-2 gap-x-8">
          <div>
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-[0.1em] mb-2">Receitas</p>
            <Row label="Receita Bruta"   value={formatCurrency(f.receita_bruta)}    valueClass="text-emerald-400" />
            <Row label="↳ Taxas"         value={`-${formatCurrency(f.taxas_plataforma)}`}  valueClass="text-red-400" indent />
            <Row label="↳ Reembolsos"    value={`-${formatCurrency(f.reembolsos)}`}         valueClass="text-red-400" indent />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-[0.1em] mb-2">Custos</p>
            <Row label="Gasto Tráfego"   value={`-${formatCurrency(f.gasto_trafego)}`}  valueClass="text-red-400" />
            <Row label="Comissões"        value={`-${formatCurrency(f.comissoes)}`}       valueClass="text-red-400" />
            <Row label="Custos Fixos"     value={`-${formatCurrency(f.custos_fixos + f.outros_custos)}`} valueClass="text-red-400" />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between">
          <span className="text-sm font-bold text-white">Lucro Líquido</span>
          <div className="text-right">
            <p className={`text-2xl font-bold tabular-nums num ${lucroPositivo ? 'text-emerald-300' : 'text-red-300'}`}>
              {formatCurrency(f.lucro_liquido)}
            </p>
            {lucroDelta != null && (
              <p className={`text-xs tabular-nums ${deltaColor(lucroDelta)}`}>
                {formatDelta(lucroDelta)} vs período ant.
              </p>
            )}
          </div>
        </div>

        {(f.a_receber > 0 || f.a_pagar > 0) && (
          <div className="mt-3 pt-3 border-t border-white/[0.04] grid grid-cols-2 gap-4">
            <MetricBlock label="A receber" value={formatCurrency(f.a_receber)} valueClass="text-emerald-400" />
            <MetricBlock label="A pagar"   value={formatCurrency(f.a_pagar)}   valueClass="text-red-400" />
          </div>
        )}
      </AreaCard>

      {/* ── Área: Tráfego — omitida quando sem tracker ─────────── */}
      {t && (
        <AreaCard
          title="Tráfego"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          }
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <MetricBlock
              label="Gasto Total"
              value={formatCurrency(t.gasto_total)}
              delta={gastoTrafDelta != null ? formatDelta(gastoTrafDelta) + ' vs ant.' : undefined}
              deltaClass={gastoTrafDelta != null ? deltaColor(gastoTrafDelta, true) : undefined}
            />
            <MetricBlock
              label="Faturamento"
              value={formatCurrency(t.faturamento_total)}
              valueClass="text-emerald-400"
            />
            <MetricBlock
              label="Campanhas Ativas"
              value={String(t.campanhas_ativas)}
            />
          </div>
          <Row
            label="ROAS confirmado"
            value={`${t.roas_confirmado.toFixed(2)}x`}
            valueClass={t.roas_confirmado >= 2 ? 'text-emerald-400' : 'text-amber-400'}
            sub={roasDelta != null ? formatDelta(roasDelta) + ' vs período ant.' : undefined}
            subClass={roasDelta != null ? deltaColor(roasDelta) : undefined}
          />
          <Row
            label="ROAS projetado"
            value={`${t.roas_projetado.toFixed(2)}x`}
            valueClass="text-zinc-400"
          />
        </AreaCard>
      )}

      {/* ── Área: Tarefas & Operação ──────────────────────────── */}
      <AreaCard
        title="Tarefas"
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <polyline points="9 11 12 14 22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
        }
      >
        <div className="grid grid-cols-3 gap-3 mb-3">
          <MetricBlock
            label="Concluídas"
            value={String(o.tarefas_concluidas)}
            valueClass="text-emerald-400"
            delta={tasksDelta != null ? formatDelta(tasksDelta) + ' vs ant.' : undefined}
            deltaClass={tasksDelta != null ? deltaColor(tasksDelta) : undefined}
          />
          <MetricBlock label="Pendentes" value={String(o.tarefas_pendentes)} />
          <MetricBlock
            label="Atrasadas"
            value={String(o.tarefas_atrasadas)}
            valueClass={o.tarefas_atrasadas > 0 ? 'text-red-400' : 'text-zinc-400'}
            highlight={o.tarefas_atrasadas > 2}
          />
        </div>

        {o.total_tarefas > 0 && (
          <TaskBar done={o.tarefas_concluidas} total={o.total_tarefas} />
        )}

        {o.gargalos.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/[0.04]">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.1em] mb-2">
              Gargalos
            </p>
            <div className="flex flex-wrap gap-2">
              {o.gargalos.map(g => (
                <span
                  key={g.setor}
                  className="text-xs bg-red-950/30 border border-red-800/40 text-red-400 px-2.5 py-1 rounded-full"
                >
                  {SECTOR_LABEL[g.setor] ?? g.setor}: {g.quantidade} atrasad{g.quantidade !== 1 ? 'as' : 'a'}
                </span>
              ))}
            </div>
          </div>
        )}
      </AreaCard>

      {/* ── Área: Produção ────────────────────────────────────── */}
      <AreaCard
        title="Produção de Conteúdo"
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
        }
      >
        <div className="grid grid-cols-3 gap-3">
          <MetricBlock label="Entregues"    value={String(p.materiais_entregues)} valueClass="text-emerald-400" />
          <MetricBlock label="No ar"        value={String(p.materiais_no_ar)} />
          <MetricBlock label="Em produção"  value={String(p.materiais_em_producao)} valueClass="text-amber-400" />
        </div>

        {p.criativo_destaque && p.roas_criativo_destaque !== null && (
          <div className="mt-4 pt-4 border-t border-white/[0.04]">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.1em] mb-1.5">
              Criativo destaque
            </p>
            <p className="text-sm text-white font-medium">
              {p.criativo_destaque.slice(0, 8)}…
              <span className="text-zinc-500 font-normal"> · ROAS </span>
              <span className="text-emerald-400">{p.roas_criativo_destaque.toFixed(1)}x</span>
            </p>
          </div>
        )}

        {Object.keys(p.por_tipo).length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/[0.04]">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.1em] mb-2">Por tipo</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(p.por_tipo).map(([tipo, n]) => (
                <span key={tipo} className="text-xs bg-white/[0.04] border border-white/[0.06] text-zinc-400 px-2.5 py-1 rounded-full">
                  {TYPE_LABEL[tipo] ?? tipo}: {n}
                </span>
              ))}
            </div>
          </div>
        )}
      </AreaCard>

      <p className="text-[11px] text-zinc-700 pt-1">
        Snapshot gerado em {new Date(d.gerado_em).toLocaleString('pt-BR')}
      </p>
    </article>
  );
}
