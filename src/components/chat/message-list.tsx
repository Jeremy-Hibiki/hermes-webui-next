'use client';

import { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { useAtom } from 'jotai';
import { messagesAtom, busyAtom, composerAppendAtom } from '@/atoms/chat';
import { MessageBubble } from './message-bubble';
import { Reply } from 'lucide-react';
import { toast } from '@/components/ui/toast';

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
  const [, setComposerAppend] = useAtom(composerAppendAtom);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectionBtn, setSelectionBtn] = useState<{ text: string; x: number; y: number } | null>(null);

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
      if (isAssistantLike && !prevIsAssistantLike) {
        map.add(i);
      }
    }
    return map;
  }, [messages]);

  // Build a map: assistant message index → corresponding user question index
  // The "question" is the user message immediately preceding this assistant turn
  const questionJumpMap = useMemo(() => {
    const map = new Map<number, number>();
    let lastUserIdx = -1;
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].role === 'user') {
        lastUserIdx = i;
      } else if (messages[i].role === 'assistant' && lastUserIdx >= 0) {
        map.set(i, lastUserIdx);
      }
    }
    return map;
  }, [messages]);

  const handleDelete = (messageId: string) => {
    setMessages((prev) => prev.filter((m) => (m.id ?? '') !== messageId));
  };

  const handleJumpToQuestion = useCallback((targetIdx: number) => {
    const el = document.querySelector(`[data-msg-idx="${targetIdx}"]`);
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      // Brief highlight pulse
      el.classList.add('msg-question-highlight');
      setTimeout(() => el.classList.remove('msg-question-highlight'), 1800);
    }
  }, []);

  // Text selection reply button
  const updateSelectionButton = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      setSelectionBtn(null);
      return;
    }
    const text = sel.toString().trim();
    if (!text) {
      setSelectionBtn(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!containerRef.current?.contains(range.commonAncestorContainer)) {
      setSelectionBtn(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    setSelectionBtn({
      text,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', updateSelectionButton);
    document.addEventListener('mouseup', updateSelectionButton);
    return () => {
      document.removeEventListener('selectionchange', updateSelectionButton);
      document.removeEventListener('mouseup', updateSelectionButton);
    };
  }, [updateSelectionButton]);

  const handleReplyWithSelection = useCallback(() => {
    if (!selectionBtn?.text) return;
    const quoted = selectionBtn.text
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n');
    setComposerAppend(quoted + '\n');
    setSelectionBtn(null);
    window.getSelection()?.removeAllRanges();
    toast('Selected text added to composer');
  }, [selectionBtn, setComposerAppend]);

  return (
    <div className="flex flex-col">
      <div ref={containerRef} className="messages-inner mx-auto w-full px-6 pt-5 pb-8 flex flex-col">
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
            msgIdx={idx}
            questionJumpIdx={questionJumpMap.get(idx)}
            onJumpToQuestion={handleJumpToQuestion}
          />
        ))}
      </div>

      {/* Text selection reply button */}
      {selectionBtn && (
        <button
          onClick={handleReplyWithSelection}
          className="selected-text-reply-btn fixed z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface)] border-2 border-[var(--accent)] text-[12px] font-bold text-[var(--text)] shadow-[0_8px_24px_rgba(0,0,0,.26),0_0_0_1px_var(--surface)] hover:bg-[var(--accent-bg)] hover:text-[var(--accent-text)] transition-all pointer-events-auto select-none"
          style={{
            left: `${selectionBtn.x}px`,
            top: `${selectionBtn.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <Reply className="w-3 h-3" />
          Reply with selection
        </button>
      )}
    </div>
  );
}
