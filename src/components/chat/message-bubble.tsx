'use client';

import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Copy, Check, Pencil, RefreshCw, GitFork, Trash2, FileText, X, Undo2 } from 'lucide-react';
import NextImage from 'next/image';
import type { Message } from '@/types';
import { useTranslation } from '@/lib/i18n';
import { extractTextContent, type Attachment } from '@/types/message';
import { MarkdownRenderer } from './markdown-renderer';
import { ToolCallCard } from './tool-call-card';
import { ThinkingCard } from './thinking-card';

interface MessageBubbleProps {
  message: Message;
  onEdit?: (messageId: string, newContent: string) => void;
  onRegenerate?: (messageId: string) => void;
  onFork?: (messageId: string) => void;
  onUndoExchange?: () => void;
  onDelete?: (messageId: string) => void;
  isLastAssistant?: boolean;
  prevMessage?: Message | null;
  isGroupLeader?: boolean;
  busy?: boolean;
}

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center cursor-zoom-out"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </button>
      <NextImage
        src={src}
        alt={alt}
        width={1200}
        height={800}
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

function AttachmentTray({ attachments }: { attachments: Attachment[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (!attachments.length) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-1.5 mb-1">
        {attachments.map((a, i) =>
          a.is_image ? (
            <button
              key={i}
              className="relative rounded-lg overflow-hidden border border-[var(--border)] hover:border-[var(--accent)] transition-colors cursor-zoom-in"
              onClick={() => setLightbox(a.path)}
            >
              <NextImage
                src={a.path}
                alt={a.name}
                width={200}
                height={150}
                className="max-w-[200px] max-h-[150px] object-cover"
              />
            </button>
          ) : (
            <a
              key={i}
              href={a.path}
              download={a.name}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--border)] text-[11px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover-bg)] transition-colors"
            >
              <FileText className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[120px]">{a.name}</span>
              {a.size != null && <span className="text-[10px] opacity-60">{(a.size / 1024).toFixed(1)}k</span>}
            </a>
          ),
        )}
      </div>
      {lightbox && <ImageLightbox src={lightbox} alt="" onClose={() => setLightbox(null)} />}
    </>
  );
}

function TurnUsageFooter({ message }: { message: Message }) {
  const usage = message._turnUsage;
  const duration = message._turnDuration;
  const gateway = message._gatewayRouting;
  const model = message._effectiveModel;

  if (!usage && duration == null && !gateway) return null;

  const parts: React.ReactNode[] = [];

  if (model) {
    parts.push(
      <span key="model" className="msg-gateway-inline">
        {model}
      </span>,
    );
  }

  if (duration != null) {
    parts.push(
      <span key="dur" className="msg-duration-inline">
        Done in {duration < 1 ? duration.toFixed(1) : duration.toFixed(0)}s
      </span>,
    );
  }

  if (usage) {
    const usageParts: string[] = [];
    if (usage.input_tokens) usageParts.push(`${usage.input_tokens.toLocaleString()} in`);
    if (usage.output_tokens) usageParts.push(`${usage.output_tokens.toLocaleString()} out`);
    if (usage.estimated_cost) usageParts.push(`~$${usage.estimated_cost.toFixed(4)}`);
    if (usage.cache_hit_percent != null) usageParts.push(`${usage.cache_hit_percent.toFixed(0)}% cache`);
    if (usageParts.length > 0) {
      parts.push(
        <span key="usage" className="msg-usage-inline">
          {usageParts.join(' · ')}
        </span>,
      );
    }
  }

  if (gateway) {
    parts.push(
      <span key="gw" className="msg-gateway-inline">
        {gateway}
      </span>,
    );
  }

  if (parts.length === 0) return null;

  return <span className="flex items-center gap-2 flex-wrap">{parts}</span>;
}

