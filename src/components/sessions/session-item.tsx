"use client";

import { cn } from "@/lib/utils";
import type { Session } from "@/types";
import { Pin, MessageSquare } from "lucide-react";

interface SessionItemProps {
  session: Session;
  isActive: boolean;
  onSelect: (sessionId: string) => void;
}

export function SessionItem({ session, isActive, onSelect }: SessionItemProps) {
  return (
    <button
      onClick={() => onSelect(session.id)}
      className={cn(
        "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2",
        isActive
          ? "active bg-[var(--accent-bg-strong)] text-[var(--text)]"
          : "text-[var(--text)] hover:bg-[var(--hover-bg)]"
      )}
    >
      <MessageSquare className="w-3.5 h-3.5 shrink-0 text-[var(--muted)]" />
      <span className="truncate flex-1">{session.title || "New Chat"}</span>
      {session.pinned && <Pin className="w-3 h-3 shrink-0 text-[var(--accent)]" />}
      {session.message_count > 0 && (
        <span className="text-xs text-[var(--muted)]">{session.message_count}</span>
      )}
    </button>
  );
}
