'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { EntryForm } from './EntryForm';
import { DreCascade } from './DreCascade';
import { CashflowChart } from './CashflowChart';
import { DreCostChart } from './DreCostChart';
import { MargemGauge } from './MargemGauge';
import { MargemPorProduto } from './MargemPorProduto';
import { FinanceHealthBlock } from './FinanceHealthBlock';
import { ExtratoPro } from './ExtratoPro';
import { OpenFinancePlaceholder } from './OpenFinancePlaceholder';
import { KPICard } from '@/components/ui';
import type { DreResult, FinanceEntry } from '@/lib/finance/calc';
import {
  calcDreComparativo, calcEvolutionSeries,
  calcCashflow, calcMargemPorDashboard, calcMargem,
  filterByPeriod, filterByDashboard,
  monthStart, monthEnd,
} from '@/lib/finance/calc';
import { formatCurrency } from '@/lib/utils/format';
import { CHART } from '@/lib/ui/tokens';

// EvolutionChart lazy — Recharts não vai no bundle principal
const EvolutionChart = dynamic(
  () => import('@/components/ui/EvolutionChart').then(m => ({ default: m.EvolutionChart })),
  {
    ssr: false,
    loading: () => (
      <div className="bg-[#0c0c0f] border border-white/[0.07] rounded-2xl p-5 animate-pulse">
        <div className="h-3 w-40 bg-zinc-800 rounded mb-4" />
        <div className="h-[220px] bg-zinc-800/50 rounded" />
      </div>
    ),
  }
);

interface Category { name: string; direction: 'entrada' | 'saida' }
interface Dashboard { id: string; name: string }
interface Member    { id: string; full_name: string }

interface Props {
  entries: FinanceEntry[];
  categories: Category[];
  dashboards: Dashboard[];
  members: Member[];
}

type Period = 'mes_atual' | 'mes_anterior' | '30d';

function periodRange(p: Period): { from: string; to: string; label: string; prevFrom: string; prevTo: string } {
  const now = new Date();
  if (p === 'mes_atual') {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { from: monthStart(now), to: monthEnd(now), label: 'Mês atual', prevFrom: monthStart(prev), prevTo: monthEnd(prev) };
  }
  if (p === 'mes_anterior') {
    const prev1 = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prev2 = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return { from: monthStart(prev1), to: monthEnd(prev1), label: 'Mês anterior', prevFrom: monthStart(prev2), prevTo: monthEnd(prev2) };
  }
  const d30 = new Date(now); d30.setDate(d30.getDate() - 30);
  const d60 = new Date(now); d60.setDate(d60.getDate() - 60);
  const d31 = new Date(d30); d31.setDate(d31.getDate() - 1);
  return {
    from: d30.toISOString().split('T')[0],
    to: now.toISOString().split('T')[0],
    label: 'Últimos 30 dias',
    prevFrom: d60.toISOString().split('T')[0],
    prevTo: d31.toISOString().split('T')[0],
  };
}

