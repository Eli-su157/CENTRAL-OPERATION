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
    <div className="bg-[#0c0c0f] border border-white/[0.07] rounded-2xl overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.05]">
        <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
        </div>
        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Novo Relatório</p>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* Toggle tipo */}
        <div className="grid grid-cols-2 gap-1 bg-white/[0.03] border border-white/[0.05] rounded-xl p-1">
          {(['mensal', 'semanal'] as const).map(t => (
            <button
              key={t}
              onClick={() => handleTypeChange(t)}
              className={`py-2 rounded-lg text-xs font-bold transition-all ${
                periodType === t
                  ? 'bg-orange-500 text-white shadow-[0_0_12px_-2px_rgba(249,115,22,0.6)]'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t === 'mensal' ? 'Mensal' : 'Semanal'}
            </button>
          ))}
        </div>

        {/* Select de período */}
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
          <p className="text-xs text-red-400 bg-red-500/[0.06] border border-red-500/15 rounded-xl px-3 py-2">{error}</p>
        )}

        <button
          onClick={handleGenerate}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-orange-500 hover:bg-orange-400 text-white transition-all shadow-[0_0_20px_-4px_rgba(249,115,22,0.5)] hover:shadow-[0_0_28px_-4px_rgba(249,115,22,0.7)] disabled:opacity-50 disabled:shadow-none"
        >
          {isPending ? (
            <>
              <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              Gerando…
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
