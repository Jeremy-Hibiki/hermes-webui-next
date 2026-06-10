'use client';

import { useRef, useEffect } from 'react';
import { useAtom } from 'jotai';
import { messagesAtom } from '@/atoms/chat';
import { MessageBubble } from './message-bubble';

interface MessageListProps {
  onEdit?: (messageId: string, newContent: string) => void;
  onRegenerate?: (messageId: string) => void;
  onFork?: (messageId: string) => void;
}

export function MessageList({ onEdit, onRegenerate, onFork }: MessageListProps) {
  const [messages, setMessages] = useAtom(messagesAtom);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const lastAssistantIdx = [...messages]
    .map((m, i) => (m.role === 'assistant' ? i : -1))
    .filter((i) => i >= 0)
    .pop();

  const handleDelete = (messageId: string) => {
    setMessages((prev) => prev.filter((m) => (m.id ?? '') !== messageId));
  };

  return (
    <div className="flex flex-col">
      <div className="messages-inner mx-auto w-full max-w-[var(--msg-max,780px)] px-6 pt-5 pb-8 flex flex-col">
        {messages.map((msg, idx) => (
          <MessageBubble
            key={msg.id ?? idx}
            message={msg}
            onEdit={onEdit}
            onRegenerate={onRegenerate}
            onFork={onFork}
            onDelete={handleDelete}
            isLastAssistant={idx === lastAssistantIdx}
            prevMessage={idx > 0 ? messages[idx - 1] : null}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
