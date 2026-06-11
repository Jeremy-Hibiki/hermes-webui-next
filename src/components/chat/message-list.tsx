'use client';

import { useMemo } from 'react';
import { useAtom } from 'jotai';
import { messagesAtom, busyAtom } from '@/atoms/chat';
import { MessageBubble } from './message-bubble';

interface MessageListProps {
  onEdit?: (messageId: string, newContent: string) => void;
  onRegenerate?: (messageId: string) => void;
  onFork?: (messageId: string) => void;
  onUndoExchange?: () => void;
  hasOlderMessages?: boolean;
  onLoadOlder?: () => void;
  isLoadingOlder?: boolean;
}

export function MessageList({
  onEdit,
  onRegenerate,
  onFork,
  onUndoExchange,
  hasOlderMessages,
  onLoadOlder,
  isLoadingOlder,
}: MessageListProps) {
  const [messages, setMessages] = useAtom(messagesAtom);
  const [busy] = useAtom(busyAtom);

  const lastAssistantIdx = [...messages]
    .map((m, i) => (m.role === 'assistant' ? i : -1))
    .filter((i) => i >= 0)
    .pop();

  // Determine which messages are part of a consecutive assistant/tool group
  // so only the first one in the group shows the avatar/role header
  const groupLeaderMap = useMemo(() => {
    const map = new Set<number>();
    for (let i = 0; i < messages.length; i++) {
      const prev = messages[i - 1];
      const curr = messages[i];
      const isAssistantLike = curr.role === 'assistant' || curr.role === 'tool';
      const prevIsAssistantLike = prev && (prev.role === 'assistant' || prev.role === 'tool');
      // First message in group, or first assistant after non-assistant
      if (isAssistantLike && !prevIsAssistantLike) {
        map.add(i);
      }
    }
    return map;
  }, [messages]);

  const handleDelete = (messageId: string) => {
    setMessages((prev) => prev.filter((m) => (m.id ?? '') !== messageId));
  };

  return (
    <div className="flex flex-col">
      <div className="messages-inner mx-auto w-full px-6 pt-5 pb-8 flex flex-col">
        {hasOlderMessages && (
          <button
            onClick={onLoadOlder}
            disabled={isLoadingOlder}
            className="self-center text-[11px] text-[var(--muted)] hover:text-[var(--text)] px-3 py-1.5 rounded-full border border-[var(--border)] hover:bg-[var(--hover-bg)] transition-colors mb-3 disabled:opacity-50"
          >
            {isLoadingOlder ? 'Loading…' : 'Load earlier messages'}
          </button>
        )}
        {messages.map((msg, idx) => (
          <MessageBubble
            key={msg.id ?? idx}
            message={msg}
            onEdit={onEdit}
            onRegenerate={onRegenerate}
            onFork={onFork}
            onUndoExchange={onUndoExchange}
            onDelete={handleDelete}
            isLastAssistant={idx === lastAssistantIdx}
            prevMessage={idx > 0 ? messages[idx - 1] : null}
            isGroupLeader={groupLeaderMap.has(idx)}
            busy={busy}
          />
        ))}
      </div>
    </div>
  );
}
