// POST /api/ai/summary
// Gera resumo executivo de um relatório. Persiste em operation_reports.ai_summary.
// SERVER ONLY.

import { type NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/auth/getPermissions';
import { buildAIContext } from '@/lib/ai/context';
import { buildSystemPrompt, buildAnomalyPrompt } from '@/lib/ai/prompts';

export async function POST(request: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (ctx.profile.role !== 'dono' && ctx.profile.role !== 'head') {
    return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'sk-ant-CONFIGURE-ME') {
    return NextResponse.json({ error: 'IA não configurada.' }, { status: 503 });
  }

  let body: { reportId?: string; type: 'summary' | 'anomalies' };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  }

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: op } = await db
    .from('operations')
    .select('name')
    .eq('id', ctx.profile.operation_id)
    .single();
  const opNome = (op as { name: string } | null)?.name ?? 'Operação';

  const aiContext = await buildAIContext(ctx, db, opNome);
  const client = new Anthropic({ apiKey });

  let userMessage: string;
  if (body.type === 'anomalies') {
    userMessage = buildAnomalyPrompt(aiContext);
  } else {
    const { data: report } = body.reportId
      ? await db.from('operation_reports').select('period_type, period_ref').eq('id', body.reportId).eq('operation_id', ctx.profile.operation_id).single()
      : { data: null };
    const label = report
      ? `relatório ${report.period_type === 'mensal' ? 'mensal' : 'semanal'} (${report.period_ref})`
      : 'período atual';
    userMessage = `Gere um resumo executivo do ${label} desta operação em 3 blocos curtos:
1. **Resultado geral**: número principal e o que representa.
2. **Driver principal**: o que puxou para cima e o que pesou.
3. **Recomendação**: 1 ação concreta baseada nos dados.
Se houver anomalia clara, destaque em negrito. Seja direto, sem elogios vazios.`;
  }

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: buildSystemPrompt(aiContext),
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    // Persiste o resumo no relatório se tiver reportId
    if (body.reportId && body.type === 'summary') {
      await db
        .from('operation_reports')
        .update({ ai_summary: text, ai_summary_generated_at: new Date().toISOString() })
        .eq('id', body.reportId)
        .eq('operation_id', ctx.profile.operation_id);
    }

    return NextResponse.json({ text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro na IA.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
