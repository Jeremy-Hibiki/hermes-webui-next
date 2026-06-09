"use client";

import { useAtom } from "jotai";
import { messagesAtom, busyAtom } from "@/atoms/chat";
import { activeSessionAtom } from "@/atoms/session";
import { useChatStream } from "@/hooks/use-chat-stream";
import { ComposerFooter } from "./composer-footer";
import { MessageList } from "@/components/chat/message-list";
import { StreamingCursor } from "@/components/chat/streaming-cursor";
import { ScrollArea } from "@/components/ui/scroll-area";

export function MainPanel() {
  const [messages] = useAtom(messagesAtom);
  const [busy] = useAtom(busyAtom);
  const [activeSession] = useAtom(activeSessionAtom);

  const sessionId = activeSession?.id ?? "";
  const { send, cancel } = useChatStream(sessionId);

  const handleSend = (message: string, _attachments?: File[]) => {
    if (!sessionId) return;
    void send(message);
  };

  const handleCancel = () => {
    cancel();
  };

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

      <ComposerFooter onSend={handleSend} busy={busy} onCancel={handleCancel} />
    </div>
  );
}
