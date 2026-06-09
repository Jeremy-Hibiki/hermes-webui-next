"use client";

import { useMemo } from "react";
import type { Session, Project } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SessionItem } from "./session-item";
import { SessionGroup } from "./session-group";

interface SessionListProps {
  sessions: Session[];
  projects: Project[];
  activeSessionId: string | null;
  onSelect: (sessionId: string) => void;
}

export function SessionList({
  sessions,
  projects,
  activeSessionId,
  onSelect,
}: SessionListProps) {
  const pinned = useMemo(
    () => sessions.filter((s) => s.pinned && !s.archived),
    [sessions]
  );

  const ungrouped = useMemo(
    () =>
      sessions.filter(
        (s) => !s.pinned && !s.archived && !s.project_id
      ),
    [sessions]
  );

  const grouped = useMemo(() => {
    const map: Record<string, Session[]> = {};
    for (const s of sessions) {
      if (s.pinned || s.archived || !s.project_id) continue;
      if (!map[s.project_id]) map[s.project_id] = [];
      map[s.project_id].push(s);
    }
    return projects
      .filter((p) => map[p.id]?.length)
      .map((p) => ({ project: p, sessions: map[p.id] }));
  }, [sessions, projects]);

  if (sessions.length === 0) {
    return (
      <div className="p-4 text-sm text-[var(--muted)] text-center">
        No sessions yet
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-1">
        {/* Pinned sessions */}
        {pinned.length > 0 && (
          <div className="mb-2">
            <div className="text-xs text-[var(--muted)] px-3 py-1 uppercase tracking-wide">
              Pinned
            </div>
            {pinned.map((s) => (
              <SessionItem
                key={s.id}
                session={s}
                isActive={s.id === activeSessionId}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}

        {/* Project groups */}
        {grouped.map(({ project, sessions: groupSessions }) => (
          <SessionGroup
            key={project.id}
            name={project.name}
            color={project.color}
          >
            {groupSessions.map((s) => (
              <SessionItem
                key={s.id}
                session={s}
                isActive={s.id === activeSessionId}
                onSelect={onSelect}
              />
            ))}
          </SessionGroup>
        ))}

        {/* Ungrouped sessions */}
        {ungrouped.map((s) => (
          <SessionItem
            key={s.id}
            session={s}
            isActive={s.id === activeSessionId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
