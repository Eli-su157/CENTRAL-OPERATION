'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/auth/getPermissions';

export type TrafficActionState = { error: string } | { success: true } | null;

// Valida acesso ao painel de tráfego (trafego + liderança)
async function assertTrafficAccess() {
  const ctx = await getAuthContext();
  if (!ctx) return null;
  const ok = ctx.profile.sector === 'trafego' ||
    ctx.profile.role === 'dono' ||
    ctx.profile.role === 'head';
  return ok ? ctx : null;
}

// ---- SALVAR / UPSERT METAS ----

export async function saveGoalsAction(
  prevState: TrafficActionState,
  formData: FormData
): Promise<TrafficActionState> {
  const ctx = await assertTrafficAccess();
  if (!ctx) return { error: 'Sem permissão.' };

  const dashboardId = formData.get('dashboardId') as string;
  const period = formData.get('period') as string; // YYYY-MM
  const metaGasto = formData.get('meta_gasto') ? parseFloat(formData.get('meta_gasto') as string) : null;
  const metaFat = formData.get('meta_faturamento') ? parseFloat(formData.get('meta_faturamento') as string) : null;
  const roasAlvo = formData.get('roas_alvo') ? parseFloat(formData.get('roas_alvo') as string) : null;

  if (!dashboardId || !period) return { error: 'Dados inválidos.' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const { error } = await supabase
    .from('traffic_goals')
    .upsert(
      {
        operation_id: ctx.profile.operation_id,
        dashboard_id: dashboardId,
        period,
        meta_gasto: metaGasto,
        meta_faturamento: metaFat,
        roas_alvo: roasAlvo,
      },
      { onConflict: 'operation_id,dashboard_id,period' }
    );

  if (error) return { error: 'Erro ao salvar metas.' };

  revalidatePath(`/app/d/${dashboardId}/trafego`);
  return { success: true };
}

// ---- SALVAR CONFIGURAÇÃO DE BLOCOS ----

export async function savePanelConfigAction(
  prevState: TrafficActionState,
  formData: FormData
): Promise<TrafficActionState> {
  const ctx = await assertTrafficAccess();
  if (!ctx) return { error: 'Sem permissão.' };

  const dashboardId = formData.get('dashboardId') as string;
  const enabledBlocksRaw = formData.get('enabled_blocks') as string;
  const blockOrderRaw = formData.get('block_order') as string;

  if (!dashboardId) return { error: 'Dados inválidos.' };

  let enabledBlocks: Record<string, boolean>;
  let blockOrder: string[];

  try {
    enabledBlocks = JSON.parse(enabledBlocksRaw);
    blockOrder = JSON.parse(blockOrderRaw);
  } catch {
    return { error: 'Configuração inválida.' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any;
  const { error } = await supabase
    .from('traffic_panel_config')
    .upsert(
      {
        operation_id: ctx.profile.operation_id,
        dashboard_id: dashboardId,
        enabled_blocks: enabledBlocks,
        block_order: blockOrder,
      },
      { onConflict: 'operation_id,dashboard_id' }
    );

  if (error) return { error: 'Erro ao salvar configuração.' };

  revalidatePath(`/app/d/${dashboardId}/trafego`);
  return { success: true };
}
