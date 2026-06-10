'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useAtom } from 'jotai';
import {
  messagesAtom,
  busyAtom,
  activeStreamIdAtom,
  approvalAtom,
  clarifyAtom,
  todosAtom,
  todoMetaAtom,
  composerContextAtom,
  bgTasksAtom,
} from '@/atoms/chat';
import { activeSessionAtom } from '@/atoms/session';
import { SSEClient } from '@/lib/sse-client';
import { apiPost, fetcher } from '@/lib/api-client';
import { parseCommand } from '@/lib/commands';
import { useStreamingRenderer } from '@/hooks/use-streaming-renderer';
import type { Message, ToolCall, ApprovalRequest, ClarifyRequest, TodoItem } from '@/types';
import { type TurnUsage } from '@/types/message';

interface SSEApprovalData {
  approval_id?: string;
  description?: string;
  command?: string;
  pattern_keys?: string[];
  tool_name?: string;
  tool_args?: Record<string, unknown>;
}

interface SSEClarifyData {
  clarify_id?: string;
  question?: string;
  description?: string;
  choices_offered?: string[];
  expires_at?: string;
  timeout_seconds?: number;
}

export function useChatStream(sessionId: string) {
  const [messages, setMessages] = useAtom(messagesAtom);
  const [busy, setBusy] = useAtom(busyAtom);
  const [, setStreamId] = useAtom(activeStreamIdAtom);
  const [activeSession, setActiveSession] = useAtom(activeSessionAtom);
  const [, setApproval] = useAtom(approvalAtom);
  const [, setClarify] = useAtom(clarifyAtom);
  const [, setTodos] = useAtom(todosAtom);
  const [, setTodoMeta] = useAtom(todoMetaAtom);
  const [, setComposerContext] = useAtom(composerContextAtom);
  const [, setBgTasks] = useAtom(bgTasksAtom);
  const clientRef = useRef<SSEClient | null>(null);
  const bgTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const renderer = useStreamingRenderer();

  // Clean up background task polling on unmount
  useEffect(() => {
    return () => {
      for (const timer of Object.values(bgTimersRef.current)) {
        clearTimeout(timer);
      }
      bgTimersRef.current = {};
    };
  }, []);

  const send = useCallback(
    async (text: string, attachments?: string[]) => {
      if (!text.trim() || busy) return;

      // Handle /bg command
      const cmd = parseCommand(text);
      if (cmd && cmd.name === 'bg') {
        const prompt = cmd.args.join(' ');
        if (!prompt) return;
        try {
          const res = await apiPost<{ task_id?: string; error?: string }>('/api/background', {
            session_id: sessionId,
            prompt,
          });
          if (res.error) {
            setMessages((prev) => [
              ...prev,
              {
                id: `error-${Date.now()}`,
                role: 'system',
                content: `⚠️ ${res.error}`,
                timestamp: new Date().toISOString(),
              },
            ]);
            return;
          }
          if (res.task_id) {
            setBgTasks((prev) => (prev.includes(res.task_id!) ? prev : [...prev, res.task_id!]));
            // Start polling
            const poll = async () => {
              try {
                const status = await fetcher<{ results?: { task_id: string; answer?: string }[] }>(
                  `/api/background/status?session_id=${encodeURIComponent(sessionId)}`,
                );
                if (status.results) {
                  for (const r of status.results) {
                    if (r.task_id === res.task_id) {
                      setBgTasks((prev) => prev.filter((t) => t !== r.task_id));
                      if (bgTimersRef.current[r.task_id]) {
                        clearTimeout(bgTimersRef.current[r.task_id]);
                        delete bgTimersRef.current[r.task_id];
                      }
                      setMessages((prev) => [
                        ...prev,
                        {
                          id: `bg-${Date.now()}`,
                          role: 'assistant',
                          content: `**Background** ${prompt.slice(0, 80)}\n\n${r.answer || 'No answer'}`,
                          timestamp: new Date().toISOString(),
                        },
                      ]);
                      return;
                    }
                  }
                }
              } catch {
                /* ignore */
              }
              bgTimersRef.current[res.task_id!] = setTimeout(poll, 3000);
            };
            void poll();
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Failed to start background task';
          setMessages((prev) => [
            ...prev,
            {
              id: `error-${Date.now()}`,
              role: 'system',
              content: `⚠️ ${errMsg}`,
              timestamp: new Date().toISOString(),
            },
          ]);
        }
        return;
      }

      // Add user message immediately
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setBusy(true);

      try {
        // Build payload matching backend _handle_chat_start expectations
        const payload: Record<string, unknown> = {
          session_id: sessionId,
          message: text,
          profile: activeSession?.profile ?? 'default',
          workspace: activeSession?.workspace ?? null,
          model: activeSession?.model ?? null,
          model_provider: activeSession?.model_provider ?? null,
          explicit_model_pick: false,
        };
        if (attachments && attachments.length > 0) {
          payload.attachments = attachments;
        }
        // Start chat on backend
        const res = await apiPost<{ stream_id: string; session_id: string }>('/chat/start', payload);

        setStreamId(res.stream_id);

        // Open SSE stream
        const client = new SSEClient();
        clientRef.current = client;

        // Reset streaming renderer for new message
        renderer.reset();

        let assistantContent = '';
        const assistantMsg: Message = {
          id: `asst-${Date.now()}`,
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
          _isStreaming: true,
        };
        setMessages((prev) => [...prev, assistantMsg]);

        client.connect(`/api/chat/stream?stream_id=${res.stream_id}`, {
          token: (data: unknown) => {
            const d = data as { text?: string };
            if (d.text) {
              assistantContent += d.text;
              // Feed token to streaming renderer with word-fade
              renderer.appendToken(d.text, (html) => {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsg.id ? { ...m, content: assistantContent, _streamingHtml: html } : m,
                  ),
                );
              });
            }
          },
          reasoning: (data: unknown) => {
            const d = data as { text?: string };
            if (d.text) {
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantMsg.id ? { ...m, reasoning: (m.reasoning || '') + d.text } : m)),
              );
            }
          },
          tool: (data: unknown) => {
            const d = data as {
              tid?: string;
              name?: string;
              preview?: string;
              args?: Record<string, unknown>;
              event_type?: string;
            };
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsg.id
                  ? {
                      ...m,
                      tool_calls: [
                        ...(m.tool_calls || []),
                        {
                          id: d.tid || `tool-${Date.now()}`,
                          name: d.name || '',
                          arguments: JSON.stringify(d.args || {}),
                          status: 'running' as ToolCall['status'],
                          preview: d.preview,
                        },
                      ],
                    }
                  : m,
              ),
            );
          },
          tool_complete: (data: unknown) => {
            const d = data as { tid?: string; name?: string; preview?: string; is_error?: boolean };
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== assistantMsg.id || !m.tool_calls) return m;
                const idx = m.tool_calls.findIndex((tc) => tc.id === d.tid || tc.name === d.name);
                if (idx === -1) return m;
                const updated = [...m.tool_calls];
                updated[idx] = {
                  ...updated[idx],
                  status: d.is_error ? 'error' : 'completed',
                  result: d.preview,
                };
                return { ...m, tool_calls: updated };
              }),
            );
          },
          approval: (data: unknown) => {
            const d = data as SSEApprovalData;
            const req: ApprovalRequest = {
              id: d.approval_id || `approval-${Date.now()}`,
              approval_id: d.approval_id,
              session_id: sessionId,
              tool_name: d.tool_name || d.description || 'Unknown tool',
              tool_args: d.tool_args || {},
              stream_id: res.stream_id,
              created_at: new Date().toISOString(),
              description: d.description,
              command: d.command,
              pattern_keys: d.pattern_keys,
            };
            setApproval(req);
          },
          clarify: (data: unknown) => {
            const d = data as SSEClarifyData;
            const req: ClarifyRequest = {
              id: d.clarify_id || `clarify-${Date.now()}`,
              clarify_id: d.clarify_id,
              session_id: sessionId,
              question: d.question || d.description || '',
              choices: d.choices_offered,
              stream_id: res.stream_id,
              created_at: new Date().toISOString(),
              expires_at: d.expires_at,
              timeout_seconds: d.timeout_seconds,
            };
            setClarify(req);
          },
          todo_state: (data: unknown) => {
            const d = data as { todos?: TodoItem[]; meta?: Record<string, unknown> };
            if (d.todos) setTodos(d.todos);
            if (d.meta) setTodoMeta(d.meta);
          },
          stream_end: () => {
            // Drain remaining words from streaming renderer
            renderer.drain((html) => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, content: assistantContent, _streamingHtml: html, _isStreaming: false }
                    : m,
                ),
              );
            });
            setBusy(false);
            setStreamId(null);
            client.close();
            setActiveSession((prev) => (prev ? { ...prev, message_count: prev.message_count + 1 } : prev));
          },
          done: (data: unknown) => {
            const d = data as {
              usage?: TurnUsage;
              duration?: number;
              tps?: number;
              effective_model?: string;
              gateway_routing?: string;
            };
            // Merge usage with session fallback for context indicator
            if (d.usage) {
              const s = activeSession;
              const merged: TurnUsage = {
                input_tokens: d.usage.input_tokens ?? s?.input_tokens ?? 0,
                output_tokens: d.usage.output_tokens ?? s?.output_tokens ?? 0,
                estimated_cost: d.usage.estimated_cost ?? s?.estimated_cost ?? undefined,
                cache_read_tokens: d.usage.cache_read_tokens ?? s?.cache_read_tokens ?? undefined,
                cache_write_tokens: d.usage.cache_write_tokens ?? s?.cache_write_tokens ?? undefined,
                cache_hit_percent: d.usage.cache_hit_percent ?? s?.cache_hit_percent ?? undefined,
                context_length: d.usage.context_length || s?.context_length || undefined,
                threshold_tokens: d.usage.threshold_tokens || s?.threshold_tokens || undefined,
                last_prompt_tokens: d.usage.last_prompt_tokens ?? s?.last_prompt_tokens ?? undefined,
              };
              setComposerContext(merged);
            }
            // Drain remaining words
            renderer.drain((html) => {
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== assistantMsg.id) return m;
                  const updated = { ...m, _streamingHtml: html, _isStreaming: false };
                  if (d.usage) updated._turnUsage = d.usage;
                  if (d.duration != null) updated._turnDuration = d.duration;
                  if (d.tps != null) updated._turnTps = d.tps;
                  if (d.effective_model) updated._effectiveModel = d.effective_model;
                  if (d.gateway_routing) updated._gatewayRouting = d.gateway_routing;
                  return updated;
                }),
              );
            });
            setBusy(false);
            setStreamId(null);
            client.close();
            setActiveSession((prev) => (prev ? { ...prev, message_count: prev.message_count + 1 } : prev));
          },
          error: (data: unknown) => {
            const d = data as { message?: string; error?: string };
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsg.id
                  ? { ...m, content: `⚠️ Error: ${d.message || d.error || 'Unknown error'}` }
                  : m,
              ),
            );
            setBusy(false);
            setStreamId(null);
            client.close();
          },
          apperror: (data: unknown) => {
            const d = data as { message?: string; error?: string; label?: string };
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsg.id
                  ? { ...m, content: `⚠️ Error: ${d.message || d.error || d.label || 'Unknown error'}` }
                  : m,
              ),
            );
            setBusy(false);
            setStreamId(null);
            client.close();
          },
          cancel: () => {
            setBusy(false);
            setStreamId(null);
            client.close();
          },
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Failed to start chat';
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: 'system',
            content: `⚠️ ${errMsg}`,
            timestamp: new Date().toISOString(),
          },
        ]);
        setBusy(false);
      }
    },
    [
      sessionId,
      busy,
      activeSession,
      setMessages,
      setBusy,
      setStreamId,
      setActiveSession,
      setApproval,
      setClarify,
      setTodos,
      setTodoMeta,
      setComposerContext,
      renderer,
    ],
  );

  const cancel = useCallback(() => {
    clientRef.current?.close();
    setBusy(false);
    setStreamId(null);
    // Also notify backend
    fetch(`/api/chat/cancel?stream_id=${''}`, { method: 'GET' }).catch(() => {});
  }, [setBusy, setStreamId]);

  return { send, cancel, messages, busy };
}
