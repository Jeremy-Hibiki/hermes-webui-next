"use client";

import { useEffect } from "react";
import { useAtom } from "jotai";
import { sessionsListAtom, activeSessionAtom } from "@/atoms/session";
import { useSessions } from "@/hooks/use-sessions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Plus, Search, Pin } from "lucide-react";
import { apiPost } from "@/lib/api-client";
import type { Session } from "@/types";
import { SessionItem } from "@/components/sessions/session-item";
import { SessionGroup } from "@/components/sessions/session-group";

export function Sidebar() {
  const [, setSessions] = useAtom(sessionsListAtom);
  const [active, setActive] = useAtom(activeSessionAtom);
  const { sessions, groupedSessions, pinnedSessions, isLoading, mutate } = useSessions();

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

  const _handleDelete = async (sessionId: string) => {
    try {
      await apiPost("/session/delete", { session_id: sessionId });
      if (active?.id === sessionId) setActive(null);
      await mutate();
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

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
        <div className="flex-1 text-sm font-medium text-[var(--text)]">Sessions</div>
        <Button
          variant="ghost"
          size="icon"
          className="text-[var(--muted)]"
          aria-label="Search sessions"
        >
          <Search className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {isLoading && <div className="p-4 text-sm text-[var(--muted)] text-center">Loading...</div>}

        {!isLoading && sessions.length === 0 && (
          <div className="p-4 text-sm text-[var(--muted)] text-center">No sessions yet</div>
        )}

        {/* Pinned section */}
        {pinnedSessions.length > 0 && (
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
              />
            ))}
          </div>
        )}

        {/* Grouped sessions */}
        {groupedSessions.map((group) => (
          <SessionGroup
            key={group.projectId ?? "__ungrouped"}
            name={group.projectName || "Other"}
            color={group.projectColor}
          >
            {group.sessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={active?.id === session.id}
                onSelect={handleSelect}
              />
            ))}
          </SessionGroup>
        ))}
      </ScrollArea>
    </div>
  );
}
