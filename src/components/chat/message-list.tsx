"use client";

import { useRef, useEffect } from "react";
import type { Message } from "@/types";
import { MessageBubble } from "./message-bubble";

interface MessageListProps {
  messages: Message[];
  onEdit?: (messageId: string, newContent: string) => void;
}

export function MessageList({ messages, onEdit }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} onEdit={onEdit} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
