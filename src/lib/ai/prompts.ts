// Prompts do sistema para a IA.
// SERVER-ONLY — nunca importar em Client Components.

import type { AIContext } from './context';

// Constrói o system prompt com os dados de contexto já filtrados por permissão
export function buildSystemPrompt(ctx: AIContext): string {
  const hasFinancial = !!ctx.financeiro;
  const hasTraffic   = !!ctx.trafego;

  const contextJson = JSON.stringify({
    operacao: ctx.operacao,
    periodo: ctx.periodo,
    ...(hasFinancial && { financeiro: ctx.financeiro }),
    ...(hasTraffic   && { trafego: ctx.trafego }),
    tarefas: ctx.tarefas,
    alertas: ctx.alertas_ativos,
  }, null, 2);

  return `Você é o assistente de inteligência da Central de Operações, um sistema de gestão de infoprodutos brasileiro.

PAPEL: Analista executivo que responde em português do Brasil, de forma direta, objetiva e acionável. Sem rodeios.

DADOS DISPONÍVEIS PARA ESTE USUÁRIO (${ctx.operacao.papel}):
\`\`\`json
${contextJson}
\`\`\`

REGRAS CRÍTICAS:
1. Responda APENAS com base nos dados acima. Se algo não constar, diga "não tenho esse dado".
2. Este usuário tem papel "${ctx.operacao.papel}" — ${hasFinancial ? 'pode ver dados financeiros' : 'NÃO pode ver dados financeiros (não mencione números financeiros)'}.
3. Nunca invente dados. Nunca extrapole além do contexto fornecido.
4. Seja conciso: 2-3 parágrafos no máximo para análises; 1 linha para respostas diretas.
5. Quando sugerir ação, use o formato JSON no fim da resposta:
   \`\`\`actions
   [{"type":"criar_tarefa","title":"...","description":"...","target_sector":"...","priority":"alta|media|baixa"}]
   \`\`\`
6. Tipos de ação permitidos: criar_tarefa, marcar_alerta. NUNCA sugira ações financeiras ou de permissão.
7. Se não souber responder, diga diretamente. Não alucinações.

Foco: ajude o usuário a tomar decisões práticas com os dados que tem.`;
}

// Prompt para geração de resumo executivo
export function buildSummaryPrompt(ctx: AIContext, reportLabel: string): string {
  const system = buildSystemPrompt(ctx);

  const userPrompt = `Gere um resumo executivo do ${reportLabel} desta operação.

Formato esperado — 3 blocos curtos:
1. **Resultado geral**: 1 frase com o número principal e o que ele representa.
2. **Principal driver positivo e negativo**: o que puxou pra cima e o que pesou.
3. **Recomendação imediata**: 1 ação concreta baseada nos dados.

Se identificar anomalia clara (ex: reembolso > 5%, ROAS abaixo do alvo, custo crescendo mais que receita), destaque em negrito. Tom: direto, sem jargão, sem elogios vazios.`;

  return JSON.stringify({ system, userPrompt });
}

// Prompt de detecção de anomalias
export function buildAnomalyPrompt(ctx: AIContext): string {
  const contextual = ctx.alertas_ativos.length > 0
    ? `Alertas já detectados pelo sistema automático:\n${ctx.alertas_ativos.join('\n')}\n\n`
    : '';

  return `${contextual}Analise os dados do mês atual e liste APENAS as anomalias reais que precisam de atenção imediata.
Foco em: variações > 20% vs mês anterior, métricas fora dos limites saudáveis, gargalos operacionais.
Seja específico com números. Máximo 5 itens. Se não houver anomalia grave, diga claramente.`;
}
