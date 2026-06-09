"use client";

import { useCallback } from "react";
import { useAtom } from "jotai";
import { messagesAtom, busyAtom, approvalAtom, clarifyAtom, yoloAtom } from "@/atoms/chat";
import { activeSessionAtom } from "@/atoms/session";
import { useChatStream } from "@/hooks/use-chat-stream";
import { ComposerFooter } from "./composer-footer";
import { MessageList } from "@/components/chat/message-list";
import { StreamingCursor } from "@/components/chat/streaming-cursor";
import { ApprovalCard } from "@/components/chat/approval-card";
import { ClarifyCard } from "@/components/chat/clarify-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiPost } from "@/lib/api-client";

export function MainPanel() {
  const [messages] = useAtom(messagesAtom);
  const [busy] = useAtom(busyAtom);
  const [activeSession] = useAtom(activeSessionAtom);
  const [approval, setApproval] = useAtom(approvalAtom);
  const [clarify, setClarify] = useAtom(clarifyAtom);
  const [, setYolo] = useAtom(yoloAtom);

  const sessionId = activeSession?.id ?? "";
  const { send, cancel } = useChatStream(sessionId);

  const handleSend = (message: string, _attachments?: File[]) => {
    if (!sessionId) return;
    void send(message);
  };

  const handleCancel = () => {
    cancel();
  };

  const handleApprovalRespond = useCallback(
    async (approvalId: string, choice: "once" | "session" | "always" | "deny") => {
      try {
        await apiPost("/approval/respond", {
          session_id: sessionId,
          approval_id: approvalId,
          choice,
        });
        setApproval(null);
      } catch (err) {
        console.error("Failed to respond to approval:", err);
      }
    },
    [sessionId, setApproval],
  );

  const handleYoloToggle = useCallback(async () => {
    try {
      await apiPost("/session/yolo", { session_id: sessionId, enabled: true });
      setYolo(true);
      setApproval(null);
    } catch (err) {
      console.error("Failed to toggle YOLO:", err);
    }
  }, [sessionId, setYolo, setApproval]);

  const handleClarifyRespond = useCallback(
    async (clarifyId: string, response: string) => {
      try {
        await apiPost("/clarify/respond", {
          session_id: sessionId,
          clarify_id: clarifyId,
          response,
        });
        setClarify(null);
      } catch (err) {
        console.error("Failed to respond to clarify:", err);
      }
    },
    [sessionId, setClarify],
  );

  return (
    <div className="flex flex-col h-full">
      {messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[var(--muted)]">
          <div className="text-center">
            <h2 className="text-2xl font-serif mb-2 text-[var(--text)]">Hermes</h2>
            <p className="text-sm">Start a conversation</p>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1 p-4">
          <MessageList messages={messages} />
          {busy && <StreamingCursor streaming={true} />}
        </ScrollArea>
      )}

      {approval && (
        <div className="px-4 pb-2">
          <ApprovalCard
            request={approval}
            onRespond={handleApprovalRespond}
            onYoloToggle={handleYoloToggle}
          />
        </div>
      )}

      {clarify && (
        <div className="px-4 pb-2">
          <ClarifyCard request={clarify} onRespond={handleClarifyRespond} />
        </div>
      )}

      <ComposerFooter onSend={handleSend} busy={busy} onCancel={handleCancel} />
    </div>
  );
}