function exportCSV(entries: FinanceEntry[], dashMap: Record<string, string>) {
  const header = 'Data,Categoria,Direção,Status,Valor,Produto\n';
  const rows = entries.map(e =>
    [
      e.entry_date,
      e.category,
      e.direction,
      e.status,
      e.amount.toFixed(2).replace('.', ','),
      e.dashboard_id ? (dashMap[e.dashboard_id] ?? '—') : 'Geral',
    ].join(',')
  ).join('\n');
  const blob = new Blob(['﻿' + header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'financeiro.csv'; a.click();
  URL.revokeObjectURL(url);
}

const selectCls = 'sel';

export function FinancePageClient({ entries, categories, dashboards, members }: Props) {
  const [period, setPeriod]         = useState<Period>('mes_atual');
  const [dashboardId, setDashboardId] = useState<string>('');
  const [showForm, setShowForm]     = useState(false);
  const [editEntry, setEditEntry]   = useState<FinanceEntry | null>(null);

  const { from, to, label, prevFrom, prevTo } = periodRange(period);

  const dashFiltered = filterByDashboard(entries, dashboardId || null);
  const filtered     = filterByPeriod(dashFiltered, from, to);
  const prevFiltered = filterByPeriod(dashFiltered, prevFrom, prevTo);

  const dre    = useMemo(() => calcDreComparativo(filtered, prevFiltered), [filtered, prevFiltered]);
  const cashflow = useMemo(() => calcCashflow(entries), [entries]);
  const evolution  = useMemo(() => calcEvolutionSeries(dashFiltered, 8), [dashFiltered]);
  const margins    = useMemo(() => dashboards.length > 1 ? calcMargemPorDashboard(filtered, dashboards) : [], [filtered, dashboards]);
  const margem     = useMemo(() => calcMargem(dre), [dre]);

  const totalAReceber = useMemo(() =>
    entries.filter(e => e.direction === 'entrada' && e.status === 'a_receber').reduce((s, e) => s + e.amount, 0),
    [entries]);
  const totalAPagar = useMemo(() =>
    entries.filter(e => e.direction === 'saida'  && e.status === 'a_pagar').reduce((s, e) => s + e.amount, 0),
    [entries]);

  const dashMap = Object.fromEntries(dashboards.map(d => [d.id, d.name]));

  const evolutionData = evolution.map(p => ({
    date: p.month_label,
    receita: p.receita,
    custos:  p.custos,
    lucro:   p.lucro,
  }));

  const prevDre: DreResult = dre.prev;
  const prevMargem = prevDre.receita_bruta > 0
    ? (prevDre.lucro_liquido / prevDre.receita_bruta) * 100
    : null;

  return (
    <div>
      {/* ─── Barra de ações ───────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        {/* Filtros de período */}
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1">
          {(['mes_atual', 'mes_anterior', '30d'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                period === p
                  ? 'bg-orange-500/15 text-orange-300 border border-orange-500/20'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}>
              {periodRange(p).label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {dashboards.length > 0 && (
            <select value={dashboardId} onChange={e => setDashboardId(e.target.value)} className={selectCls}>
              <option value="">Todos os produtos</option>
              {dashboards.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
          <button
            onClick={() => exportCSV(filtered, dashMap)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.07] text-zinc-400 border border-white/[0.07] hover:text-zinc-200 transition-all"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.07] text-zinc-400 border border-white/[0.07] hover:text-zinc-200 transition-all"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            PDF
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-400 text-white transition-all shadow-[0_0_20px_-4px_rgba(249,115,22,0.5)]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo Lançamento
          </button>
        </div>
      </div>

      {/* ─── KPIs do topo ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KPICard
          label="Receita bruta"
          value={formatCurrency(dre.receita_bruta)}
          accent="positive"
          badge={dre.delta_pct.receita_bruta !== null
            ? (dre.delta_pct.receita_bruta >= 0 ? `↑${dre.delta_pct.receita_bruta.toFixed(0)}%` : `↓${Math.abs(dre.delta_pct.receita_bruta).toFixed(0)}%`)
            : undefined}
          sub={`vs anterior: ${formatCurrency(dre.prev.receita_bruta)}`}
        />
        <KPICard
          label="Lucro Líquido"
          value={formatCurrency(dre.lucro_liquido)}
          accent={dre.lucro_liquido >= 0 ? 'positive' : 'negative'}
          badge={dre.delta_pct.lucro_liquido !== null
            ? (dre.delta_pct.lucro_liquido >= 0 ? `↑${dre.delta_pct.lucro_liquido.toFixed(0)}%` : `↓${Math.abs(dre.delta_pct.lucro_liquido).toFixed(0)}%`)
            : undefined}
          sub={prevMargem !== null ? `Anterior: margem ${prevMargem.toFixed(1)}%` : undefined}
        />
        <KPICard
          label="A Receber"
          value={formatCurrency(totalAReceber)}
          accent="brand"
          sub="Entradas pendentes"
        />
        <KPICard
          label="A Pagar"
          value={formatCurrency(totalAPagar)}
          accent={totalAPagar > totalAReceber ? 'negative' : 'neutral'}
          sub="Saídas comprometidas"
        />
      </div>

      {/* ─── Gráfico de evolução (faixa larga) ───────────────── */}
      <div className="mb-6 bg-[#0c0c0f] border border-white/[0.07] rounded-2xl p-5 overflow-hidden relative shimmer-sweep">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
        <p className="kpi-label mb-4">EVOLUÇÃO MENSAL — RECEITA × CUSTO × LUCRO</p>
        <EvolutionChart
          data={evolutionData}
          xKey="date"
          height={220}
          bars={[
            { dataKey: 'receita', label: 'Receita', color: CHART.bar2, fillOpacity: 0.45 },
            { dataKey: 'custos',  label: 'Custos',  color: '#ef4444',  fillOpacity: 0.4 },
          ]}
          lines={[
            { dataKey: 'lucro', label: 'Lucro', color: CHART.line1, strokeWidth: 2 },
          ]}
          tooltipFormatter={(_k, v) => formatCurrency(v)}
          footnote="Barras: receita (verde) · custos (vermelho)  ·  Linha: lucro líquido"
        />
      </div>

      {/* ─── DRE + Gráfico de custos lado a lado ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 mb-6">
        <DreCascade dre={dre} period={label} showComparativo />
        <div className="flex flex-col gap-4">
          <DreCostChart dre={dre} />
          {/* Gauge de margem */}
          <div className="bg-[#0c0c0f] border border-white/[0.07] rounded-2xl p-5 flex flex-col items-center justify-center relative overflow-hidden shimmer-sweep">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
            <MargemGauge margem={margem} />
            <div className="mt-3 grid grid-cols-2 gap-2 w-full">
              <div className="bg-white/[0.02] rounded-lg p-2.5 text-center border border-white/[0.04]">
                <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono mb-1">Receita</p>
                <p className="text-xs font-bold text-emerald-400 num">{formatCurrency(dre.receita_bruta)}</p>
              </div>
              <div className="bg-white/[0.02] rounded-lg p-2.5 text-center border border-white/[0.04]">
                <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono mb-1">Lucro</p>
                <p className={`text-xs font-bold num ${dre.lucro_liquido >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  {formatCurrency(dre.lucro_liquido)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Fluxo de Caixa (com gráfico) + Saúde Financeira ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <CashflowChart
          cashflow={cashflow}
          totalAReceber={totalAReceber}
          totalAPagar={totalAPagar}
        />
        <FinanceHealthBlock dre={dre} evolution={evolution} />
      </div>

      {/* ─── Margem por produto (só se tem múltiplos) ─────────── */}
      {margins.length > 0 && (
        <div className="mb-6">
          <MargemPorProduto margins={margins} />
        </div>
      )}

      {/* ─── Extrato completo ─────────────────────────────────── */}
      <div className="mb-6">
        <ExtratoPro
          entries={filtered}
          dashboards={dashboards}
          onEditEntry={entry => { setEditEntry(entry); setShowForm(true); }}
        />
      </div>

      {/* ─── Open Finance placeholder ─────────────────────────── */}
      <OpenFinancePlaceholder />

      {/* ─── Modal de lançamento ──────────────────────────────── */}
      {showForm && (
        <EntryForm
          categories={categories}
          dashboards={dashboards}
          members={members}
          editEntry={editEntry}
          onClose={() => { setShowForm(false); setEditEntry(null); }}
        />
      )}
    </div>
  );
}
