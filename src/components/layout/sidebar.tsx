"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAtom } from "jotai";
import { sessionsListAtom, activeSessionAtom } from "@/atoms/session";
import { useSessions } from "@/hooks/use-sessions";
import { useSessionSearch } from "@/hooks/use-session-search";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Plus, Search, X, Pin } from "lucide-react";
import { apiPost } from "@/lib/api-client";
import type { Session } from "@/types";
import { SessionItem } from "@/components/sessions/session-item";

export function Sidebar() {
  const [, setSessions] = useAtom(sessionsListAtom);
  const [active, setActive] = useAtom(activeSessionAtom);
  const { sessions, dateGroupedSessions, pinnedSessions, isLoading, mutate } = useSessions();
  const {
    query,
    setQuery,
    results: searchResults,
    isSearching,
    clearSearch,
  } = useSessionSearch(sessions);
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSearchingActive = query.trim().length > 0;

  // Sync SWR data into atom (in effect to avoid render-loop)
  useEffect(() => {
    setSessions(sessions);
  }, [sessions, setSessions]);

  const handleNewChat = async () => {
    try {
      const session = await apiPost<Session>("/session/new", {});
      setActive(session);
      await mutate();
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  };

  const handleSelect = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (session) setActive(session);
  };

  const handleRename = async (sessionId: string, newTitle: string) => {
    try {
      await apiPost("/session/rename", { session_id: sessionId, title: newTitle });
      await mutate();
    } catch (err) {
      console.error("Failed to rename session:", err);
    }
  };

  const handlePin = async (sessionId: string) => {
    try {
      await apiPost("/session/pin", { session_id: sessionId });
      await mutate();
    } catch (err) {
      console.error("Failed to pin session:", err);
    }
  };

  const handleArchive = async (sessionId: string) => {
    try {
      await apiPost("/session/archive", { session_id: sessionId });
      if (active?.id === sessionId) setActive(null);
      await mutate();
    } catch (err) {
      console.error("Failed to archive session:", err);
    }
  };

  const handleDelete = async (sessionId: string) => {
    try {
      await apiPost("/session/delete", { session_id: sessionId });
      if (active?.id === sessionId) setActive(null);
      await mutate();
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  const handleOpenSearch = useCallback(() => {
    setSearchOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleCloseSearch = useCallback(() => {
    setSearchOpen(false);
    clearSearch();
  }, [clearSearch]);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") handleCloseSearch();
    },
    [handleCloseSearch],
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b border-[var(--border)]">
        <Button
          variant="ghost"
          size="icon"
          className="text-[var(--muted)]"
          onClick={handleNewChat}
          aria-label="New Chat"
        >
          <Plus className="w-4 h-4" />
        </Button>
        {searchOpen ? (
          <div className="flex-1 flex items-center gap-1">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Filter conversations..."
              aria-label="Search sessions"
              className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--muted)] outline-none"
            />
            <Button
              variant="ghost"
              size="icon"
              className="text-[var(--muted)] h-6 w-6 shrink-0"
              onClick={handleCloseSearch}
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 text-sm font-medium text-[var(--text)]">Sessions</div>
            <Button
              variant="ghost"
              size="icon"
              className="text-[var(--muted)]"
              onClick={handleOpenSearch}
              aria-label="Search sessions"
            >
              <Search className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>

      <ScrollArea className="flex-1">
        {isLoading && <div className="p-4 text-sm text-[var(--muted)] text-center">Loading...</div>}

        {!isLoading && sessions.length === 0 && (
          <div className="p-4 text-sm text-[var(--muted)] text-center">No sessions yet</div>
        )}

        {/* Search results */}
        {isSearchingActive && (
          <div className="p-2">
            {searchResults.length === 0 && !isSearching && (
              <div className="p-4 text-sm text-[var(--muted)] text-center">No sessions found</div>
            )}
            {isSearching && searchResults.length === 0 && (
              <div className="p-4 text-sm text-[var(--muted)] text-center">Searching...</div>
            )}
            {searchResults.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={active?.id === session.id}
                onSelect={handleSelect}
                onRename={handleRename}
                onPin={handlePin}
                onArchive={handleArchive}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Normal pinned + date-grouped view */}
        {!isSearchingActive && pinnedSessions.length > 0 && (
          <div className="p-2">
            <div className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[var(--muted)]">
              <Pin className="w-3 h-3" />
              Pinned
            </div>
            {pinnedSessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={active?.id === session.id}
                onSelect={handleSelect}
                onRename={handleRename}
                onPin={handlePin}
                onArchive={handleArchive}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Date-grouped sessions */}
        {!isSearchingActive &&
          dateGroupedSessions.map((bucket) => (
            <div key={bucket.label} className="mb-1">
              <div className="px-3 py-1.5 text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
                {bucket.label}
              </div>
              {bucket.sessions.map((session) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  isActive={active?.id === session.id}
                  onSelect={handleSelect}
                  onRename={handleRename}
                  onPin={handlePin}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ))}
      </ScrollArea>
    </div>
  );
}
