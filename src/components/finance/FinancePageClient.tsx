'use client';

import { useState } from 'react';
import { DreBlock } from './DreBlock';
import { ExtratoBlock } from './ExtratoBlock';
import { AReceberBlock, APagarBlock } from './BalanceBlocks';
import { EntryForm } from './EntryForm';
import type { DreResult, FinanceEntry } from '@/lib/finance/calc';
import { calcDre, filterByPeriod, filterByDashboard, monthStart, monthEnd } from '@/lib/finance/calc';
import { formatCurrency } from '@/lib/utils/format';

interface Category { name: string; direction: 'entrada' | 'saida' }
interface Dashboard { id: string; name: string }
interface Member { id: string; full_name: string }

interface Props {
  entries: FinanceEntry[];
  categories: Category[];
  dashboards: Dashboard[];
  members: Member[];
}

type Period = 'mes_atual' | 'mes_anterior' | '30d';

function periodRange(p: Period): { from: string; to: string; label: string } {
  const now = new Date();
  if (p === 'mes_atual') {
    return { from: monthStart(now), to: monthEnd(now), label: 'Mês atual' };
  }
  if (p === 'mes_anterior') {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { from: monthStart(prev), to: monthEnd(prev), label: 'Mês anterior' };
  }
  // 30d
  const d30 = new Date(now);
  d30.setDate(d30.getDate() - 30);
  return {
    from: d30.toISOString().split('T')[0],
    to: now.toISOString().split('T')[0],
    label: 'Últimos 30 dias',
  };
}

export function FinancePageClient({ entries, categories, dashboards, members }: Props) {
  const [period, setPeriod] = useState<Period>('mes_atual');
  const [dashboardId, setDashboardId] = useState<string>('');
  const [showForm, setShowForm] = useState(false);

  const { from, to, label } = periodRange(period);

  const filtered = filterByPeriod(
    filterByDashboard(entries, dashboardId || null),
    from,
    to
  );

  const dre = calcDre(filtered);
  const allCategories = [...new Set(entries.map(e => e.category))];

  const selectCls = 'bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500';

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Financeiro</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Acesso restrito · fonte de dados real</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Novo Lançamento
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="flex gap-1 bg-zinc-800/60 rounded-lg p-1">
          {(['mes_atual', 'mes_anterior', '30d'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                period === p ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              {periodRange(p).label}
            </button>
          ))}
        </div>

        {dashboards.length > 0 && (
          <select value={dashboardId} onChange={e => setDashboardId(e.target.value)} className={selectCls}>
            <option value="">Todos os produtos</option>
            {dashboards.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
      </div>

      {/* Lucro líquido hero */}
      <div className={`rounded-2xl border p-6 mb-6 ${
        dre.lucro_liquido >= 0
          ? 'bg-emerald-950/30 border-emerald-800/50'
          : 'bg-red-950/30 border-red-800/50'
      }`}>
        <p className="text-xs text-zinc-400 uppercase tracking-widest font-medium mb-1">{label} · Lucro líquido</p>
        <p className={`text-4xl font-bold tabular-nums ${dre.lucro_liquido >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {formatCurrency(dre.lucro_liquido)}
        </p>
        <div className="flex gap-6 mt-3">
          <span className="text-sm text-zinc-400">
            Receita <span className="text-emerald-400 font-medium">{formatCurrency(dre.receita_bruta)}</span>
          </span>
          <span className="text-sm text-zinc-400">
            Custos <span className="text-red-400 font-medium">
              {formatCurrency(dre.taxas_plataforma + dre.reembolsos + dre.gasto_trafego + dre.comissoes + dre.custos_fixos + dre.pagamentos_equipe + dre.outros)}
            </span>
          </span>
        </div>
      </div>

      {/* Blocos em grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <DreBlock dre={dre} period={label} />
        <ExtratoBlock entries={filtered} categories={allCategories} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AReceberBlock entries={filtered} />
        <APagarBlock entries={filtered} />
      </div>

      {showForm && (
        <EntryForm
          categories={categories}
          dashboards={dashboards}
          members={members}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
