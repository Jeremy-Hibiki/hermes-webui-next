'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
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
  compressionAtom,
  composerStatusAtom,
  liveTpsAtom,
} from '@/atoms/chat';
import { activeSessionAtom, optimisticSessionsAtom } from '@/atoms/session';
import { queueSessionMessage, shiftQueuedSessionMessage } from '@/atoms/streaming';
import { SSEClient } from '@/lib/sse-client';
import { apiPost, fetcher } from '@/lib/api-client';
import { parseCommand } from '@/lib/commands';
import { useStreamingRenderer } from '@/hooks/use-streaming-renderer';
import { playAttentionSound, playNotificationSound, sendBrowserNotification } from '@/lib/notifications';
import { toast } from '@/components/ui/toast';
import type { Message, ToolCall, ApprovalRequest, ClarifyRequest, TodoItem } from '@/types';
import { type TurnUsage } from '@/types/message';
import { t } from '@/lib/i18n';

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
  const [activeStreamId, setStreamId] = useAtom(activeStreamIdAtom);
  const [activeSession, setActiveSession] = useAtom(activeSessionAtom);
  const [compression] = useAtom(compressionAtom);
  const [, setApproval] = useAtom(approvalAtom);
  const [, setClarify] = useAtom(clarifyAtom);
  const [, setTodos] = useAtom(todosAtom);
  const [, setTodoMeta] = useAtom(todoMetaAtom);
  const [, setComposerContext] = useAtom(composerContextAtom);
  const [, setBgTasks] = useAtom(bgTasksAtom);
  const [, setCompression] = useAtom(compressionAtom);
  const [, setComposerStatus] = useAtom(composerStatusAtom);
  const [, setLiveTps] = useAtom(liveTpsAtom);
  const [, setOptimisticMap] = useAtom(optimisticSessionsAtom);
  const clientRef = useRef<SSEClient | null>(null);
  const bgTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const renderer = useStreamingRenderer();
  const sendInProgressRef = useRef(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [liveRunTokenCount, setLiveRunTokenCount] = useState<number>(0);

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
      if (!text.trim() || sendInProgressRef.current) return;

      // Clear stale busy state before rejecting send
      if (busy) {
        const compressionRunning = compression?.phase === 'running';
        const hasRuntimeConfirmation = Boolean(
          activeStreamId ||
          activeSession?.active_stream_id ||
          activeSession?.pending_user_message ||
          activeSession?.pending_started_at,
        );
        if (!compressionRunning && !hasRuntimeConfirmation) {
          setBusy(false);
          setStreamId(null);
        } else {
          return;
        }
      }

      if (activeSession?.read_only) {
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: 'system',
            content: 'Read-only imported sessions cannot be modified.',
            timestamp: new Date().toISOString(),
          },
        ]);
        return;
      }
      if (!navigator.onLine) {
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: 'system',
            content: 'You appear to be offline. Please check your connection and try again.',
            timestamp: new Date().toISOString(),
          },
        ]);
        return;
      }
      sendInProgressRef.current = true;
      try {
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
                            content: `**${t('bg.label')}** ${prompt.slice(0, 80)}\n\n${r.answer || t('bg.noAnswer')}`,
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
            const errMsg = err instanceof Error ? err.message : t('bg.failed');
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

        // Optimistic first-turn sidebar row: make the session visible
        // with a title and streaming state before the server list refreshes.
        if (activeSession) {
          const nowSec = Math.floor(Date.now() / 1000);
          setOptimisticMap((prev) => {
            const next = new Map(prev);
            next.set(sessionId, {
              ...activeSession,
              session_id: sessionId,
              title: activeSession.title || text.slice(0, 64) || 'New chat',
              message_count: Math.max(activeSession.message_count || 0, messages.length + 1, 1),
              last_message_at: nowSec,
              updated_at: nowSec,
              is_streaming: true,
            });
            return next;
          });
        }

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
          const res = await apiPost<{
            stream_id: string;
            session_id: string;
            pending_started_at?: number;
          }>('/chat/start', payload);

          setStreamId(res.stream_id);
          setStartedAt(res.pending_started_at ?? null);
          setLiveRunTokenCount(0);

          // Second optimistic pass: stream id is now known
          if (activeSession) {
            const nowSec = Math.floor(Date.now() / 1000);
            setOptimisticMap((prev) => {
              const next = new Map(prev);
              const existing = next.get(sessionId) || {};
              next.set(sessionId, {
                ...activeSession,
                ...existing,
                session_id: sessionId,
                title: activeSession.title || text.slice(0, 64) || 'New chat',
                message_count: Math.max(activeSession.message_count || 0, messages.length + 1, 1),
                last_message_at: nowSec,
                updated_at: nowSec,
                active_stream_id: res.stream_id,
                pending_started_at: res.pending_started_at ?? undefined,
                is_streaming: true,
              });
              return next;
            });
          }

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
              playAttentionSound(`${sessionId}:approval:1`);
              sendBrowserNotification('Approval required', d.description || 'Tool approval needed');
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
              playAttentionSound(`${sessionId}:clarify:1`);
              sendBrowserNotification('Clarification needed', d.question || 'Tool clarification needed');
            },
            todo_state: (data: unknown) => {
              const d = data as { todos?: TodoItem[]; meta?: Record<string, unknown> };
              if (d.todos) setTodos(d.todos);
              if (d.meta) setTodoMeta(d.meta);
            },
            compressing: (data: unknown) => {
              const d = data as { session_id?: string };
              if (d.session_id && d.session_id !== sessionId) return;
              setCompression({
                phase: 'running',
                automatic: true,
                message: 'Compressing context',
                startedAt: Date.now() / 1000,
              });
            },
            compressed: (data: unknown) => {
              const d = data as {
                old_session_id?: string;
                session_id?: string;
                new_session_id?: string;
                continuation_session_id?: string;
                usage?: TurnUsage;
              };
              const eventSid = d.old_session_id || d.session_id || sessionId;
              const continuationSid = d.new_session_id || d.continuation_session_id || '';
              const eventMatchesCurrent =
                sessionId &&
                (eventSid === sessionId || d.new_session_id === sessionId || d.continuation_session_id === sessionId);
              if (!eventMatchesCurrent) return;
              setCompression({
                phase: 'done',
                automatic: true,
                message: 'Context auto-compressed',
                continuationSessionId: continuationSid,
              });
              if (d.usage) {
                const merged: TurnUsage = {
                  input_tokens: d.usage.input_tokens ?? activeSession?.input_tokens ?? 0,
                  output_tokens: d.usage.output_tokens ?? activeSession?.output_tokens ?? 0,
                  estimated_cost: d.usage.estimated_cost ?? activeSession?.estimated_cost ?? undefined,
                  cache_read_tokens: d.usage.cache_read_tokens ?? activeSession?.cache_read_tokens ?? undefined,
                  cache_write_tokens: d.usage.cache_write_tokens ?? activeSession?.cache_write_tokens ?? undefined,
                  cache_hit_percent: d.usage.cache_hit_percent ?? activeSession?.cache_hit_percent ?? undefined,
                  context_length: d.usage.context_length || activeSession?.context_length || undefined,
                  threshold_tokens: d.usage.threshold_tokens || activeSession?.threshold_tokens || undefined,
                  last_prompt_tokens: d.usage.last_prompt_tokens ?? activeSession?.last_prompt_tokens ?? undefined,
                };
                setComposerContext(merged);
              }
            },
            pending_steer_leftover: (data: unknown) => {
              const d = data as { session_id?: string; text?: string };
              const sid = d.session_id || sessionId;
              const txt = String(d.text || '').trim();
              if (!txt || sid !== sessionId) return;
              queueSessionMessage(sid, {
                text: txt,
                attachments: [],
                model: activeSession?.model ?? null,
                model_provider: activeSession?.model_provider ?? null,
                profile: activeSession?.profile || 'default',
              });
              toast('Steer leftover queued for next turn', 'info');
            },
            metering: (data: unknown) => {
              const d = data as {
                session_id?: string;
                usage?: TurnUsage;
                estimated?: boolean;
                tps_available?: boolean;
                tps?: number;
              };
              if ((d.session_id || sessionId) !== sessionId) return;
              // Live TPS display
              if (d.estimated === true || d.tps_available !== true || typeof d.tps !== 'number' || d.tps <= 0) {
                setLiveTps(null);
              } else {
                setLiveTps(d.tps);
              }
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
                if (d.usage.output_tokens != null) setLiveRunTokenCount(d.usage.output_tokens);
              }
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
              setCompression(null);
              setStartedAt(null);
              setLiveTps(null);
              setLiveRunTokenCount(0);
              setActiveSession((prev) => (prev ? { ...prev, message_count: prev.message_count + 1 } : prev));
              setOptimisticMap((prev) => {
                const next = new Map(prev);
                next.delete(sessionId);
                return next;
              });
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
                if (d.usage.output_tokens != null) setLiveRunTokenCount(d.usage.output_tokens);
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
              playNotificationSound();
              sendBrowserNotification('Response complete', activeSession?.title || 'Hermes');
              setBusy(false);
              setStreamId(null);
              client.close();
              setCompression(null);
              setStartedAt(null);
              setLiveTps(null);
              setLiveRunTokenCount(0);
              setActiveSession((prev) => (prev ? { ...prev, message_count: prev.message_count + 1 } : prev));
              setOptimisticMap((prev) => {
                const next = new Map(prev);
                next.delete(sessionId);
                return next;
              });
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
              setCompression(null);
              setStartedAt(null);
              setOptimisticMap((prev) => {
                const next = new Map(prev);
                next.delete(sessionId);
                return next;
              });
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
              setCompression(null);
              setStartedAt(null);
              setOptimisticMap((prev) => {
                const next = new Map(prev);
                next.delete(sessionId);
                return next;
              });
            },
            cancel: () => {
              setBusy(false);
              setStreamId(null);
              client.close();
              setCompression(null);
              setStartedAt(null);
              setLiveTps(null);
              setOptimisticMap((prev) => {
                const next = new Map(prev);
                next.delete(sessionId);
                return next;
              });
            },
            warning: (data: unknown) => {
              const d = data as { message?: string; type?: string };
              setComposerStatus(d.message || 'Warning');
              if (d.type === 'fallback') setTimeout(() => setComposerStatus(''), 4000);
            },
            title: (data: unknown) => {
              const d = data as { session_id?: string; title?: string };
              const sid = d.session_id || sessionId;
              if (sid !== sessionId) return;
              if (d.title) {
                setActiveSession((prev) => (prev ? { ...prev, title: d.title! } : prev));
              }
            },
            title_status: () => {
              // Informational only — console-level logging, no visual effect
            },
            state_saved: (data: unknown) => {
              const d = data as { session_id?: string; kind?: string; name?: string; action?: string };
              const sid = d.session_id || sessionId;
              if (sid !== sessionId) return;
              const isCreated = String(d.action || '').toLowerCase() === 'created';
              const kindLabel = d.kind || 'State';
              const name = d.name ? ` "${d.name}"` : '';
              toast(`${kindLabel}${name} ${isCreated ? 'created' : 'saved'}`, 'info');
            },
            goal: (data: unknown) => {
              const d = data as { session_id?: string; state?: string; decision?: string; message?: string };
              const sid = d.session_id || sessionId;
              if (sid !== sessionId) return;
              const goalState = String(d.state || '').trim();
              if (goalState === 'evaluating') {
                setComposerStatus('Evaluating goal…');
                return;
              }
              const msg = d.message || (d.decision ? `Goal: ${d.decision}` : '');
              if (!msg) return;
              setComposerStatus(msg);
              toast(msg.split('\n')[0]);
            },
            goal_continue: (data: unknown) => {
              const d = data as { session_id?: string; continuation_prompt?: string; text?: string };
              const sid = d.session_id || sessionId;
              const continuation = String(d.continuation_prompt || d.text || '').trim();
              if (!continuation || sid !== sessionId) return;
              queueSessionMessage(sid, {
                text: continuation,
                attachments: [],
                model: activeSession?.model ?? null,
                model_provider: activeSession?.model_provider ?? null,
                profile: activeSession?.profile || 'default',
              });
              toast('Goal continuation queued', 'info');
            },
            context_status: (data: unknown) => {
              const d = data as { session_id?: string; prefill?: { status?: string; label?: string; error?: string } };
              const sid = d.session_id || sessionId;
              if (sid !== sessionId) return;
              const prefill = d.prefill || {};
              const status = String(prefill.status || 'not_configured');
              const label = String(prefill.label || 'session recall');
              if (status === 'loaded') {
                setComposerStatus(`Context loaded: ${label}`);
              } else if (status === 'error') {
                setComposerStatus(`Context unavailable: ${label}`);
                toast(`Context unavailable: ${String(prefill.error || label)}`, 'error');
              }
            },
            interim_assistant: (data: unknown) => {
              const d = data as { text?: string; already_streamed?: number };
              if (!d.text) return;
              // Append as a new paragraph segment to the assistant message
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== assistantMsg.id) return m;
                  const existing = typeof m.content === 'string' ? m.content : '';
                  return { ...m, content: existing + '\n\n' + d.text };
                }),
              );
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
          setStartedAt(null);
          setOptimisticMap((prev) => {
            const next = new Map(prev);
            next.delete(sessionId);
            return next;
          });
        }
      } finally {
        sendInProgressRef.current = false;
      }
    },
    [
      sessionId,
      busy,
      activeStreamId,
      compression,
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
      setCompression,
      setOptimisticMap,
      setComposerStatus,
      setLiveTps,
      renderer,
    ],
  );

  // Ref to latest send so drain effect always calls the current version
  const sendRef = useRef(send);
  sendRef.current = send;

  // Drain queued messages when busy transitions from true -> false
  const wasBusyRef = useRef(false);
  useEffect(() => {
    if (!busy && wasBusyRef.current && sessionId) {
      const next = shiftQueuedSessionMessage(sessionId);
      if (next?.text) {
        setTimeout(() => {
          // Restore model / provider from queued turn before sending
          if (next.model || next.model_provider) {
            setActiveSession((prev) =>
              prev
                ? {
                    ...prev,
                    model: next.model ?? prev.model,
                    model_provider: next.model_provider ?? prev.model_provider,
                  }
                : prev,
            );
          }
          void sendRef.current(next.text, next.attachments);
        }, 200);
      }
    }
    wasBusyRef.current = busy;
  }, [busy, sessionId]);

  const cancel = useCallback(() => {
    clientRef.current?.close();
    setBusy(false);
    setStreamId(null);
    // Also notify backend
    fetch(`/api/chat/cancel?stream_id=${''}`, { method: 'GET' }).catch(() => {});
  }, [setBusy, setStreamId]);

  return { send, cancel, messages, busy, startedAt, liveRunTokenCount };
}
