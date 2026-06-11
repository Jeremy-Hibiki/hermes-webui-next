'use client';

import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/relative-time';
import type { Session } from '@/types';
import {
  Pin,
  MoreVertical,
  Pencil,
  PinOff,
  Archive,
  ArchiveRestore,
  Trash2,
  GitBranch,
  Copy,
  RefreshCw,
  Files,
  EyeOff,
  Square,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface SessionItemProps {
  session: Session;
  isActive: boolean;
  isUnread?: boolean;
  isStreaming?: boolean;
  queueCount?: number;
  onSelect: (sessionId: string) => void;
  onRename?: (sessionId: string, newTitle: string) => void;
  onPin?: (sessionId: string) => void;
  onArchive?: (sessionId: string) => void;
  onDelete?: (sessionId: string) => void;
  onDuplicate?: (sessionId: string) => void;
  onRegenerateTitle?: (sessionId: string) => void;
  onHide?: (sessionId: string) => void;
  onStop?: (sessionId: string) => void;
  highlightQuery?: string;
  projectColor?: string;
  matchType?: 'title' | 'content' | 'id';
  preview?: string;
}

export function SessionItem({
  session,
  isActive,
  isUnread,
  isStreaming,
  queueCount,
  onSelect,
  onRename,
  onPin,
  onArchive,
  onDelete,
  onDuplicate,
  onRegenerateTitle,
  onHide,
  onStop,
  highlightQuery,
  projectColor,
  matchType,
  preview,
}: SessionItemProps) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(session.title || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) inputRef.current?.focus();
  }, [renaming]);

  const submitRename = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== session.title) {
      onRename?.(session.session_id, trimmed);
    }
    setRenaming(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitRename();
    } else if (e.key === 'Escape') {
      setDraft(session.title || '');
      setRenaming(false);
    }
  };

  const startRename = () => setRenaming(true);
  const handlePin = () => onPin?.(session.session_id);
  const handleArchive = () => onArchive?.(session.session_id);
  const handleDelete = () => {
    if (window.confirm(`Delete "${session.title || 'New Chat'}"?`)) {
      onDelete?.(session.session_id);
    }
  };
  const handleDuplicate = () => onDuplicate?.(session.session_id);
  const handleRegenerateTitle = () => onRegenerateTitle?.(session.session_id);
  const handleHide = () => onHide?.(session.session_id);
  const handleStop = () => onStop?.(session.session_id);
  const handleCopyLink = () => {
    const url = `${window.location.origin}/chat?sid=${session.session_id}`;
    navigator.clipboard.writeText(url).catch(() => {});
  };

  const relativeTime = formatRelativeTime(session.last_message_at || session.updated_at || session.created_at);

  const titleText = session.title || 'New Chat';

  const highlightedTitle =
    highlightQuery && !renaming
      ? (() => {
          const idx = titleText.toLowerCase().indexOf(highlightQuery.toLowerCase());
          if (idx === -1) return titleText;
          return (
            <>
              {titleText.slice(0, idx)}
              <mark className="bg-[var(--accent-bg-strong,var(--accent-bg))] text-[var(--accent-text)] rounded-[3px] px-[1px]">
                {titleText.slice(idx, idx + highlightQuery.length)}
              </mark>
              {titleText.slice(idx + highlightQuery.length)}
            </>
          );
        })()
      : titleText;

  const titleRow = renaming ? (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={submitRename}
      onKeyDown={handleKeyDown}
      onClick={(e) => e.stopPropagation()}
      aria-label="Rename session"
      className="flex-1 bg-[var(--surface)] border border-[var(--accent)] rounded-md text-[13px] text-[var(--text)] px-2 py-0.5 outline-none min-w-0 shadow-[0_0_0_2px_var(--accent-bg-strong)]"
    />
  ) : (
    <span className={cn('flex-1 overflow-hidden text-ellipsis whitespace-nowrap select-none', isStreaming ? 'text-[var(--accent)]' : 'text-[var(--text)]')}>
      {highlightedTitle}
    </span>
  );

  const metaLine =
    (session.message_count > 0 || matchType === 'id') && !renaming ? (
      <div className="text-[11px] text-[var(--muted)] overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-2">
        {matchType === 'id' && <span className="text-[var(--accent)] font-medium">ID match</span>}
        {session.message_count > 0 && <span>{session.message_count} messages</span>}
      </div>
    ) : null;

  const previewLine =
    matchType === 'content' && preview && !renaming ? (
      <div className="text-[11px] text-[var(--muted)] overflow-hidden text-ellipsis whitespace-nowrap">
        {highlightQuery && preview.toLowerCase().includes(highlightQuery.toLowerCase())
          ? (() => {
              const text = preview;
              const ql = highlightQuery.toLowerCase();
              const idx = text.toLowerCase().indexOf(ql);
              if (idx === -1) return text;
              return (
                <>
                  {text.slice(0, idx)}
                  <mark className="bg-[var(--accent-bg-strong,var(--accent-bg))] text-[var(--accent-text)] rounded-[3px] px-[1px]">
                    {text.slice(idx, idx + highlightQuery.length)}
                  </mark>
                  {text.slice(idx + highlightQuery.length)}
                </>
              );
            })()
          : preview}
      </div>
    ) : null;

  const pinIcon = session.pinned && (
    <span className="shrink-0 w-[10px] h-[10px] text-[var(--accent)] inline-flex items-center justify-center leading-none">
      <Pin className="w-[10px] h-[10px]" />
    </span>
  );

  const sourceIcon = (() => {
    const src = session.raw_source || session.session_source;
    const tag = session.source_tag;
    if (src === 'cli' || session.is_cli_session || tag === 'claude-code' || tag === 'codex')
      return (
        <span className="shrink-0 text-[9px] leading-none font-semibold uppercase px-1.5 py-[1px] rounded bg-orange-500/15 text-orange-500">
          CLI
        </span>
      );
    if (src === 'cron' || tag === 'cron')
      return (
        <span className="shrink-0 text-[9px] leading-none font-semibold uppercase px-1.5 py-[1px] rounded bg-blue-500/15 text-blue-500">
          CRON
        </span>
      );
    if (src === 'api' || tag === 'api')
      return (
        <span className="shrink-0 text-[9px] leading-none font-semibold uppercase px-1.5 py-[1px] rounded bg-purple-500/15 text-purple-500">
          API
        </span>
      );
    return null;
  })();

  // Attention state from session data
  const attention = session.attention as { kind?: string; count?: number; severity?: string } | undefined;
  const attentionKind = attention?.kind === 'approval' ? 'approval' : attention?.kind === 'clarify' ? 'clarify' : null;
  const attentionCount = Math.max(1, Number(attention?.count) || 0);
  const needsAttention = !!attentionKind && attentionCount > 0;

  const indicators = (
    <>
      {projectColor && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: projectColor }} />}
      {session.parent_session_id && <GitBranch className="w-3 h-3 shrink-0 text-[var(--muted)]" />}
      {session.worktree_path && <GitBranch className="w-3 h-3 shrink-0 text-orange-500" />}
      {sourceIcon}
      {isStreaming && (
        <span className="session-streaming-dot w-2 h-2 rounded-full shrink-0 border-[1.5px] border-[var(--accent)] border-t-transparent" />
      )}
      {!isStreaming && isUnread && <span className="w-2 h-2 rounded-full shrink-0 bg-[var(--accent)]" />}
      {needsAttention && !isActive && (
        <span
          className={cn(
            'shrink-0 text-[9px] leading-none font-medium px-1.5 py-[2px] rounded-full',
            attentionKind === 'approval'
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              : 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
          )}
          data-tooltip={attentionKind === 'approval' ? 'Waiting for approval' : 'Waiting for answer'}
        >
          {attentionCount > 1 ? attentionCount : ''}
          {attentionKind === 'approval' ? '!' : '?'}
        </span>
      )}
      {queueCount != null && queueCount > 0 && (
        <span className="shrink-0 text-[9px] leading-none font-medium px-1.5 py-[2px] rounded-full bg-[var(--accent-bg)] text-[var(--accent-text)]">
          {queueCount}
        </span>
      )}
    </>
  );

  const hasActions = onRename || onPin || onArchive || onDelete;

  const baseClasses = cn(
    'w-full text-left px-2 py-2 mb-0.5 rounded-lg text-[13px] cursor-pointer transition-colors flex items-start gap-2 min-w-0 relative select-none group',
    isActive
      ? 'active bg-[var(--accent-bg)] text-[var(--accent-text)]'
      : isUnread || needsAttention
        ? 'text-[var(--text)] font-medium hover:bg-[var(--hover-bg)]'
        : 'text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text)]',
    session.archived && 'opacity-50 italic',
    needsAttention && !isActive && attentionKind === 'approval' && 'shadow-[inset_3px_0_0_var(--error)]',
    needsAttention && !isActive && attentionKind === 'clarify' && 'shadow-[inset_3px_0_0_var(--warning)]',
  );

  // Hide timestamp when indicators are showing (streaming/unread/attention)
  const hideTime = isStreaming || isUnread || needsAttention;

  const innerContent = (
    <div className="flex-1 min-w-0 flex flex-col gap-0.5 overflow-hidden">
      <div className="flex items-center gap-1.5 min-w-0">
        {pinIcon}
        {titleRow}
        {!renaming && !hideTime && relativeTime && (
          <span className="session-time text-[10px] text-[var(--muted)] shrink-0 ml-auto group-hover:opacity-0 transition-opacity">
            {relativeTime}
          </span>
        )}
        {indicators}
      </div>
      {metaLine}
      {previewLine}
    </div>
  );

  if (!hasActions) {
    return (
      <button onClick={() => onSelect(session.session_id)} className={baseClasses}>
        {innerContent}
      </button>
    );
  }

  const isExternalSession = session.is_cli_session || session.session_source === 'cli' || session.source_tag === 'claude-code' || session.source_tag === 'codex';
  const isSessionStreaming = !!session.active_stream_id || !!session.is_streaming;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !renaming && onSelect(session.session_id)}
      onDoubleClick={() => !renaming && startRename()}
      onContextMenu={(_e) => {
        // Right-click opens dropdown at cursor (handled by DropdownMenu)
      }}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !renaming) {
          e.preventDefault();
          onSelect(session.session_id);
        }
      }}
      className={baseClasses}
    >
      {innerContent}
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            'absolute right-1.5 top-1/2 -translate-y-1/2 shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity w-[26px] h-[26px] rounded-lg inline-flex items-center justify-center text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text)] outline-none',
            isActive && 'opacity-100',
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="w-4 h-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="right" sideOffset={4}>
          {isSessionStreaming && onStop && (
            <DropdownMenuItem onClick={handleStop}>
              <Square className="size-4" />
              Stop Response
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={startRename}>
            <Pencil className="size-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePin}>
            {session.pinned ? (
              <>
                <PinOff className="size-4" />
                Unpin
              </>
            ) : (
              <>
                <Pin className="size-4" />
                Pin
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleArchive}>
            {session.archived ? (
              <>
                <ArchiveRestore className="size-4" />
                Unarchive
              </>
            ) : (
              <>
                <Archive className="size-4" />
                Archive
              </>
            )}
          </DropdownMenuItem>
          {isExternalSession && onHide && (
            <DropdownMenuItem onClick={handleHide}>
              <EyeOff className="size-4" />
              Hide from sidebar
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDuplicate}>
            <Files className="size-4" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleRegenerateTitle}>
            <RefreshCw className="size-4" />
            Regenerate Title
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyLink}>
            <Copy className="size-4" />
            Copy Link
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
