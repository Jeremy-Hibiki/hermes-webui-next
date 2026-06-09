"use client";

import { useCallback, useRef } from "react";
import { useAtom } from "jotai";
import {
  messagesAtom,
  busyAtom,
  activeStreamIdAtom,
  approvalAtom,
  clarifyAtom,
  todosAtom,
  todoMetaAtom,
} from "@/atoms/chat";
import { activeSessionAtom } from "@/atoms/session";
import { SSEClient } from "@/lib/sse-client";
import { apiPost } from "@/lib/api-client";
import type { Message, ToolCall, ApprovalRequest, ClarifyRequest, TodoItem } from "@/types";

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
  const [, setActiveSession] = useAtom(activeSessionAtom);
  const [, setApproval] = useAtom(approvalAtom);
  const [, setClarify] = useAtom(clarifyAtom);
  const [, setTodos] = useAtom(todosAtom);
  const [, setTodoMeta] = useAtom(todoMetaAtom);
  const clientRef = useRef<SSEClient | null>(null);

  const send = useCallback(
    async (text: string, attachments?: string[]) => {
      if (!text.trim() || busy) return;

      // Add user message immediately
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setBusy(true);

      try {
        // Start chat on backend
        const res = await apiPost<{ stream_id: string; session_id: string }>("/chat/start", {
          session_id: sessionId,
          message: text,
          attachments,
        });

        setStreamId(res.stream_id);

        // Open SSE stream
        const client = new SSEClient();
        clientRef.current = client;

        let assistantContent = "";
        const assistantMsg: Message = {
          id: `asst-${Date.now()}`,
          role: "assistant",
          content: "",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        client.connect(`/api/chat/stream?stream_id=${res.stream_id}`, {
          message: (data: unknown) => {
            const d = data as { content?: string };
            if (d.content) {
              assistantContent += d.content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id ? { ...m, content: assistantContent } : m,
                ),
              );
            }
          },
          reasoning: (data: unknown) => {
            const d = data as { content?: string };
            if (d.content) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, reasoning: (m.reasoning || "") + d.content }
                    : m,
                ),
              );
            }
          },
          tool_call: (data: unknown) => {
            const d = data as { id?: string; name?: string; arguments?: string; status?: string };
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsg.id
                  ? {
                      ...m,
                      tool_calls: [
                        ...(m.tool_calls || []),
                        {
                          id: d.id || "",
                          name: d.name || "",
                          arguments: d.arguments || "{}",
                          status: (d.status || "pending") as ToolCall["status"],
                        },
                      ],
                    }
                  : m,
              ),
            );
          },
          approval: (data: unknown) => {
            const d = data as SSEApprovalData;
            const req: ApprovalRequest = {
              id: d.approval_id || `approval-${Date.now()}`,
              approval_id: d.approval_id,
              session_id: sessionId,
              tool_name: d.tool_name || d.description || "Unknown tool",
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
              question: d.question || d.description || "",
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
          done: () => {
            setBusy(false);
            setStreamId(null);
            client.close();
            // Update session title if new
            setActiveSession((prev) =>
              prev ? { ...prev, message_count: prev.message_count + 1 } : prev,
            );
          },
          error: (data: unknown) => {
            const d = data as { message?: string };
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsg.id
                  ? { ...m, content: `⚠️ Error: ${d.message || "Unknown error"}` }
                  : m,
              ),
            );
            setBusy(false);
            setStreamId(null);
            client.close();
          },
          cancelled: () => {
            setBusy(false);
            setStreamId(null);
            client.close();
          },
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Failed to start chat";
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: "system",
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
      setMessages,
      setBusy,
      setStreamId,
      setActiveSession,
      setApproval,
      setClarify,
      setTodos,
      setTodoMeta,
    ],
  );

  const cancel = useCallback(() => {
    clientRef.current?.close();
    setBusy(false);
    setStreamId(null);
    // Also notify backend
    fetch(`/api/chat/cancel?stream_id=${""}`, { method: "GET" }).catch(() => {});
  }, [setBusy, setStreamId]);

  return { send, cancel, messages, busy };
}