export function MessageBubble({
  message,
  onEdit,
  onRegenerate,
  onFork,
  onUndoExchange,
  onDelete,
  isLastAssistant,
  prevMessage,
  isGroupLeader = true,
  busy,
}: MessageBubbleProps) {
  const { t: t18n } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const textContent = extractTextContent(message.content);
  // Strip DeepSeek XML function call blocks and other tool-use XML
  // Rewrite session:// links to navigable URLs
  const cleanedContent = textContent
    .replace(/<function_calls>[\s\S]*?<\/function_calls>/g, '')
    .replace(/<antThinking>[\s\S]*?<\/antThinking>/g, '')
    .replace(/<tool_call[\s\S]*?<\/tool_call>/g, '')
    .replace(/\bsession:\/\/([a-zA-Z0-9_-]+)/g, `${window.location.origin}/chat?sid=$1`)
    .replace(/\bworkspace:\/\/([^\s<>"')\]]+)/g, '$1')
    .trim();
  const [draft, setDraft] = useState(textContent);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isToolError = message.role === 'tool' || (message as { _error?: boolean })._error;
  const reasoning = message.reasoning || message.reasoning_content || message.thinking;
  const hasUsage = !!(message._turnUsage || message._turnDuration != null || message._gatewayRouting);

  useEffect(() => {
    if (editing) editRef.current?.focus();
  }, [editing]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const submitEdit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== textContent) {
      onEdit?.(message.id ?? '', trimmed);
    }
    setEditing(false);
  };

  const handleEditKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitEdit();
    } else if (e.key === 'Escape') {
      setDraft(textContent);
      setEditing(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Delete this message?')) {
      onDelete?.(message.id ?? '');
    }
  };

  const ts = (() => {
    const raw = message.timestamp ?? message._ts;
    if (raw == null) return null;
    const ms = typeof raw === 'number' ? (raw > 1e12 ? raw : raw * 1000) : new Date(raw).getTime();
    return Number.isFinite(ms) ? new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
  })();

  const showDaySep = (() => {
    if (!prevMessage || !ts) return false;
    const raw = message.timestamp ?? message._ts;
    const prevRaw = prevMessage.timestamp ?? prevMessage._ts;
    if (raw == null || prevRaw == null) return false;
    const d1 = new Date(typeof raw === 'number' ? (raw > 1e12 ? raw : raw * 1000) : raw);
    const d2 = new Date(typeof prevRaw === 'number' ? (prevRaw > 1e12 ? prevRaw : prevRaw * 1000) : prevRaw);
    return d1.toDateString() !== d2.toDateString();
  })();

  const dayLabel = (() => {
    if (!showDaySep) return null;
    const raw = message.timestamp ?? message._ts;
    if (raw == null) return null;
    const d = new Date(typeof raw === 'number' ? (raw > 1e12 ? raw : raw * 1000) : raw);
    return d.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });
  })();

  return (
    <>
      {showDaySep && dayLabel && (
        <div className="flex items-center gap-2.5 my-[22px] mb-[10px]">
          <div className="flex-1 h-px bg-[var(--border)]" />
          <span className="text-[10px] text-[var(--muted)] font-semibold uppercase tracking-[.12em] opacity-55 whitespace-nowrap">
            {dayLabel}
          </span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>
      )}

      <article
        className={cn('msg-row group py-2.5', isUser ? 'self-end' : 'w-full', isToolError && 'border rounded-lg p-3')}
        style={isAssistant ? { paddingLeft: 'var(--msg-rail, 0px)' } : undefined}
        data-role={message.role}
        aria-label={`${message.role} message`}
      >
        {/* Assistant role header - only shown for group leader */}
        {isAssistant && isGroupLeader && (
          <div className="msg-role flex items-center gap-2 text-[12px] font-medium mb-2 opacity-80 hover:opacity-100 transition-opacity">
            <div className="role-icon w-[22px] h-[22px] rounded-full bg-[var(--accent-bg)] flex items-center justify-center text-[10px] font-bold text-[var(--accent)] shrink-0">
              H
            </div>
            <span className="text-[var(--accent-text)] text-[12px]">Hermes</span>
            {message._turnTps != null && message._turnTps > 0 && (
              <span
                className="inline-flex items-center ml-0.5 px-1.5 py-[1px] border border-[var(--border)] rounded-full text-[var(--muted)] bg-[var(--surface)] text-[10.5px] font-medium"
                style={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1.4 }}
                title="Tokens per second"
              >
                {message._turnTps.toFixed(1)} t/s
              </span>
            )}
          </div>
        )}

        {reasoning && <ThinkingCard content={reasoning} />}

        <div
          className={cn(
            'msg-body overflow-wrap-anywhere',
            isUser &&
              'bg-[var(--user-bubble-bg)] border border-[var(--user-bubble-border)] rounded-[14px] px-4 py-3 max-w-none text-[var(--user-bubble-text,var(--text))]',
            isAssistant && 'text-[var(--text)] pt-2',
            isToolError && 'bg-[rgba(239,83,80,.06)] border-[rgba(239,83,80,.3)] text-[var(--error)]',
          )}
        >
          {/* Inline attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <AttachmentTray attachments={message.attachments} />
          )}

          {editing ? (
            <div className="space-y-2">
              <textarea
                aria-label={t18n('chat.edit')}
                ref={editRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleEditKeyDown}
                className="w-full bg-[rgba(255,255,255,.05)] text-sm text-[var(--user-bubble-text,var(--text))] outline-none resize-none border border-[var(--accent-bg)] rounded-[8px] px-3 py-2.5 min-h-[60px] placeholder:text-[var(--user-bubble-placeholder,var(--muted))]"
                rows={3}
              />
              <div className="flex gap-1 justify-end">
                <button
                  onClick={submitEdit}
                  className="text-xs px-2.5 py-1 rounded-md bg-[var(--accent)] text-white hover:opacity-90"
                >
                  {t18n('common.save')}
                </button>
                <button
                  onClick={() => {
                    setDraft(textContent);
                    setEditing(false);
                  }}
                  className="text-xs px-2.5 py-1 rounded-md text-[var(--muted)] hover:text-[var(--text)]"
                >
                  {t18n('common.cancel')}
                </button>
              </div>
            </div>
          ) : isAssistant ? (
            message._isStreaming ? (
              <div className="stream-fade-active">
                {message._streamingHtml ? (
                  <span dangerouslySetInnerHTML={{ __html: message._streamingHtml }} />
                ) : (
                  <MarkdownRenderer content={cleanedContent} />
                )}
                <span className="hermes-cursor-blink" />
              </div>
            ) : (
              <MarkdownRenderer content={cleanedContent} />
            )
          ) : (
            <div className="whitespace-pre-wrap">{textContent}</div>
          )}
        </div>

        {/* Tool calls */}
        {message.tool_calls && message.tool_calls.length > 0 && (
          <div style={isAssistant ? { paddingLeft: 'var(--msg-rail, 0px)' } : undefined}>
            {message.tool_calls.map((tc) => (
              <ToolCallCard key={tc.id ?? tc.name} toolCall={tc} />
            ))}
          </div>
        )}

        {/* Footer: timestamp + usage + actions */}
        <div
          className={cn(
            'msg-foot flex items-center gap-1.5 mt-1 text-[11px] text-[var(--muted)] transition-opacity',
            isUser ? 'justify-end' : 'justify-start',
            isAssistant && 'pl-[var(--msg-rail,0px)]',
            hasUsage ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
        >
          <TurnUsageFooter message={message} />
          {ts && <span className="msg-time text-[10.5px] opacity-75">{ts}</span>}
          <span className="msg-actions flex items-center gap-0.5">
            {isUser && onEdit && !editing && (
              <button
                onClick={() => setEditing(true)}
                aria-label={t18n('chat.edit')}
                disabled={busy}
                className={cn(
                  'msg-action-btn p-[2px_5px] rounded-[5px] hover:text-[var(--accent-text)] hover:bg-[var(--accent-bg)] transition-colors',
                  busy && 'opacity-30 cursor-not-allowed pointer-events-none',
                )}
              >
                <Pencil className="w-[13px] h-[13px]" />
              </button>
            )}
            {onFork && (
              <button
                onClick={() => onFork(message.id ?? '')}
                aria-label={t18n('chat.fork')}
                className="msg-action-btn p-[2px_5px] rounded-[5px] hover:text-[var(--accent-text)] hover:bg-[var(--accent-bg)] transition-colors"
              >
                <GitFork className="w-[13px] h-[13px]" />
              </button>
            )}
            <button
              onClick={handleCopy}
              aria-label={t18n('chat.copy')}
              className="msg-action-btn p-[2px_5px] rounded-[5px] hover:text-[var(--accent-text)] hover:bg-[var(--accent-bg)] transition-colors"
            >
              {copied ? <Check className="w-[13px] h-[13px]" /> : <Copy className="w-[13px] h-[13px]" />}
            </button>
            {isAssistant && isLastAssistant && onRegenerate && (
              <button
                onClick={() => onRegenerate(message.id ?? '')}
                aria-label={t18n('chat.regenerate')}
                className="msg-action-btn p-[2px_5px] rounded-[5px] hover:text-[var(--accent-text)] hover:bg-[var(--accent-bg)] transition-colors"
              >
                <RefreshCw className="w-[13px] h-[13px]" />
              </button>
            )}
            {isAssistant && isLastAssistant && onUndoExchange && (
              <button
                onClick={onUndoExchange}
                aria-label="Undo exchange"
                className="msg-action-btn p-[2px_5px] rounded-[5px] hover:text-[var(--accent-text)] hover:bg-[var(--accent-bg)] transition-colors"
              >
                <Undo2 className="w-[13px] h-[13px]" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDelete}
                aria-label="Delete message"
                className="msg-action-btn p-[2px_5px] rounded-[5px] hover:text-[var(--accent-text)] hover:bg-[var(--accent-bg)] transition-colors"
              >
                <Trash2 className="w-[13px] h-[13px]" />
              </button>
            )}
          </span>
        </div>
      </article>

      <style jsx>{`
        .msg-usage-inline,
        .msg-duration-inline,
        .msg-gateway-inline {
          font-size: 11px;
          color: var(--muted);
          opacity: 0.7;
          flex: 0 0 auto;
          font-variant-numeric: tabular-nums;
        }
      `}</style>
    </>
  );
}
