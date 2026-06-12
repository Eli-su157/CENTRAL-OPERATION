'use client';

import { useState, useTransition } from 'react';
import {
  getMaterialPerformance,
  VERDICT_LABEL,
  VERDICT_STYLE,
} from '@/lib/mock/materials';
import type { RealMaterialPerformance } from '@/lib/materials/performance';
import type { MaterialType, MaterialStatus, MaterialStorageKind } from '@/lib/types/database';
import { updateMaterialStatusAction, linkAdAction } from '@/app/app/d/[dashboardId]/edicao/actions';

export interface MaterialData {
  id: string;
  title: string;
  type: MaterialType;
  status: MaterialStatus;
  storage_kind: MaterialStorageKind;
  storage_path: string | null;
  external_url: string | null;
  ad_reference: string | null;
  dashboard_id: string | null;
  signedUrl?: string;
  // Campos adicionados em 0016_materials_v2
  version?: string | null;
  task_id?: string | null;
  campaign_ref?: string | null;
  creator_name?: string | null;  // joined de profiles.full_name
}

interface Props {
  material: MaterialData;
  dashboardId: string;
  // Performance real quando disponível — mock como fallback
  performance?: RealMaterialPerformance | null;
  // Anúncios disponíveis para vínculo manual (da ad_performance)
  availableAds?: { ad_id: string; ad_name: string }[];
  onEdit: (material: MaterialData) => void;
  onDelete: (material: MaterialData) => void;
}

const STATUS_COLORS: Record<MaterialStatus, string> = {
  em_producao: 'bg-amber-950 border-amber-700 text-amber-400',
  pronto:      'bg-blue-950 border-blue-700 text-blue-400',
  no_ar:       'bg-emerald-950 border-emerald-700 text-emerald-400',
  aposentado:  'bg-zinc-800 border-zinc-700 text-zinc-500',
};

const STATUS_LABEL: Record<MaterialStatus, string> = {
  em_producao: 'Em produção',
  pronto:      'Pronto',
  no_ar:       'No ar',
  aposentado:  'Aposentado',
};

const STATUS_ORDER: MaterialStatus[] = ['em_producao', 'pronto', 'no_ar', 'aposentado'];

export const TYPE_ICON: Record<MaterialType, string> = {
  criativo_imagem: '🖼️',
  criativo_video:  '🎬',
  vsl:             '📹',
  pagina:          '🌐',
  copy:            '✏️',
};

export const TYPE_LABEL: Record<MaterialType, string> = {
  criativo_imagem: 'Criativo Imagem',
  criativo_video:  'Criativo Vídeo',
  vsl:             'VSL',
  pagina:          'Página',
  copy:            'Copy',
};

