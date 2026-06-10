'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { generateReportAction } from '@/app/app/relatorios/actions';
import { getCurrentPeriodRef, getRecentPeriods, formatPeriodLabel } from '@/lib/reports/periods';

interface Props {
  existingRefs: Set<string>; // 'mensal:2026-06' etc.
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

  const selectCls = 'bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer';

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">Gerar relatório</p>

      <div className="flex flex-col gap-3">
        {/* Tipo */}
        <div className="flex gap-1 bg-zinc-800/60 rounded-lg p-1 w-fit">
          {(['mensal', 'semanal'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => handleTypeChange(t)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                periodType === t ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              {t === 'mensal' ? 'Mensal' : 'Semanal'}
            </button>
          ))}
        </div>

        {/* Período */}
        <select value={periodRef} onChange={e => setPeriodRef(e.target.value)} className={selectCls}>
          {periods.map(p => (
            <option key={p} value={p}>
              {formatPeriodLabel(periodType, p)}
              {existingRefs.has(`${periodType}:${p}`) ? ' ✓' : ''}
            </option>
          ))}
        </select>

        {error && (
          <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/50 rounded px-2 py-1">{error}</p>
        )}

        <button
          onClick={handleGenerate}
          disabled={isPending}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50"
        >
          {isPending ? (
            <span className="animate-pulse">Gerando…</span>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
              Gerar rascunho
            </>
          )}
        </button>
      </div>
    </div>
  );
}
