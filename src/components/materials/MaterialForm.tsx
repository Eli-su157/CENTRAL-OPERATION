'use client';

import { useState, useTransition, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  createMaterialAction,
  updateMaterialAction,
} from '@/app/app/d/[dashboardId]/edicao/actions';
import type { MaterialData } from './MaterialCard';
import { TYPE_LABEL } from './MaterialCard';
import type { MaterialType, MaterialStatus } from '@/lib/types/database';

const MATERIAL_TYPES: MaterialType[] = [
  'criativo_imagem', 'criativo_video', 'vsl', 'pagina', 'copy',
];

const STATUS_OPTIONS: { value: MaterialStatus; label: string }[] = [
  { value: 'em_producao', label: 'Em produção' },
  { value: 'pronto',      label: 'Pronto' },
  { value: 'no_ar',       label: 'No ar' },
  { value: 'aposentado',  label: 'Aposentado' },
];

interface Props {
  dashboardId: string;
  operationId: string;
  editMaterial?: MaterialData;
  onClose: () => void;
}

const inputCls = 'w-full bg-[#0D0D0D] border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/40 focus:border-orange-500/30 placeholder-zinc-600';
const selectCls = `${inputCls} cursor-pointer`;

export function MaterialForm({ dashboardId, operationId, editMaterial, onClose }: Props) {
  const isEditing = !!editMaterial;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [storageKind, setStorageKind] = useState<'upload' | 'link'>(
    editMaterial?.storage_kind ?? 'upload'
  );
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    // For create with upload: upload file first, then save record
    if (!isEditing && storageKind === 'upload') {
      const file = fileRef.current?.files?.[0];
      if (!file) {
        setError('Selecione um arquivo.');
        return;
      }

      setUploading(true);
      const path = `${operationId}/${dashboardId ?? 'global'}/${Date.now()}-${file.name}`;
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from('materials')
        .upload(path, file);
      setUploading(false);

      if (uploadError) {
        setError('Erro ao enviar arquivo: ' + uploadError.message);
        return;
      }

      formData.set('storage_path', path);
      // Remove the raw file (server action não precisa do binário)
      formData.delete('file');
    }

    startTransition(async () => {
      const action = isEditing ? updateMaterialAction : createMaterialAction;
      const result = await action(null, formData);
      if (result && 'error' in result) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  }

  const loading = isPending || uploading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-base font-semibold text-white">
            {isEditing ? 'Editar material' : 'Adicionar material'}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Hidden fields */}
          <input type="hidden" name="dashboard_id" value={dashboardId} />
          {isEditing && <input type="hidden" name="materialId" value={editMaterial.id} />}
          <input type="hidden" name="storage_kind" value={storageKind} />

          <div className="px-5 py-4 flex flex-col gap-4">
            {/* Título */}
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block font-medium">Título *</label>
              <input
                name="title"
                required
                maxLength={200}
                defaultValue={editMaterial?.title}
                placeholder="Ex: Criativo VSL 60s Oferta Principal"
                className={inputCls}
              />
            </div>

            {!isEditing && (
              <>
                {/* Tipo */}
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block font-medium">Tipo *</label>
                  <select name="type" required className={selectCls} defaultValue="criativo_imagem">
                    {MATERIAL_TYPES.map(t => (
                      <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                    ))}
                  </select>
                </div>

                {/* Storage kind toggle */}
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block font-medium">Origem</label>
                  <div className="flex gap-1 bg-zinc-800/60 rounded-lg p-1 w-fit">
                    {(['upload', 'link'] as const).map(kind => (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => setStorageKind(kind)}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          storageKind === kind
                            ? 'bg-zinc-700 text-white'
                            : 'text-zinc-400 hover:text-zinc-300'
                        }`}
                      >
                        {kind === 'upload' ? 'Upload' : 'Link externo'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload ou link */}
                {storageKind === 'upload' ? (
                  <div>
                    <label className="text-xs text-zinc-400 mb-1.5 block font-medium">Arquivo *</label>
                    <input
                      ref={fileRef}
                      type="file"
                      name="file"
                      accept="image/*,video/*,.pdf,.zip,.mp4,.mov"
                      className="w-full text-sm text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-orange-500 file:text-white hover:file:bg-orange-400 file:cursor-pointer cursor-pointer"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-xs text-zinc-400 mb-1.5 block font-medium">URL do arquivo *</label>
                    <input
                      name="external_url"
                      type="url"
                      required
                      placeholder="https://drive.google.com/..."
                      className={inputCls}
                    />
                    <p className="text-xs text-zinc-600 mt-1">Drive, Figma, Frame.io, Notion, etc.</p>
                  </div>
                )}
              </>
            )}

            {/* Status */}
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block font-medium">Status</label>
              <select name="status" className={selectCls} defaultValue={editMaterial?.status ?? 'em_producao'}>
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Referência do anúncio */}
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block font-medium">Referência do anúncio</label>
              <input
                name="ad_reference"
                defaultValue={editMaterial?.ad_reference ?? ''}
                placeholder="ID ou nome do anúncio na plataforma (opcional)"
                className={inputCls}
              />
              <p className="text-xs text-zinc-600 mt-1">Usado para casar com o criativo no Meta Ads (Fase de integração)</p>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/60 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-400 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? uploading ? 'Enviando arquivo…' : 'Salvando…'
                : isEditing ? 'Salvar alterações' : 'Adicionar material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
