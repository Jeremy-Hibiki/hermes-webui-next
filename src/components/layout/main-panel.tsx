"use client";

import { useAtom } from "jotai";
import { messagesAtom, busyAtom } from "@/atoms/chat";
import { ComposerFooter } from "./composer-footer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MarkdownRenderer } from "@/components/chat/markdown-renderer";

export function MainPanel() {
  const [messages] = useAtom(messagesAtom);
  const [busy] = useAtom(busyAtom);

  const handleSend = (message: string) => {
    // Will connect to useChatStream in Phase 4
    console.log("Send:", message);
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[var(--muted)]">
            <div className="text-center">
              <h2 className="text-2xl font-serif mb-2 text-[var(--text)]">Hermes</h2>
              <p className="text-sm">Start a conversation</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className="flex flex-col gap-2">
                <div className="text-xs font-medium text-[var(--muted)] capitalize">
                  {msg.role}
                </div>
                <div className="text-sm text-[var(--text)]">
                  <MarkdownRenderer content={msg.content} />
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <ComposerFooter onSend={handleSend} busy={busy} />
    </div>
  );
}
