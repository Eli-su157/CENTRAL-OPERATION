'use client';

import { useState, useMemo, useTransition } from 'react';
import { MaterialCard, TYPE_LABEL } from './MaterialCard';
import { MaterialForm } from './MaterialForm';
import { deleteMaterialAction } from '@/app/app/d/[dashboardId]/edicao/actions';
import type { MaterialData } from './MaterialCard';
import type { RealMaterialPerformance } from '@/lib/materials/performance';
import type { MaterialType, MaterialStatus } from '@/lib/types/database';

const TYPES: MaterialType[] = ['criativo_imagem', 'criativo_video', 'vsl', 'pagina', 'copy'];
const STATUSES: { value: MaterialStatus; label: string }[] = [
  { value: 'em_producao', label: 'Em produção' },
  { value: 'pronto',      label: 'Pronto' },
  { value: 'no_ar',       label: 'No ar' },
  { value: 'aposentado',  label: 'Aposentado' },
];

interface Props {
  materials: MaterialData[];
  dashboardId: string;
  operationId: string;
  canManage: boolean;
  performances?: Map<string, RealMaterialPerformance>;
  availableAds?: { ad_id: string; ad_name: string }[];
}

export function MaterialsLibraryClient({ materials, dashboardId, operationId, canManage, performances, availableAds = [] }: Props) {
  const [filterType, setFilterType]     = useState<MaterialType | ''>('');
  const [filterStatus, setFilterStatus] = useState<MaterialStatus | ''>('');
  const [showForm, setShowForm]         = useState(false);
  const [editMaterial, setEditMaterial] = useState<MaterialData | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<MaterialData | null>(null);
  const [isPending, startTransition]    = useTransition();

  const filtered = useMemo(() => {
    return materials.filter(m => {
      if (filterType   && m.type   !== filterType)   return false;
      if (filterStatus && m.status !== filterStatus) return false;
      return true;
    });
  }, [materials, filterType, filterStatus]);

  function openCreate() {
    setEditMaterial(undefined);
    setShowForm(true);
  }

  function openEdit(material: MaterialData) {
    setEditMaterial(material);
    setShowForm(true);
  }

  function handleDelete(material: MaterialData) {
    setDeleteTarget(material);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const fd = new FormData();
    fd.set('materialId', deleteTarget.id);
    fd.set('dashboardId', dashboardId);
    if (deleteTarget.storage_kind === 'upload' && deleteTarget.storage_path) {
      fd.set('storage_path', deleteTarget.storage_path);
    }
    startTransition(async () => {
      await deleteMaterialAction(null, fd);
      setDeleteTarget(null);
    });
  }

  const selectCls = 'sel-sm';

  const statsTotal = materials.length;
  const statsNoAr  = materials.filter(m => m.status === 'no_ar').length;
  const statsProducao = materials.filter(m => m.status === 'em_producao').length;

  return (
    <div>
      {/* Stats rápidas */}
      <div className="flex items-center gap-6 mb-5">
        <div>
          <p className="text-xl font-bold text-white tabular-nums">{statsTotal}</p>
          <p className="text-xs text-zinc-500">Total</p>
        </div>
        <div>
          <p className="text-xl font-bold text-emerald-400 tabular-nums">{statsNoAr}</p>
          <p className="text-xs text-zinc-500">No ar</p>
        </div>
        <div>
          <p className="text-xl font-bold text-amber-400 tabular-nums">{statsProducao}</p>
          <p className="text-xs text-zinc-500">Em produção</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <select value={filterType} onChange={e => setFilterType(e.target.value as MaterialType | '')} className={selectCls}>
          <option value="">Todos os tipos</option>
          {TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as MaterialStatus | '')} className={selectCls}>
          <option value="">Todos os status</option>
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {(filterType || filterStatus) && (
          <button
            onClick={() => { setFilterType(''); setFilterStatus(''); }}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Limpar filtros
          </button>
        )}
        <div className="flex-1" />
        {canManage && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-400 text-white transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Adicionar material
          </button>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-zinc-600 text-sm">
            {materials.length === 0
              ? 'Nenhum material cadastrado ainda. Adicione o primeiro!'
              : 'Nenhum material corresponde aos filtros.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(m => (
            <MaterialCard
              key={m.id}
              material={m}
              dashboardId={dashboardId}
              performance={performances?.get(m.id) ?? null}
              availableAds={availableAds}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      {showForm && (
        <MaterialForm
          dashboardId={dashboardId}
          operationId={operationId}
          editMaterial={editMaterial}
          onClose={() => { setShowForm(false); setEditMaterial(undefined); }}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="text-base font-semibold text-white mb-2">Excluir material?</h3>
            <p className="text-sm text-zinc-400 mb-5">
              <span className="font-medium text-white">{deleteTarget.title}</span> será removido permanentemente.
              {deleteTarget.storage_kind === 'upload' && ' O arquivo também será excluído do storage.'}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={isPending}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-700 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
              >
                {isPending ? 'Excluindo…' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
