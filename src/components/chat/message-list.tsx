"use client";

import { useRef, useEffect } from "react";
import type { Message } from "@/types";
import { MessageBubble } from "./message-bubble";

interface MessageListProps {
  messages: Message[];
  onEdit?: (messageId: string, newContent: string) => void;
  onRegenerate?: (messageId: string) => void;
}

export function MessageList({ messages, onEdit, onRegenerate }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const lastAssistantIdx = [...messages]
    .map((m, i) => (m.role === "assistant" ? i : -1))
    .filter((i) => i >= 0)
    .pop();

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {messages.map((msg, idx) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          onEdit={onEdit}
          onRegenerate={onRegenerate}
          isLastAssistant={idx === lastAssistantIdx}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
