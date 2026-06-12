import { formatCurrency } from '@/lib/utils/format';
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
}

const SECTOR_LABEL: Record<string, string> = {
  trafego: 'Tráfego', edicao: 'Edição', dev: 'Dev', financeiro: 'Financeiro',
};

const TYPE_LABEL: Record<string, string> = {
  criativo_imagem: 'Criativo Imagem', criativo_video: 'Criativo Vídeo',
  vsl: 'VSL', pagina: 'Página', copy: 'Copy',
};

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">
        {icon} {title}
      </p>
      {children}
    </div>
  );
}

function KpiRow({ label, value, valueClass = 'text-white', indent = false }: {
  label: string; value: string; valueClass?: string; indent?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-1.5 border-b border-zinc-800/50 last:border-0 ${indent ? 'pl-4' : ''}`}>
      <span className={`text-sm ${indent ? 'text-zinc-500' : 'text-zinc-300'}`}>{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}

export function ReportViewer({ report }: Props) {
  const d = report.generated_data;
  const { financeiro: f, trafego: t, producao: p, operacao: o } = d;

  const roasColor = f.lucro_liquido > 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <article className="max-w-3xl">
      {/* Header */}
      <div className="mb-6 pb-5 border-b border-zinc-800">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-white">
            {formatPeriodLabel(report.period_type, report.period_ref)}
          </h1>
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
            report.status === 'congelado'
              ? 'bg-emerald-950 border-emerald-800 text-emerald-400'
              : 'bg-amber-950 border-amber-800 text-amber-400'
          }`}>
            {report.status === 'congelado' ? '🔒 Congelado' : '✏️ Rascunho'}
          </span>
        </div>
        <p className="text-sm text-zinc-500">
          {d.period_start} → {d.period_end}
          {report.frozen_at && ` · congelado em ${new Date(report.frozen_at).toLocaleDateString('pt-BR')}`}
        </p>
      </div>

      {/* Análise do Head */}
      {report.head_comment && (
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-5 mb-5">
          <p className="text-xs font-semibold text-orange-400 uppercase tracking-widest mb-2">Análise do Head</p>
          <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{report.head_comment}</p>
        </div>
      )}

      {/* Financeiro */}
      <Section title="Resultado Financeiro" icon="💰">
        <div className="grid grid-cols-2 gap-x-8 gap-y-0">
          <div>
            <KpiRow label="Receita Bruta"     value={formatCurrency(f.receita_bruta)} valueClass="text-emerald-400" />
            <KpiRow label="↳ Taxas"           value={`-${formatCurrency(f.taxas_plataforma)}`} valueClass="text-red-400" indent />
            <KpiRow label="↳ Reembolsos"      value={`-${formatCurrency(f.reembolsos)}`} valueClass="text-red-400" indent />
          </div>
          <div>
            <KpiRow label="Gasto Tráfego"     value={`-${formatCurrency(f.gasto_trafego)}`} valueClass="text-red-400" />
            <KpiRow label="Comissões"          value={`-${formatCurrency(f.comissoes)}`} valueClass="text-red-400" />
            <KpiRow label="Custos Fixos"       value={`-${formatCurrency(f.custos_fixos + f.outros_custos)}`} valueClass="text-red-400" />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-zinc-700 flex items-center justify-between">
          <span className="text-base font-bold text-white">Lucro Líquido</span>
          <span className={`text-2xl font-bold tabular-nums ${roasColor}`}>
            {formatCurrency(f.lucro_liquido)}
          </span>
        </div>
        {(f.a_receber > 0 || f.a_pagar > 0) && (
          <div className="mt-3 grid grid-cols-2 gap-4 text-xs text-zinc-500 pt-3 border-t border-zinc-800">
            <div>A receber: <span className="text-emerald-500">{formatCurrency(f.a_receber)}</span></div>
            <div>A pagar: <span className="text-red-500">{formatCurrency(f.a_pagar)}</span></div>
          </div>
        )}
      </Section>

      {/* Tráfego */}
      <Section title="Tráfego" icon="📡">
        <KpiRow label="Gasto total"         value={formatCurrency(t.gasto_total)} />
        <KpiRow label="Faturamento gerado"  value={formatCurrency(t.faturamento_total)} valueClass="text-emerald-400" />
        <KpiRow label="ROAS confirmado"     value={`${t.roas_confirmado.toFixed(2)}x`} valueClass={t.roas_confirmado >= 2 ? 'text-emerald-400' : 'text-amber-400'} />
        <KpiRow label="ROAS projetado"      value={`${t.roas_projetado.toFixed(2)}x`} valueClass="text-zinc-400" />
        <KpiRow label="Campanhas ativas"    value={String(t.campanhas_ativas)} />
        {t.note && <p className="text-xs text-zinc-700 mt-2 italic">{t.note}</p>}
      </Section>

      {/* Produção */}
      <Section title="Produção de Conteúdo" icon="🎬">
        <KpiRow label="Entregues no período" value={String(p.materiais_entregues)} valueClass="text-emerald-400" />
        <KpiRow label="No ar"               value={String(p.materiais_no_ar)} />
        <KpiRow label="Em produção"          value={String(p.materiais_em_producao)} valueClass="text-amber-400" />
        {p.criativo_destaque && p.roas_criativo_destaque !== null && (
          <div className="mt-3 pt-3 border-t border-zinc-800">
            <p className="text-xs text-zinc-500 mb-1">Criativo destaque</p>
            <p className="text-sm text-white font-medium">{p.criativo_destaque.slice(0, 8)}… · ROAS {p.roas_criativo_destaque.toFixed(1)}x</p>
          </div>
        )}
        {Object.keys(p.por_tipo).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-zinc-800">
            {Object.entries(p.por_tipo).map(([tipo, n]) => (
              <span key={tipo} className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-400 px-2 py-0.5 rounded-full">
                {TYPE_LABEL[tipo] ?? tipo}: {n}
              </span>
            ))}
          </div>
        )}
      </Section>

      {/* Operação */}
      <Section title="Operação" icon="⚙️">
        <KpiRow label="Tarefas concluídas"  value={String(o.tarefas_concluidas)} valueClass="text-emerald-400" />
        <KpiRow label="Tarefas pendentes"   value={String(o.tarefas_pendentes)} />
        <KpiRow label="Atrasadas"           value={String(o.tarefas_atrasadas)} valueClass={o.tarefas_atrasadas > 0 ? 'text-red-400' : 'text-zinc-400'} />
        {o.gargalos.length > 0 && (
          <div className="mt-3 pt-3 border-t border-zinc-800">
            <p className="text-xs text-zinc-500 mb-2">Gargalos</p>
            <div className="flex flex-wrap gap-2">
              {o.gargalos.map(g => (
                <span key={g.setor} className="text-xs bg-red-950/40 border border-red-800/50 text-red-400 px-2 py-0.5 rounded-full">
                  {SECTOR_LABEL[g.setor] ?? g.setor}: {g.quantidade} atrasad{g.quantidade !== 1 ? 'as' : 'a'}
                </span>
              ))}
            </div>
          </div>
        )}
      </Section>

      <p className="text-xs text-zinc-700 mt-4">
        Gerado em {new Date(d.gerado_em).toLocaleString('pt-BR')}
      </p>
    </article>
  );
}
