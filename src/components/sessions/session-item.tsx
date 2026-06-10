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
  Terminal as TerminalIcon,
  Globe,
  Zap,
  Copy,
  RefreshCw,
  Files,
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
  onSelect: (sessionId: string) => void;
  onRename?: (sessionId: string, newTitle: string) => void;
  onPin?: (sessionId: string) => void;
  onArchive?: (sessionId: string) => void;
  onDelete?: (sessionId: string) => void;
  onDuplicate?: (sessionId: string) => void;
  onRegenerateTitle?: (sessionId: string) => void;
  highlightQuery?: string;
  projectColor?: string;
}

export function SessionItem({
  session,
  isActive,
  isUnread,
  isStreaming,
  onSelect,
  onRename,
  onPin,
  onArchive,
  onDelete,
  onDuplicate,
  onRegenerateTitle,
  highlightQuery,
  projectColor,
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
    <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[var(--text)] select-none">
      {highlightedTitle}
    </span>
  );

  const metaLine =
    (session.message_count > 0 || relativeTime) && !renaming ? (
      <div className="text-[11px] text-[var(--muted)] overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-2">
        {session.message_count > 0 && <span>{session.message_count} messages</span>}
        {relativeTime && <span>{relativeTime}</span>}
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
      return <TerminalIcon className="w-3 h-3 shrink-0 text-orange-400" />;
    if (src === 'cron' || tag === 'cron') return <Zap className="w-3 h-3 shrink-0 text-blue-400" />;
    if (src === 'api' || tag === 'api') return <Globe className="w-3 h-3 shrink-0 text-purple-400" />;
    return null;
  })();

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
    </>
  );

  const hasActions = onRename || onPin || onArchive || onDelete;

  const baseClasses = cn(
    'w-full text-left px-2 py-2 mb-0.5 rounded-lg text-[13px] cursor-pointer transition-colors flex items-start gap-2 min-w-0 relative select-none group',
    isActive
      ? 'active bg-[var(--accent-bg)] text-[var(--accent)]'
      : 'text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text)]',
  );

  const innerContent = (
    <div className="flex-1 min-w-0 flex flex-col gap-0.5 overflow-hidden">
      <div className="flex items-center gap-1.5 min-w-0">
        {pinIcon}
        {titleRow}
        {indicators}
      </div>
      {metaLine}
    </div>
  );

  if (!hasActions) {
    return (
      <button onClick={() => onSelect(session.session_id)} className={baseClasses}>
        {innerContent}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => !renaming && onSelect(session.session_id)}
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
    </button>
  );
}
