'use client';

import { useMemo, useCallback, useEffect, useState } from 'react';
import type { Session, Project } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SessionItem } from './session-item';
import { SessionGroup } from './session-group';

const STORAGE_KEY = 'hermes-session-viewed-counts';

function getViewedCounts(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setViewedCount(sessionId: string, count: number) {
  try {
    const counts = getViewedCounts();
    counts[sessionId] = count;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
  } catch {}
}

interface SessionListProps {
  sessions: Session[];
  projects: Project[];
  activeSessionId: string | null;
  onSelect: (sessionId: string) => void;
}

export function SessionList({ sessions, projects, activeSessionId, onSelect }: SessionListProps) {
  const [, setTick] = useState(0);

  // Update viewed count when active session changes
  useEffect(() => {
    if (!activeSessionId) return;
    const session = sessions.find((s) => s.session_id === activeSessionId);
    if (session && session.message_count) {
      setViewedCount(activeSessionId, session.message_count);
    }
  }, [activeSessionId, sessions]);

  // Force re-render periodically to update unread status
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  const isSessionUnread = useCallback(
    (session: Session): boolean => {
      if (session.session_id === activeSessionId) return false;
      if (!session.message_count || session.message_count === 0) return false;
      const viewed = getViewedCounts()[session.session_id] ?? 0;
      return session.message_count > viewed;
    },
    [activeSessionId],
  );

  const pinned = useMemo(() => sessions.filter((s) => s.pinned && !s.archived), [sessions]);

  const ungrouped = useMemo(() => sessions.filter((s) => !s.pinned && !s.archived && !s.project_id), [sessions]);

  const grouped = useMemo(() => {
    const map: Record<string, Session[]> = {};
    for (const s of sessions) {
      if (s.pinned || s.archived || !s.project_id) continue;
      if (!map[s.project_id]) map[s.project_id] = [];
      map[s.project_id].push(s);
    }
    return projects.filter((p) => map[p.project_id]?.length).map((p) => ({ project: p, sessions: map[p.project_id] }));
  }, [sessions, projects]);

  if (sessions.length === 0) {
    return <div className="p-4 text-sm text-[var(--muted)] text-center">No sessions yet</div>;
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-1">
        {/* Pinned sessions */}
        {pinned.length > 0 && (
          <div className="mb-2">
            <div className="text-xs text-[var(--muted)] px-3 py-1 uppercase tracking-wide">Pinned</div>
            {pinned.map((s) => (
              <SessionItem
                key={s.session_id}
                session={s}
                isActive={s.session_id === activeSessionId}
                isUnread={isSessionUnread(s)}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}

        {/* Project groups */}
        {grouped.map(({ project, sessions: groupSessions }) => (
          <SessionGroup key={project.project_id} name={project.name} color={project.color}>
            {groupSessions.map((s) => (
              <SessionItem
                key={s.session_id}
                session={s}
                isActive={s.session_id === activeSessionId}
                isUnread={isSessionUnread(s)}
                onSelect={onSelect}
              />
            ))}
          </SessionGroup>
        ))}

        {/* Ungrouped sessions */}
        {ungrouped.map((s) => (
          <SessionItem
            key={s.session_id}
            session={s}
            isActive={s.session_id === activeSessionId}
            isUnread={isSessionUnread(s)}
            onSelect={onSelect}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
