// POST /api/ai/chat
// Streaming chat com a operação. SERVER ONLY — ANTHROPIC_API_KEY nunca vai ao client.
//
// Segurança:
// 1. getAuthContext() valida a sessão e carrega permissões
// 2. buildAIContext() filtra dados pelo papel — a IA só vê o que o usuário pode ver
// 3. A chave ANTHROPIC_API_KEY é lida apenas no servidor
// 4. O contexto financeiro é enviado SÓ se permissions.pode_ver_financeiro = true

import { type NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthContext } from '@/lib/auth/getPermissions';
import { buildAIContext } from '@/lib/ai/context';
import { buildSystemPrompt } from '@/lib/ai/prompts';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const MAX_HISTORY = 10; // Mantém as últimas N trocas para controle de token

export async function POST(request: NextRequest) {
  // 1. Autenticação
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  // 2. Só dono/head têm acesso ao módulo de inteligência
  if (ctx.profile.role !== 'dono' && ctx.profile.role !== 'head') {
    return NextResponse.json({ error: 'Acesso restrito a Dono e Head.' }, { status: 403 });
  }

  let body: { message: string; history?: ChatMessage[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  }

  const { message, history = [] } = body;
  if (!message?.trim()) {
    return NextResponse.json({ error: 'Mensagem vazia.' }, { status: 400 });
  }

  // 3. Verificar chave da API
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'sk-ant-CONFIGURE-ME') {
    return NextResponse.json({ error: 'IA não configurada. Adicione ANTHROPIC_API_KEY nas variáveis de ambiente.' }, { status: 503 });
  }

  // 4. Buscar nome da operação
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any;
  const { data: op } = await supabaseAny
    .from('operations')
    .select('name')
    .eq('id', ctx.profile.operation_id)
    .single();
  const opNome = (op as { name: string } | null)?.name ?? 'Operação';

  // 5. Construir contexto filtrado por permissão (THE critical step)
  const aiContext = await buildAIContext(ctx, supabaseAny, opNome);

  // 6. Montar histórico (truncado para economizar tokens)
  const recentHistory = history.slice(-MAX_HISTORY);
  const messages: Anthropic.MessageParam[] = [
    ...recentHistory.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  // 7. Chamar Claude com streaming
  const client = new Anthropic({ apiKey });
  const systemPrompt = buildSystemPrompt(aiContext);

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: systemPrompt,
          messages,
        });

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro na IA.';
        controller.enqueue(encoder.encode(`\n\n[Erro: ${msg}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Transfer-Encoding': 'chunked',
    },
  });
}
