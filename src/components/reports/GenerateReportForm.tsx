'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { generateReportAction } from '@/app/app/relatorios/actions';
import { getCurrentPeriodRef, getRecentPeriods, formatPeriodLabel } from '@/lib/reports/periods';

interface Props {
  existingRefs: Set<string>;
}

export function GenerateReportForm({ existingRefs }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [periodType, setPeriodType] = useState<'semanal' | 'mensal'>('mensal');
  const [periodRef, setPeriodRef] = useState(getCurrentPeriodRef('mensal'));
  const router = useRouter();

  const periods = getRecentPeriods(periodType, 8);

  function handleTypeChange(type: 'semanal' | 'mensal') {
    setPeriodType(type);
    setPeriodRef(getCurrentPeriodRef(type));
  }

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('period_type', periodType);
      fd.set('period_ref', periodRef);
      const result = await generateReportAction(null, fd);
      if (result && 'error' in result) {
        setError(result.error);
      } else if (result && 'id' in result && result.id) {
        router.push(`/app/relatorios?id=${result.id}`);
      }
    });
  }

  return (
    <div className="bg-[#0c0c0f] border border-white/[0.07] rounded-2xl p-5 overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />

      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
        </div>
        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Gerar Relatório</p>
      </div>

      <div className="flex flex-col gap-3">
        {/* Tipo */}
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1">
          {(['mensal', 'semanal'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => handleTypeChange(t)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                periodType === t
                  ? 'bg-orange-500/15 text-orange-300 border border-orange-500/25'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t === 'mensal' ? 'Mensal' : 'Semanal'}
            </button>
          ))}
        </div>

        {/* Período */}
        <select
          value={periodRef}
          onChange={e => setPeriodRef(e.target.value)}
          className="sel"
        >
          {periods.map(p => (
            <option key={p} value={p}>
              {formatPeriodLabel(periodType, p)}
              {existingRefs.has(`${periodType}:${p}`) ? ' ✓' : ''}
            </option>
          ))}
        </select>

        {error && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-950/30 border border-red-800/40">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" className="shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={isPending}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-orange-500 hover:bg-orange-400 text-white transition-all shadow-[0_0_20px_-4px_rgba(249,115,22,0.5)] disabled:opacity-50 disabled:shadow-none"
        >
          {isPending ? (
            <>
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              Gerando…
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
              Gerar rascunho
            </>
          )}
        </button>
      </div>
    </div>
  );
}
