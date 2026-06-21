import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/auth/getPermissions';
import { createClient } from '@/lib/supabase/server';
import { ReportViewer } from '@/components/reports/ReportViewer';
import { ReportDraftEditor } from '@/components/reports/ReportDraftEditor';
import { GenerateReportForm } from '@/components/reports/GenerateReportForm';
import { formatPeriodLabel } from '@/lib/reports/periods';
import type { ReportData } from '@/lib/reports/types';
import Link from 'next/link';
import { ExportPDFButton } from '@/components/reports/ExportPDFButton';

interface Props {
  searchParams: Promise<{ id?: string }>;
}

interface ReportRow {
  id: string;
  period_type: 'semanal' | 'mensal';
  period_ref: string;
  status: 'rascunho' | 'congelado';
  generated_data: ReportData;
  head_comment: string | null;
  frozen_at: string | null;
  created_at: string;
}

export default async function RelatoriosPage({ searchParams }: Props) {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/');

  const isHead = ctx.profile.role === 'head';
  const isDono = ctx.profile.role === 'dono';

  if (!isHead && !isDono) redirect('/app');

  const { id: selectedId } = await searchParams;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;

  const { data: reportsRaw } = await supabase
    .from('operation_reports')
    .select('id, period_type, period_ref, status, generated_data, head_comment, frozen_at, created_at')
    .eq('operation_id', ctx.profile.operation_id)
    .order('created_at', { ascending: false })
    .limit(30);

  const reports: ReportRow[] = (reportsRaw ?? []) as ReportRow[];

  // Relatório selecionado
  const selected: ReportRow | null = selectedId
    ? (reports.find(r => r.id === selectedId) ?? null)
    : (reports[0] ?? null);

  // Relatório anterior (mesmo type, imediatamente anterior ao selecionado na lista ordenada por created_at desc)
  const prevReport: ReportRow | null = selected
    ? (reports.find(r => r.period_type === selected.period_type && r.id !== selected.id) ?? null)
    : null;

  // Set de refs existentes para o form de geração
  const existingRefs = new Set(reports.map(r => `${r.period_type}:${r.period_ref}`));

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="print-hide mb-8 pb-6 border-b border-white/[0.06] relative anim-slide-down border-bottom-run overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-orange-500/30 via-orange-500/8 to-transparent" />
        <div className="absolute -top-8 -left-8 w-48 h-48 bg-orange-500/[0.04] blur-3xl rounded-full pointer-events-none" />
        <div className="flex items-center justify-between relative">
          <div className="flex items-center gap-4">
            <div className="w-1.5 h-8 bg-gradient-to-b from-orange-400 to-orange-600 rounded-full shrink-0 shadow-[0_0_12px_rgba(249,115,22,0.8)]" />
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Relatórios</h1>
              <p className="text-[11px] text-zinc-500 font-mono mt-0.5 tracking-widest uppercase">Análise · exportação · insights</p>
            </div>
          </div>
          {selected && <ExportPDFButton />}
        </div>
      </div>

      <div className="anim-fade-in delay-200 flex flex-col lg:flex-row gap-5 items-start">

        {/* ── Sidebar esquerda ──────────────────────────────────── */}
        <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4 print-hide">

          {/* Form de geração */}
          <GenerateReportForm existingRefs={existingRefs} />

          {/* Lista de relatórios */}
          <div className="bg-[#0c0c0f] border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="px-4 py-3.5 border-b border-white/[0.05] flex items-center gap-2.5">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
                Histórico
              </p>
              {reports.length > 0 && (
                <span className="ml-auto text-[10px] text-zinc-700 font-mono">{reports.length}</span>
              )}
            </div>

            {reports.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-xs text-zinc-700">Nenhum relatório gerado ainda.</p>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-80 lg:max-h-[500px]">
                {reports.map(r => (
                  <Link
                    key={r.id}
                    href={`/app/relatorios?id=${r.id}`}
                    className={`flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-all duration-150 group ${
                      selected?.id === r.id
                        ? 'bg-orange-500/[0.05] border-l-2 border-l-orange-500/40'
                        : 'border-l-2 border-l-transparent'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 transition-all ${
                      r.status === 'congelado'
                        ? 'bg-emerald-500 shadow-[0_0_6px_rgba(52,211,153,0.6)]'
                        : 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate transition-colors ${
                        selected?.id === r.id ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'
                      }`}>
                        {formatPeriodLabel(r.period_type, r.period_ref)}
                      </p>
                      <p className="text-[10px] text-zinc-600 mt-0.5 font-mono">
                        {r.status === 'congelado' ? 'congelado' : 'rascunho'} · {r.period_type}
                      </p>
                    </div>
                    {selected?.id === r.id && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Conteúdo principal ────────────────────────────────── */}
        <div className="flex-1 min-w-0 print-area">
          {selected ? (
            selected.status === 'rascunho' ? (
              <ReportDraftEditor
                report={selected}
                isHead={isHead}
                isDono={isDono}
                prevData={prevReport?.generated_data}
              />
            ) : (
              <ReportViewer report={selected} prevData={prevReport?.generated_data} />
            )
          ) : (
            <div className="bg-[#0c0c0f] border border-white/[0.07] rounded-2xl flex flex-col items-center justify-center py-24 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/15 flex items-center justify-center mb-5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <p className="text-zinc-200 font-bold mb-2 text-lg">
                {isDono || isHead ? 'Selecione ou gere um relatório' : 'Aguardando relatórios'}
              </p>
              <p className="text-zinc-600 text-sm max-w-xs leading-relaxed">
                {isDono || isHead
                  ? 'Use o painel à esquerda para gerar um novo relatório do período ou selecione um do histórico.'
                  : 'Nenhum relatório disponível. O Head ainda não gerou um.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
