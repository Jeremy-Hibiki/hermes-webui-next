'use client';

import { useMemo, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api-client';
import { bucketSessionsByDate, type DateBucket } from '@/lib/date-buckets';
import { API_BASE } from '@/lib/constants';
import type { Session, SessionsResponse } from '@/types';

interface SessionGroup {
  projectId: string | null;
  projectName: string;
  projectColor: string;
  sessions: Session[];
}

export function useSessions() {
  const { data, error, isLoading, mutate } = useSWR<SessionsResponse>('/sessions', fetcher, {
    revalidateOnFocus: false,
  });

  // Normalize: ensure every session has both session_id and id
  const normalizedData = useMemo(() => {
    if (!data) return data;
    return {
      ...data,
      sessions: data.sessions.map((s) => ({
        ...s,
        id: s.session_id,
      })),
    };
  }, [data]);

  const activeSessions = useMemo(() => (normalizedData?.sessions ?? []).filter((s) => !s.archived), [normalizedData]);

  const pinnedSessions = useMemo(
    () => (normalizedData?.sessions ?? []).filter((s) => s.pinned && !s.archived),
    [normalizedData],
  );

  const groupedSessions = useMemo<SessionGroup[]>(() => {
    const projects = normalizedData?.projects ?? [];
    const groups: Record<string, Session[]> = {};
    const ungrouped: Session[] = [];

    for (const session of activeSessions) {
      if (session.pinned) continue;
      if (session.project_id) {
        if (!groups[session.project_id]) groups[session.project_id] = [];
        groups[session.project_id].push(session);
      } else {
        ungrouped.push(session);
      }
    }

    const result: SessionGroup[] = [];

    for (const project of projects) {
      const projectSessions = groups[project.project_id];
      if (projectSessions && projectSessions.length > 0) {
        result.push({
          projectId: project.project_id,
          projectName: project.name,
          projectColor: project.color,
          sessions: projectSessions,
        });
      }
    }

    if (ungrouped.length > 0) {
      result.push({
        projectId: null,
        projectName: '',
        projectColor: '',
        sessions: ungrouped,
      });
    }

    return result;
  }, [activeSessions, normalizedData]);

  const dateGroupedSessions = useMemo<DateBucket[]>(() => bucketSessionsByDate(activeSessions), [activeSessions]);

  // SSE for real-time session updates
  const esRef = useRef<EventSource | null>(null);
  useEffect(() => {
    try {
      const es = new EventSource(`${API_BASE}/sessions/events`, {
        withCredentials: true,
      });
      esRef.current = es;
      es.addEventListener('session_update', () => {
        void mutate();
      });
      es.addEventListener('session_new', () => {
        void mutate();
      });
      es.onerror = () => {
        // SSE connection lost, SWR will handle polling
      };
    } catch {
      // SSE not available
    }
    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [mutate]);

  return {
    sessions: normalizedData?.sessions ?? [],
    projects: normalizedData?.projects ?? [],
    activeSessions,
    pinnedSessions,
    groupedSessions,
    dateGroupedSessions,
    isLoading,
    error,
    mutate,
  };
}
