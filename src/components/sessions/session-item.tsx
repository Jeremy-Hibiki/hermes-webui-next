"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/relative-time";
import type { Session } from "@/types";
import {
  Pin,
  MessageSquare,
  MoreVertical,
  Pencil,
  PinOff,
  Archive,
  ArchiveRestore,
  Trash2,
  GitBranch,
  Terminal,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface SessionItemProps {
  session: Session;
  isActive: boolean;
  onSelect: (sessionId: string) => void;
  onRename?: (sessionId: string, newTitle: string) => void;
  onPin?: (sessionId: string) => void;
  onArchive?: (sessionId: string) => void;
  onDelete?: (sessionId: string) => void;
  projectColor?: string;
}

export function SessionItem({
  session,
  isActive,
  onSelect,
  onRename,
  onPin,
  onArchive,
  onDelete,
  projectColor,
}: SessionItemProps) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(session.title || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) inputRef.current?.focus();
  }, [renaming]);

  const submitRename = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== session.title) {
      onRename?.(session.id, trimmed);
    }
    setRenaming(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitRename();
    } else if (e.key === "Escape") {
      setDraft(session.title || "");
      setRenaming(false);
    }
  };

  const startRename = () => setRenaming(true);

  const handlePin = () => onPin?.(session.id);

  const handleArchive = () => onArchive?.(session.id);

  const handleDelete = () => {
    if (window.confirm(`Delete "${session.title || "New Chat"}"?`)) {
      onDelete?.(session.id);
    }
  };

  const titleContent = renaming ? (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={submitRename}
      onKeyDown={handleKeyDown}
      onClick={(e) => e.stopPropagation()}
      className="w-full bg-transparent border-none outline-none text-sm text-[var(--text)] px-0 py-0"
    />
  ) : (
    <span className="truncate flex-1">{session.title || "New Chat"}</span>
  );

  const relativeTime = formatRelativeTime(
    session.last_message_at || session.updated_at || session.created_at,
  );

  const indicators = (
    <>
      {projectColor && (
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: projectColor }} />
      )}
      {session.parent_id && <GitBranch className="w-3 h-3 shrink-0 text-[var(--muted)]" />}
      {session.worktree_path && <GitBranch className="w-3 h-3 shrink-0 text-orange-500" />}
      {session.source === "cli" && <Terminal className="w-3 h-3 shrink-0 text-[var(--muted)]" />}
      {session.pinned && <Pin className="w-3 h-3 shrink-0 text-[var(--accent)]" />}
      {session.message_count > 0 && (
        <span className="text-xs text-[var(--muted)]">{session.message_count}</span>
      )}
      {relativeTime && (
        <span className="text-xs text-[var(--muted)] ml-auto shrink-0">{relativeTime}</span>
      )}
    </>
  );

  const hasActions = onRename || onPin || onArchive || onDelete;

  // Simple button when no action handlers (backward compatible)
  if (!hasActions) {
    return (
      <button
        onClick={() => onSelect(session.id)}
        className={cn(
          "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2",
          isActive
            ? "active bg-[var(--accent-bg-strong)] text-[var(--text)]"
            : "text-[var(--text)] hover:bg-[var(--hover-bg)]",
        )}
      >
        <MessageSquare className="w-3.5 h-3.5 shrink-0 text-[var(--muted)]" />
        {titleContent}
        {indicators}
      </button>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          onClick={() => !renaming && onSelect(session.id)}
          className={cn(
            "group w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2",
            isActive
              ? "active bg-[var(--accent-bg-strong)] text-[var(--text)]"
              : "text-[var(--text)] hover:bg-[var(--hover-bg)]",
          )}
        >
          <MessageSquare className="w-3.5 h-3.5 shrink-0 text-[var(--muted)]" />
          {titleContent}
          {indicators}
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className={cn(
              "shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-[var(--hover-bg)]",
              isActive && "opacity-100",
            )}
            aria-label="Session actions"
          >
            <MoreVertical className="w-3.5 h-3.5 text-[var(--muted)]" />
          </span>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={startRename}>
          <Pencil className="size-4" />
          Rename
        </ContextMenuItem>

        <ContextMenuItem onClick={handlePin}>
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
        </ContextMenuItem>

        <ContextMenuItem onClick={handleArchive}>
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
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem variant="destructive" onClick={handleDelete}>
          <Trash2 className="size-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
