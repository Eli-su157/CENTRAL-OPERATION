'use client';

import { useState, useTransition } from 'react';
import { ReportViewer } from './ReportViewer';
import { saveHeadCommentAction, freezeReportAction, deleteReportAction } from '@/app/app/relatorios/actions';
import type { ReportData } from '@/lib/reports/types';

interface Report {
  id: string;
  period_type: 'semanal' | 'mensal';
  period_ref: string;
  status: 'rascunho' | 'congelado';
  generated_data: ReportData;
  head_comment: string | null;
  frozen_at: string | null;
  created_at: string;
}

interface Props {
  report: Report;
  isHead: boolean;
  isDono: boolean;
  prevData?: import('@/lib/reports/types').ReportData;
}

export function ReportDraftEditor({ report, isHead, isDono, prevData }: Props) {
  const [isPending, startTransition] = useTransition();
  const [comment, setComment] = useState(report.head_comment ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const canEdit = (isHead || isDono) && report.status === 'rascunho';

  function handleSaveComment() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('reportId', report.id);
      fd.set('head_comment', comment);
      const result = await saveHeadCommentAction(null, fd);
      if (result && 'error' in result) setError(result.error);
      else setSaved(true);
    });
  }

  function handleFreeze() {
    if (!confirm('Congelar este relatório? Ele ficará imutável e visível para o Dono.')) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('reportId', report.id);
      const result = await freezeReportAction(null, fd);
      if (result && 'error' in result) setError(result.error);
    });
  }

  function handleDelete() {
    if (!confirm('Excluir este rascunho?')) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('reportId', report.id);
      await deleteReportAction(null, fd);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Caixa de análise do Head */}
      {canEdit && (
        <div className="bg-[#0c0c0f] border border-white/[0.07] rounded-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/[0.05]">
            <div className="w-6 h-6 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </div>
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
              Análise do Head <span className="text-zinc-600 font-normal normal-case tracking-normal">(editável)</span>
            </p>
          </div>
          <div className="p-5">
            <textarea
              value={comment}
              onChange={e => { setComment(e.target.value); setSaved(false); }}
              rows={5}
              placeholder="Escreva sua análise do período, destaques, pontos de atenção e direcionamentos para a equipe..."
              className="w-full bg-white/[0.02] border border-white/[0.06] text-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/30 placeholder-zinc-700 resize-none transition-colors hover:border-white/[0.10]"
            />
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={handleSaveComment}
                disabled={isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-400 text-white transition-all shadow-[0_0_16px_-4px_rgba(249,115,22,0.5)] disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    Salvando…
                  </>
                ) : 'Salvar análise'}
              </button>
              {saved && (
                <div className="flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span className="text-xs text-emerald-400 font-medium">Salvo</span>
                </div>
              )}
              {error && <span className="text-xs text-red-400">{error}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo do relatório */}
      <ReportViewer
        report={{ ...report, head_comment: canEdit ? comment : report.head_comment }}
        prevData={prevData}
      />

      {/* Barra de ações do rascunho */}
      {report.status === 'rascunho' && (isHead || isDono) && (
        <div className="flex items-center gap-3 pt-5 border-t border-white/[0.06]">
          <button
            onClick={handleFreeze}
            disabled={isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-[0_0_20px_-4px_rgba(52,211,153,0.4)] disabled:opacity-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Congelar e publicar
          </button>
          {isDono && (
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="flex items-center gap-1.5 text-sm text-zinc-600 hover:text-red-400 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
              Excluir rascunho
            </button>
          )}
        </div>
      )}
    </div>
  );
}
