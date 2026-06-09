'use client';

import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Copy, Check, Pencil, RefreshCw } from 'lucide-react';
import type { Message } from '@/types';
import { MarkdownRenderer } from './markdown-renderer';
import { ToolCallCard } from './tool-call-card';
import { ThinkingCard } from './thinking-card';

interface MessageBubbleProps {
  message: Message;
  onEdit?: (messageId: string, newContent: string) => void;
  onRegenerate?: (messageId: string) => void;
  isLastAssistant?: boolean;
}

export function MessageBubble({ message, onEdit, onRegenerate, isLastAssistant }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  useEffect(() => {
    if (editing) editRef.current?.focus();
  }, [editing]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const submitEdit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== message.content) {
      onEdit?.(message.id, trimmed);
    }
    setEditing(false);
  };

  const handleEditKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitEdit();
    } else if (e.key === 'Escape') {
      setDraft(message.content);
      setEditing(false);
    }
  };

  return (
    <div className={cn('group flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
      <div className="text-xs font-medium text-[var(--muted)] capitalize">{message.role}</div>

      {message.reasoning && <ThinkingCard content={message.reasoning} />}

      <div className={cn('max-w-[85%] rounded-xl px-4 py-3', isUser ? 'bg-[var(--accent-bg)]' : 'bg-[var(--surface)]')}>
        {editing ? (
          <div className="space-y-2">
            <textarea
              aria-label="Edit message"
              ref={editRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleEditKeyDown}
              className="w-full bg-transparent text-sm text-[var(--text)] outline-none resize-none border border-[var(--border)] rounded-lg px-2 py-1 min-h-20"
              rows={3}
            />
            <div className="flex gap-1">
              <button
                onClick={submitEdit}
                className="text-xs px-2 py-1 rounded bg-[var(--accent)] text-white hover:opacity-90"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setDraft(message.content);
                  setEditing(false);
                }}
                className="text-xs px-2 py-1 rounded text-[var(--muted)] hover:text-[var(--text)]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : isAssistant ? (
          <div className="text-sm">
            <MarkdownRenderer content={message.content} />
          </div>
        ) : (
          <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        )}
      </div>

      <div className="flex items-center gap-1">
        {isAssistant && (
          <button
            onClick={handleCopy}
            aria-label="Copy message"
            className="p-1 text-[var(--muted)] hover:text-[var(--text)]"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}
        {isAssistant && isLastAssistant && onRegenerate && (
          <button
            onClick={() => onRegenerate(message.id)}
            aria-label="Regenerate response"
            className="p-1 text-[var(--muted)] hover:text-[var(--text)]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
        {isUser && onEdit && !editing && (
          <button
            onClick={() => setEditing(true)}
            aria-label="Edit message"
            className="p-1 text-[var(--muted)] hover:text-[var(--text)]"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {message.tool_calls?.map((tc) => (
        <ToolCallCard key={tc.id} toolCall={tc} />
      ))}
    </div>
  );
}