export function MaterialCard({ material, dashboardId, performance, availableAds = [], onEdit, onDelete }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [selectedAdId, setSelectedAdId] = useState('');

  // Real performance quando disponível; mock como fallback com badge "demo"
  const mockPerf = getMaterialPerformance(material.id);
  const perf = performance ?? { ...mockPerf, source: 'mock' as const, ad_id: null, ad_name: null, fetched_at: null, cliques: 0 };
  const isReal = perf.source === 'real';

  function cycleStatus() {
    const currentIdx = STATUS_ORDER.indexOf(material.status);
    const nextStatus = STATUS_ORDER[(currentIdx + 1) % STATUS_ORDER.length];
    startTransition(async () => {
      const fd = new FormData();
      fd.set('materialId', material.id);
      fd.set('status', nextStatus);
      fd.set('dashboardId', dashboardId);
      await updateMaterialStatusAction(null, fd);
    });
  }

  function handleLinkAd() {
    if (!selectedAdId) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('materialId', material.id);
      fd.set('dashboardId', dashboardId);
      fd.set('ad_id', selectedAdId);
      await linkAdAction(null, fd);
      setShowLinkPicker(false);
    });
  }

  function handleUnlink() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('materialId', material.id);
      fd.set('dashboardId', dashboardId);
      fd.set('ad_id', '');
      await linkAdAction(null, fd);
    });
  }

  const hasPreview = material.storage_kind === 'upload' && material.signedUrl &&
    (material.type === 'criativo_imagem');

  const canLink = material.status === 'no_ar' && availableAds.length > 0;

  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col transition-opacity ${isPending ? 'opacity-50' : ''}`}>
      {/* Preview area */}
      <div className="h-36 bg-zinc-800/60 flex items-center justify-center relative shrink-0">
        {hasPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={material.signedUrl}
            alt={material.title}
            className="w-full h-full object-cover"
          />
        ) : material.storage_kind === 'link' && material.external_url ? (
          <div className="flex flex-col items-center gap-1 text-zinc-600">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            <span className="text-xs">Link externo</span>
          </div>
        ) : (
          <span className="text-4xl opacity-40">{TYPE_ICON[material.type]}</span>
        )}

        {/* Type badge */}
        <span className="absolute top-2 left-2 text-xs bg-zinc-900/80 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-700/60">
          {TYPE_ICON[material.type]} {TYPE_LABEL[material.type]}
        </span>
        {/* Version badge */}
        {material.version && (
          <span className="absolute top-2 right-2 text-[10px] bg-zinc-900/80 text-zinc-500 px-1.5 py-px rounded font-mono border border-zinc-700/40">
            {material.version}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-sm font-medium text-white leading-snug line-clamp-2">{material.title}</p>
        {/* Criador + campanha */}
        <div className="flex items-center gap-2 flex-wrap">
          {material.creator_name && (
            <span className="text-[10px] text-zinc-700">por {material.creator_name}</span>
          )}
          {material.campaign_ref && (
            <span className="text-[10px] text-zinc-700 font-mono truncate">↗ {material.campaign_ref.slice(0, 20)}</span>
          )}
        </div>

        {/* Ad reference / link */}
        {material.ad_reference ? (
          <div className="flex items-center gap-1">
            <p className="text-xs text-zinc-600 font-mono truncate flex-1" title={material.ad_reference}>
              {isReal && perf.ad_name ? perf.ad_name : `ref: ${material.ad_reference}`}
            </p>
            {canLink && (
              <button
                onClick={handleUnlink}
                disabled={isPending}
                className="text-xs text-zinc-700 hover:text-red-400 transition-colors shrink-0"
                title="Remover vínculo"
              >
                ×
              </button>
            )}
          </div>
        ) : canLink && !showLinkPicker ? (
          <button
            onClick={() => setShowLinkPicker(true)}
            className="text-xs text-orange-500 hover:text-orange-400 transition-colors text-left"
          >
            + Vincular anúncio
          </button>
        ) : showLinkPicker ? (
          <div className="flex gap-1">
            <select
              value={selectedAdId}
              onChange={e => setSelectedAdId(e.target.value)}
              className="flex-1 text-xs bg-[#0D0D0D] border border-white/[0.08] text-zinc-300 rounded-lg px-1.5 py-1 focus:outline-none focus:border-orange-500/30 min-w-0"
            >
              <option value="">— selecionar anúncio</option>
              {availableAds.map(ad => (
                <option key={ad.ad_id} value={ad.ad_id}>
                  {ad.ad_name.length > 30 ? ad.ad_name.slice(0, 30) + '…' : ad.ad_name}
                </option>
              ))}
            </select>
            <button
              onClick={handleLinkAd}
              disabled={!selectedAdId || isPending}
              className="text-xs px-2 py-1 bg-orange-500 hover:bg-orange-400 text-white rounded-lg disabled:opacity-40"
            >
              OK
            </button>
            <button
              onClick={() => setShowLinkPicker(false)}
              className="text-xs text-zinc-600 hover:text-zinc-300"
            >
              ×
            </button>
          </div>
        ) : null}

        {/* Performance */}
        {material.status === 'no_ar' && (
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${VERDICT_STYLE[perf.verdict]}`}>
              {VERDICT_LABEL[perf.verdict]}
            </span>
            <div className="flex items-center gap-1.5">
              {perf.roas > 0 && (
                <span className="text-xs text-zinc-500 tabular-nums">{perf.roas.toFixed(1)}x</span>
              )}
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                isReal ? 'bg-emerald-950 text-emerald-600' : 'bg-zinc-800 text-zinc-700'
              }`}>
                {isReal ? 'real' : 'demo'}
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-1">
          <button
            onClick={cycleStatus}
            disabled={isPending}
            className={`text-xs px-2 py-0.5 rounded-full border transition-opacity hover:opacity-80 cursor-pointer ${STATUS_COLORS[material.status]}`}
            title="Clique para avançar o status"
          >
            {STATUS_LABEL[material.status]}
          </button>

          <div className="flex items-center gap-1">
            {material.storage_kind === 'link' && material.external_url && (
              <a
                href={material.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors"
                title="Abrir link externo"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            )}
            {material.storage_kind === 'upload' && material.signedUrl && (
              <a
                href={material.signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors"
                title="Abrir arquivo"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </a>
            )}
            <button
              onClick={() => onEdit(material)}
              className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors"
              title="Editar"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(material)}
              className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors"
              title="Excluir"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
