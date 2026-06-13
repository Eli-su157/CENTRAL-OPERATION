import Link from 'next/link';
import { getAuthContext } from '@/lib/auth/getPermissions';
import { createClient } from '@/lib/supabase/server';

type MaterialStatus = 'em_producao' | 'pronto' | 'no_ar' | 'aposentado';
type MaterialType = 'criativo_imagem' | 'criativo_video' | 'vsl' | 'pagina' | 'copy';

interface Props { dashboardId: string }

const STATUS_COLORS: Record<MaterialStatus, string> = {
  em_producao: 'text-amber-400',
  pronto:      'text-blue-400',
  no_ar:       'text-emerald-400',
  aposentado:  'text-zinc-500',
};

const STATUS_LABEL: Record<MaterialStatus, string> = {
  em_producao: 'Em produção',
  pronto:      'Pronto',
  no_ar:       'No ar',
  aposentado:  'Aposentado',
};

const TYPE_ICON: Record<MaterialType, string> = {
  criativo_imagem: '🖼️',
  criativo_video:  '🎬',
  vsl:             '📹',
  pagina:          '🌐',
  copy:            '✏️',
};

export async function EditorBlock({ dashboardId }: Props) {
  const ctx = await getAuthContext();
  if (!ctx) return null;

  const supabase = await createClient();

  // RLS garante que só quem pode_ver_setor('edicao') recebe dados
  const { data: materials } = await supabase
    .from('materials')
    .select('id, title, type, status')
    .eq('dashboard_id', dashboardId)
    .eq('operation_id', ctx.profile.operation_id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (!materials || materials.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Edição</p>
          <Link href={`/app/d/${dashboardId}/edicao`}
            className="text-xs link-action transition-colors">
            Painel completo →
          </Link>
        </div>
        <p className="text-sm text-zinc-600">Nenhum material cadastrado ainda.</p>
      </div>
    );
  }

  // Contagens por status
  const counts: Record<MaterialStatus, number> = {
    em_producao: 0, pronto: 0, no_ar: 0, aposentado: 0,
  };
  for (const m of materials) {
    counts[m.status as MaterialStatus] = (counts[m.status as MaterialStatus] ?? 0) + 1;
  }

  // Criativo em destaque: primeiro material "no ar" (sem ranking por ROAS até haver dado real)
  const featured = materials.find(m => m.status === 'no_ar') ?? null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Edição & Materiais</p>
        <Link href={`/app/d/${dashboardId}/edicao`}
          className="text-xs link-action transition-colors">
          Biblioteca →
        </Link>
      </div>

      {/* Contagens por status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {(Object.entries(counts) as [MaterialStatus, number][])
          .filter(([, n]) => n > 0)
          .map(([status, count]) => (
            <div key={status} className="text-center">
              <p className={`text-lg font-bold tabular-nums ${STATUS_COLORS[status]}`}>{count}</p>
              <p className="text-xs text-zinc-600">{STATUS_LABEL[status]}</p>
            </div>
          ))}
      </div>

      {/* Criativo em destaque */}
      {featured && (
        <div className="border-t border-zinc-800/60 pt-4">
          <p className="text-xs text-zinc-600 uppercase tracking-widest font-medium mb-2">Em destaque</p>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm">{TYPE_ICON[featured.type as MaterialType]}</span>
              <p className="text-sm text-white truncate">{featured.title}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full border shrink-0 text-zinc-500 border-zinc-700">
              sem dados de performance ainda
            </span>
          </div>
        </div>
      )}

      <p className="text-xs text-zinc-700 mt-3">{materials.length} material{materials.length !== 1 ? 'is' : ''} no acervo</p>
    </div>
  );
}
