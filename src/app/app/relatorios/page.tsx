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
      <div className="mb-8 pb-6 border-b border-white/[0.05] relative">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-orange-500/20 via-orange-500/5 to-transparent" />
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-orange-500 rounded-full shrink-0" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Relatórios</h1>
          </div>
          {selected && <ExportPDFButton />}
        </div>
        <p className="text-sm text-zinc-500 pl-4">
          {isDono ? 'Visualize relatórios gerados pelo Head' : 'Gere, edite e congele relatórios do período'}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Coluna esquerda: gerar + lista */}
        <div className="w-full lg:w-64 shrink-0 flex flex-col gap-4">
          {/* Form de geração (só head/dono) */}
          <GenerateReportForm existingRefs={existingRefs} />

          {/* Lista de relatórios */}
          <div className="bg-[#161616] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.1em]">Histórico</p>
            </div>
            {reports.length === 0 ? (
              <p className="text-xs text-zinc-600 p-4">Nenhum relatório ainda.</p>
            ) : (
              <div className="overflow-y-auto max-h-72 lg:max-h-96">
                {reports.map(r => (
                  <Link
                    key={r.id}
                    href={`/app/relatorios?id=${r.id}`}
                    className={`flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors ${
                      selected?.id === r.id ? 'bg-white/[0.05]' : ''
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      r.status === 'congelado' ? 'bg-emerald-500' : 'bg-amber-400'
                    }`} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-zinc-300 truncate">
                        {formatPeriodLabel(r.period_type, r.period_ref)}
                      </p>
                      <p className="text-xs text-zinc-600">
                        {r.status === 'congelado' ? '🔒 congelado' : '✏️ rascunho'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Coluna principal: conteúdo */}
        <div className="flex-1 min-w-0">
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
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/15 flex items-center justify-center mb-5">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-orange-400">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <p className="text-zinc-300 font-semibold mb-2">
                {isDono || isHead ? 'Selecione ou gere um relatório' : 'Aguardando relatórios'}
              </p>
              <p className="text-zinc-600 text-sm max-w-xs">
                {isDono || isHead
                  ? 'Use o painel à esquerda para gerar um novo relatório do período.'
                  : 'Nenhum relatório disponível. O Head ainda não gerou um.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
