'use client';

// ChatInterface — interface de chat com a IA da operação.
// Usa streaming SSE via /api/ai/chat (SERVER ONLY — chave nunca no client).
// Histórico mantido em estado React (sessão, não persistido no client).

import { useState, useRef, useEffect, useTransition } from 'react';
import { useActionState } from 'react';
import { createAISuggestedActionAction } from '@/app/app/relatorios/actions';

export interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

// Extrai blocos de ações sugeridas pela IA (formato ```actions [...] ```)
function extractActions(text: string): { text: string; actions: Record<string, string>[] } {
  const match = text.match(/```actions\s*([\s\S]*?)```/);
  if (!match) return { text, actions: [] };
  try {
    const actions = JSON.parse(match[1].trim()) as Record<string, string>[];
    const cleanText = text.replace(/```actions[\s\S]*?```/, '').trim();
    return { text: cleanText, actions };
  } catch {
    return { text, actions: [] };
  }
}

function MarkdownText({ text }: { text: string }) {
  // Renderiza **bold** e listas simples sem biblioteca externa
  const html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^###\s(.+)$/gm, '<strong class="text-zinc-200 text-sm">$1</strong>')
    .replace(/^-\s(.+)$/gm, '<span class="flex gap-1"><span class="text-zinc-600 shrink-0">·</span>$1</span>');
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function ActionCard({ action }: { action: Record<string, string> }) {
  const [state, dispatch] = useActionState(createAISuggestedActionAction, null);
  const [confirmed, setConfirmed] = useState(false);

  if (confirmed || (state && 'success' in state)) {
    return (
      <div className="flex items-center gap-2 text-xs text-emerald-500 py-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Ação criada — aparece em Ações Pendentes na Visão Geral.
      </div>
    );
  }

  return (
    <form action={dispatch} onSubmit={() => setConfirmed(true)}
      className="flex items-start gap-2 p-2.5 bg-orange-500/5 border border-orange-500/15 rounded-lg">
      <input type="hidden" name="type" value={action.type ?? 'criar_tarefa'} />
      <input type="hidden" name="title" value={action.title ?? ''} />
      <input type="hidden" name="description" value={action.description ?? ''} />
      <input type="hidden" name="target_sector" value={action.target_sector ?? ''} />
      <input type="hidden" name="priority" value={action.priority ?? 'media'} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-orange-300">{action.title}</p>
        {action.description && <p className="text-[11px] text-zinc-500 mt-0.5">{action.description}</p>}
      </div>
      <button type="submit"
        className="shrink-0 px-2.5 py-1 rounded text-[11px] font-semibold bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/25 transition-colors">
        Confirmar
      </button>
    </form>
  );
}

interface Props {
  initialSystemInfo?: string;
}

const SUGGESTIONS = [
  'Por que o lucro caiu este mês?',
  'Qual campanha está queimando dinheiro?',
  'Qual produto tem melhor margem?',
  'O que está atrasado na equipe?',
  'Resume o desempenho do mês em 3 pontos.',
];

export function ChatInterface({ initialSystemInfo }: Props) {
  const [history, setHistory] = useState<ChatMsg[]>([]);
  const [input, setInput]     = useState('');
  const [streaming, setStreaming] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [error, setError]     = useState<string | null>(null);
  const bottomRef             = useRef<HTMLDivElement>(null);
  const textareaRef           = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, currentResponse]);

  async function sendMessage(msg: string) {
    if (!msg.trim() || streaming) return;

    const userMsg: ChatMsg = { role: 'user', content: msg };
    const newHistory = [...history, userMsg];
    setHistory(newHistory);
    setInput('');
    setStreaming(true);
    setCurrentResponse('');
    setError(null);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: history.slice(-8) }),
      });

      if (!res.ok) {
        const { error: errMsg } = await res.json().catch(() => ({ error: 'Erro desconhecido.' }));
        setError(errMsg ?? 'Erro na IA.');
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          full += chunk;
          setCurrentResponse(full);
        }
      }

      setHistory(prev => [...prev, { role: 'assistant', content: full }]);
      setCurrentResponse('');
    } catch (err) {
      setError('Falha na conexão com a IA. Verifique a chave ANTHROPIC_API_KEY.');
    } finally {
      setStreaming(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-[500px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-4">
        {/* Welcome */}
        {history.length === 0 && !streaming && (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-4">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-orange-400">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4l2.5 2.5" />
              </svg>
            </div>
            <p className="text-zinc-300 font-semibold mb-1">Assistente da Operação</p>
            <p className="text-zinc-600 text-sm max-w-xs mb-6">
              Pergunte sobre dados financeiros, tráfego, tarefas e equipe. Respondo com base nos dados reais que você pode ver.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => sendMessage(s)}
                  className="text-xs text-zinc-500 hover:text-zinc-200 border border-white/[0.07] hover:border-white/[0.12] px-3 py-1.5 rounded-lg transition-all">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {history.map((msg, i) => {
          const { text: cleanText, actions } = msg.role === 'assistant'
            ? extractActions(msg.content)
            : { text: msg.content, actions: [] };

          return (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                msg.role === 'user' ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-300'
              }`}>
                {msg.role === 'user' ? 'V' : 'IA'}
              </div>
              <div className={`max-w-[85%] flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-3 rounded-xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-orange-500/15 text-zinc-200 border border-orange-500/20'
                    : 'bg-[#111111] text-zinc-300 border border-white/[0.06]'
                }`}>
                  <MarkdownText text={cleanText} />
                </div>
                {actions.length > 0 && (
                  <div className="flex flex-col gap-1.5 w-full">
                    <p className="text-[10px] text-zinc-600 uppercase tracking-[0.1em] font-semibold">Ações sugeridas pela IA</p>
                    {actions.map((a, j) => <ActionCard key={j} action={a} />)}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Streaming response */}
        {streaming && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center text-xs font-bold shrink-0">IA</div>
            <div className="bg-[#111111] border border-white/[0.06] px-4 py-3 rounded-xl text-sm text-zinc-300 leading-relaxed max-w-[85%]">
              {currentResponse ? (
                <MarkdownText text={currentResponse} />
              ) : (
                <span className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="px-4 py-3 bg-red-950/40 border border-red-800/50 rounded-xl text-xs text-red-400">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/[0.05] pt-4">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Pergunte sobre a operação... (Enter para enviar)"
            rows={2}
            disabled={streaming}
            className="flex-1 bg-[#0D0D0D] border border-white/[0.08] text-zinc-200 placeholder-zinc-700 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-orange-500/40 disabled:opacity-50 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || streaming}
            className="px-4 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-semibold text-sm transition-colors disabled:opacity-40 shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
        <p className="text-[10px] text-zinc-600 mt-2 text-center">
          Respostas baseadas nos dados que você pode ver · Shift+Enter = nova linha
        </p>
      </div>
    </div>
  );
}
