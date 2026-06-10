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
}

export function ReportDraftEditor({ report, isHead, isDono }: Props) {
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
    <div>
      {/* Comentário do Head (edição ou leitura) */}
      {canEdit && (
        <div className="bg-zinc-900 border border-violet-800/40 rounded-xl p-5 mb-5">
          <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-3">
            Análise do Head <span className="text-violet-600 font-normal">(editável)</span>
          </p>
          <textarea
            value={comment}
            onChange={e => { setComment(e.target.value); setSaved(false); }}
            rows={6}
            placeholder="Escreva sua análise do período, destaques, pontos de atenção e direcionamentos para a equipe..."
            className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 placeholder-zinc-600 resize-none"
          />
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={handleSaveComment}
              disabled={isPending}
              className="px-4 py-1.5 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50"
            >
              {isPending ? 'Salvando…' : 'Salvar análise'}
            </button>
            {saved && <span className="text-xs text-emerald-400">Salvo ✓</span>}
            {error && <span className="text-xs text-red-400">{error}</span>}
          </div>
        </div>
      )}

      {/* Conteúdo do relatório */}
      <ReportViewer report={{ ...report, head_comment: canEdit ? comment : report.head_comment }} />

      {/* Ações do rascunho */}
      {report.status === 'rascunho' && (isHead || isDono) && (
        <div className="flex items-center gap-3 mt-6 pt-5 border-t border-zinc-800">
          <button
            onClick={handleFreeze}
            disabled={isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-emerald-700 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Congelar e publicar
          </button>
          {isDono && (
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="text-sm text-zinc-500 hover:text-red-400 transition-colors"
            >
              Excluir rascunho
            </button>
          )}
        </div>
      )}
    </div>
  );
}
