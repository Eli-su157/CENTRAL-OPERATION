import { formatCurrency, formatPercent, formatDelta, deltaColor } from '@/lib/utils/format';
import { formatPeriodLabel } from '@/lib/reports/periods';
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

function DeltaBadge({ val, invert = false }: { val: number | null; invert?: boolean }) {
  if (val == null) return null;
  const positive = invert ? val < 0 : val > 0;
  const neutral = Math.abs(val) < 0.5;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold num px-1.5 py-0.5 rounded-md ${
      neutral ? 'text-zinc-600 bg-zinc-800/50' :
      positive ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
    }`}>
      {val > 0 ? '↑' : val < 0 ? '↓' : '·'}{Math.abs(val).toFixed(1)}%
    </span>
  );
}

function SectionCard({
  title, icon, accent = 'neutral', children,
}: {
  title: string;
  icon: React.ReactNode;
  accent?: 'emerald' | 'blue' | 'orange' | 'purple' | 'neutral';
  children: React.ReactNode;
}) {
  const accentLine = {
    emerald: 'via-emerald-500/30',
    blue:    'via-blue-500/30',
    orange:  'via-orange-500/30',
    purple:  'via-purple-500/30',
    neutral: 'via-white/[0.08]',
  }[accent];

  const iconCls = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    blue:    'text-blue-400 bg-blue-500/10 border-blue-500/20',
    orange:  'text-orange-400 bg-orange-500/10 border-orange-500/20',
    purple:  'text-purple-400 bg-purple-500/10 border-purple-500/20',
    neutral: 'text-zinc-500 bg-white/[0.04] border-white/[0.06]',
  }[accent];

  return (
    <div className="bg-[#0c0c0f] border border-white/[0.07] rounded-2xl overflow-hidden">
      <div className={`h-[2px] bg-gradient-to-r from-transparent ${accentLine} to-transparent`} />
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.05]">
        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${iconCls}`}>
          {icon}
        </div>
        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest font-mono">{title}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function StatRow({ label, value, valueClass = 'text-zinc-200', indent = false, delta = null, invertDelta = false }: {
  label: string; value: string; valueClass?: string; indent?: boolean;
  delta?: number | null; invertDelta?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0 ${indent ? 'pl-5' : ''}`}>
      <span className={`text-sm ${indent ? 'text-zinc-600' : 'text-zinc-400'}`}>{label}</span>
      <div className="flex items-center gap-2">
        {delta !== null && <DeltaBadge val={delta} invert={invertDelta} />}
        <span className={`text-sm font-semibold tabular-nums num ${valueClass}`}>{value}</span>
      </div>
    </div>
  );
}

function KPITile({ label, value, sub, valueClass = 'text-white', accentColor = '#71717a' }: {
  label: string; value: string; sub?: string; valueClass?: string; accentColor?: string;
}) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[1.5px]" style={{ background: `linear-gradient(to right, transparent, ${accentColor}40, transparent)` }} />
      <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono mb-2">{label}</p>
      <p className={`text-2xl font-black num leading-none ${valueClass}`}>{value}</p>
      {sub && <p className="text-[10px] text-zinc-600 mt-1.5 num">{sub}</p>}
    </div>
  );
}

function TaskProgressBar({ done, total }: { done: number; total: number }) {
  const p = total > 0 ? (done / total) * 100 : 0;
  const color = p >= 80 ? '#34d399' : p >= 50 ? '#f97316' : '#f87171';
  return (
    <div className="mt-4 p-3.5 bg-white/[0.02] rounded-xl border border-white/[0.04]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-zinc-500">{done} concluídas de {total}</span>
        <span className="text-xs font-bold num" style={{ color }}>{p.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${p}%`, background: `linear-gradient(to right, ${color}99, ${color})` }}
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

  const margem = f.receita_bruta > 0 ? (f.lucro_liquido / f.receita_bruta) * 100 : 0;
  const prevMargem = pf && pf.receita_bruta > 0 ? (pf.lucro_liquido / pf.receita_bruta) * 100 : undefined;
  const margemDelta = prevMargem != null ? margem - prevMargem : null;

  const receitaDelta   = pct(f.receita_bruta,       pf?.receita_bruta);
  const lucroDelta     = pct(f.lucro_liquido,        pf?.lucro_liquido);
  const gastoTrafDelta = t ? pct(t.gasto_total,      pt?.gasto_total)      : null;
  const roasDelta      = t ? pct(t.roas_confirmado,  pt?.roas_confirmado)  : null;
  const tasksDelta     = pct(o.tarefas_concluidas,   po?.tarefas_concluidas);

  const lucroPositivo = f.lucro_liquido >= 0;

  return (
    <article className="space-y-5">
      {/* ── Cabeçalho do relatório ─────────────────────────────── */}
      <div className="bg-[#0c0c0f] border border-white/[0.07] rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-orange-500/[0.03] blur-3xl rounded-full pointer-events-none" />

        <div className="flex flex-wrap items-start justify-between gap-3 relative">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-black text-white tracking-tight">
                {formatPeriodLabel(report.period_type, report.period_ref)}
              </h2>
              <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-bold font-mono ${
                report.status === 'congelado'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              }`}>
                {report.status === 'congelado' ? '🔒 Congelado' : '✏️ Rascunho'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-600 font-mono">
              {d.period_start} → {d.period_end}
              {report.frozen_at && ` · congelado ${new Date(report.frozen_at).toLocaleDateString('pt-BR')}`}
            </p>
          </div>
          {/* Score de saúde rápido */}
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1.5 rounded-xl border text-sm font-black num ${
              lucroPositivo && margem >= 20
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : lucroPositivo
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                : 'bg-red-500/10 border-red-500/20 text-red-300'
            }`}>
              {lucroPositivo && margem >= 20 ? '● Saudável' : lucroPositivo ? '● Atenção' : '● Prejuízo'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Resumo do período — 4 KPIs ─────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPITile
          label="Receita Bruta"
          value={formatCurrency(f.receita_bruta)}
          sub={receitaDelta != null ? `${formatDelta(receitaDelta)} vs ant.` : undefined}
          valueClass="text-emerald-300"
          accentColor="#34d399"
        />
        <KPITile
          label="Lucro Líquido"
          value={formatCurrency(f.lucro_liquido)}
          sub={lucroDelta != null ? `${formatDelta(lucroDelta)} vs ant.` : undefined}
          valueClass={lucroPositivo ? 'text-emerald-200' : 'text-red-300'}
          accentColor={lucroPositivo ? '#34d399' : '#f87171'}
        />
        <KPITile
          label="Margem"
          value={formatPercent(margem)}
          sub={margemDelta != null ? `${margemDelta > 0 ? '+' : ''}${margemDelta.toFixed(1)}pp vs ant.` : undefined}
          valueClass={margem >= 20 ? 'text-emerald-300' : margem >= 0 ? 'text-amber-300' : 'text-red-300'}
          accentColor={margem >= 20 ? '#34d399' : margem >= 0 ? '#f59e0b' : '#f87171'}
        />
        {t ? (
          <KPITile
            label="ROAS"
            value={`${t.roas_confirmado.toFixed(2)}x`}
            sub={roasDelta != null ? `${formatDelta(roasDelta)} vs ant.` : undefined}
            valueClass={t.roas_confirmado >= 2 ? 'text-emerald-300' : t.roas_confirmado >= 1 ? 'text-amber-300' : 'text-red-300'}
            accentColor={t.roas_confirmado >= 2 ? '#34d399' : '#f59e0b'}
          />
        ) : (
          <KPITile label="ROAS" value="—" sub="sem tracker" accentColor="#52525b" valueClass="text-zinc-600" />
        )}
      </div>

      {/* ── Análise do Head ───────────────────────────────────── */}
      {report.head_comment && (
        <div className="bg-orange-500/[0.04] border border-orange-500/15 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
          <div className="flex items-center gap-2 mb-3">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <p className="text-[10px] font-bold text-orange-400/80 uppercase tracking-widest font-mono">Análise do Head</p>
          </div>
          <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{report.head_comment}</p>
        </div>
      )}

      {/* ── Financeiro ────────────────────────────────────────── */}
      <SectionCard title="Financeiro" accent="emerald" icon={
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      }>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-0">
          <div>
            <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono mb-2">Receitas</p>
            <StatRow label="Receita Bruta" value={formatCurrency(f.receita_bruta)} valueClass="text-emerald-400" delta={receitaDelta} />
            {f.taxas_plataforma > 0 && <StatRow label="↳ Taxas de plataforma" value={`-${formatCurrency(f.taxas_plataforma)}`} valueClass="text-red-400" indent />}
            {f.reembolsos > 0 && <StatRow label="↳ Reembolsos" value={`-${formatCurrency(f.reembolsos)}`} valueClass="text-red-400" indent />}
          </div>
          <div>
            <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono mb-2">Custos</p>
            {f.gasto_trafego > 0 && <StatRow label="Gasto Tráfego" value={`-${formatCurrency(f.gasto_trafego)}`} valueClass="text-red-400" />}
            {f.comissoes > 0 && <StatRow label="Comissões" value={`-${formatCurrency(f.comissoes)}`} valueClass="text-red-400" />}
            {(f.custos_fixos + f.outros_custos) > 0 && <StatRow label="Custos Fixos + Outros" value={`-${formatCurrency(f.custos_fixos + f.outros_custos)}`} valueClass="text-red-400" />}
          </div>
        </div>

        {/* Resultado */}
        <div className={`mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between rounded-xl p-4 ${lucroPositivo ? 'bg-emerald-500/[0.04] border border-emerald-500/10' : 'bg-red-500/[0.04] border border-red-500/10'}`}>
          <div>
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Lucro Líquido</p>
            <p className={`text-3xl font-black tabular-nums num ${lucroPositivo ? 'text-emerald-300' : 'text-red-300'}`}>
              {formatCurrency(f.lucro_liquido)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono mb-1">Margem</p>
            <p className={`text-xl font-black num ${margem >= 20 ? 'text-emerald-400' : margem >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
              {margem.toFixed(1)}%
            </p>
            {lucroDelta != null && (
              <DeltaBadge val={lucroDelta} />
            )}
          </div>
        </div>

        {(f.a_receber > 0 || f.a_pagar > 0) && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="bg-emerald-500/[0.04] border border-emerald-500/10 rounded-xl p-3">
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono mb-1">A receber</p>
              <p className="text-sm font-bold text-emerald-400 num">{formatCurrency(f.a_receber)}</p>
            </div>
            <div className="bg-red-500/[0.04] border border-red-500/10 rounded-xl p-3">
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono mb-1">A pagar</p>
              <p className="text-sm font-bold text-red-400 num">{formatCurrency(f.a_pagar)}</p>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Tráfego ───────────────────────────────────────────── */}
      {t && (
        <SectionCard title="Tráfego" accent="blue" icon={
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        }>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-white/[0.02] rounded-xl p-3 border border-white/[0.04]">
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono mb-1">Gasto Total</p>
              <p className="text-sm font-bold text-red-400 num">{formatCurrency(t.gasto_total)}</p>
              {gastoTrafDelta !== null && <DeltaBadge val={gastoTrafDelta} invert />}
            </div>
            <div className="bg-white/[0.02] rounded-xl p-3 border border-white/[0.04]">
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono mb-1">Faturamento</p>
              <p className="text-sm font-bold text-emerald-400 num">{formatCurrency(t.faturamento_total)}</p>
            </div>
            <div className="bg-white/[0.02] rounded-xl p-3 border border-white/[0.04]">
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono mb-1">ROAS conf.</p>
              <p className={`text-sm font-bold num ${t.roas_confirmado >= 2 ? 'text-emerald-400' : 'text-amber-400'}`}>{t.roas_confirmado.toFixed(2)}x</p>
            </div>
            <div className="bg-white/[0.02] rounded-xl p-3 border border-white/[0.04]">
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono mb-1">Campanhas</p>
              <p className="text-sm font-bold text-zinc-300 num">{t.campanhas_ativas}</p>
            </div>
          </div>
          <StatRow label="ROAS projetado" value={`${t.roas_projetado.toFixed(2)}x`} valueClass="text-zinc-400" />
        </SectionCard>
      )}

      {/* ── Tarefas & Operação ────────────────────────────────── */}
      <SectionCard title="Tarefas & Operação" accent="orange" icon={
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 11 12 14 22 4"/>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
      }>
        <div className="grid grid-cols-3 gap-3 mb-1">
          <div className="bg-emerald-500/[0.04] border border-emerald-500/10 rounded-xl p-3 text-center">
            <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono mb-1">Concluídas</p>
            <p className="text-xl font-black text-emerald-400 num">{o.tarefas_concluidas}</p>
            {tasksDelta !== null && <DeltaBadge val={tasksDelta} />}
          </div>
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 text-center">
            <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono mb-1">Pendentes</p>
            <p className="text-xl font-black text-zinc-400 num">{o.tarefas_pendentes}</p>
          </div>
          <div className={`border rounded-xl p-3 text-center ${o.tarefas_atrasadas > 0 ? 'bg-red-500/[0.04] border-red-500/10' : 'bg-white/[0.02] border-white/[0.04]'}`}>
            <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono mb-1">Atrasadas</p>
            <p className={`text-xl font-black num ${o.tarefas_atrasadas > 0 ? 'text-red-400' : 'text-zinc-600'}`}>{o.tarefas_atrasadas}</p>
          </div>
        </div>

        {o.total_tarefas > 0 && <TaskProgressBar done={o.tarefas_concluidas} total={o.total_tarefas} />}

        {o.gargalos.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/[0.05]">
            <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest font-mono mb-3">Gargalos</p>
            <div className="flex flex-wrap gap-2">
              {o.gargalos.map(g => (
                <span key={g.setor} className="flex items-center gap-1.5 text-xs bg-red-950/20 border border-red-800/30 text-red-400 px-3 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  {SECTOR_LABEL[g.setor] ?? g.setor}: {g.quantidade} atrasad{g.quantidade !== 1 ? 'as' : 'a'}
                </span>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Produção de Conteúdo ──────────────────────────────── */}
      <SectionCard title="Produção de Conteúdo" accent="purple" icon={
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
        </svg>
      }>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-emerald-500/[0.04] border border-emerald-500/10 rounded-xl p-3 text-center">
            <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono mb-1">Entregues</p>
            <p className="text-xl font-black text-emerald-400 num">{p.materiais_entregues}</p>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 text-center">
            <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono mb-1">No ar</p>
            <p className="text-xl font-black text-zinc-300 num">{p.materiais_no_ar}</p>
          </div>
          <div className="bg-amber-500/[0.04] border border-amber-500/10 rounded-xl p-3 text-center">
            <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono mb-1">Em produção</p>
            <p className="text-xl font-black text-amber-400 num">{p.materiais_em_producao}</p>
          </div>
        </div>

        {p.criativo_destaque && p.roas_criativo_destaque !== null && (
          <div className="mt-4 p-3.5 bg-orange-500/[0.04] border border-orange-500/10 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono mb-0.5">Criativo destaque</p>
              <p className="text-sm text-zinc-300 font-medium">{p.criativo_destaque.slice(0, 12)}…</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono mb-0.5">ROAS</p>
              <p className="text-lg font-black text-emerald-400 num">{p.roas_criativo_destaque.toFixed(1)}x</p>
            </div>
          </div>
        )}

        {Object.keys(p.por_tipo).length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/[0.05]">
            <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest font-mono mb-3">Por tipo</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(p.por_tipo).map(([tipo, n]) => (
                <span key={tipo} className="text-xs bg-white/[0.03] border border-white/[0.06] text-zinc-400 px-3 py-1.5 rounded-full">
                  {TYPE_LABEL[tipo] ?? tipo}: {n}
                </span>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      <p className="text-[10px] text-zinc-700 font-mono pt-1">
        Snapshot gerado em {new Date(d.gerado_em).toLocaleString('pt-BR')}
      </p>
    </article>
  );
}
