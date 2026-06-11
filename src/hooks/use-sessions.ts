'use client';

import { useMemo, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { useAtom } from 'jotai';
import { fetcher } from '@/lib/api-client';
import { bucketSessionsByDate, type DateBucket } from '@/lib/date-buckets';
import { API_BASE } from '@/lib/constants';
import { optimisticSessionsAtom } from '@/atoms/session';
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
  const [optimisticMap] = useAtom(optimisticSessionsAtom);

  function _isOptimisticFirstTurnSessionRow(s: Session): boolean {
    if (!s?.session_id || s.archived) return false;
    const messageCount = Number(s.message_count || 0);
    if (messageCount <= 0 && !s.pending_user_message) return false;
    return Boolean(s.is_streaming || s.active_stream_id || s.pending_user_message || s.pending_started_at);
  }

  function _isServerIdleSessionRow(s: Session): boolean {
    return !s.is_streaming && !s.active_stream_id && !s.pending_user_message && !s.pending_started_at;
  }

  // Normalize: ensure every session has both session_id and id,
  // and merge optimistic first-turn rows so the sidebar reflects
  // sends immediately before the server list refreshes.
  const normalizedData = useMemo(() => {
    if (!data) return data;
    const sessions = data.sessions.map((s) => ({
      ...s,
      id: s.session_id,
    }));
    for (const [sid, optimistic] of optimisticMap) {
      if (!_isOptimisticFirstTurnSessionRow(optimistic)) continue;
      const idx = sessions.findIndex((s) => s.session_id === sid);
      if (idx >= 0) {
        const fetched = sessions[idx];
        const fetchedIsIdle = _isServerIdleSessionRow(fetched);
        const localCount = Number(optimistic.message_count || 0);
        const fetchedCount = Number(fetched.message_count || 0);
        const localTs = Number(optimistic.last_message_at || optimistic.updated_at || 0);
        const fetchedTs = Number(fetched.last_message_at || fetched.updated_at || 0);
        if (fetchedIsIdle) {
          // Server thinks it's idle but we have an optimistic streaming row.
          // Keep optimistic data for streaming-related fields.
          sessions[idx] = {
            ...fetched,
            ...optimistic,
            id: sid,
            title: optimistic.title || fetched.title,
            message_count: Math.max(localCount, fetchedCount),
            last_message_at: Math.max(localTs, fetchedTs),
            updated_at: Math.max(
              Number(optimistic.updated_at || 0),
              Number(fetched.updated_at || 0),
              localTs,
              fetchedTs,
            ),
          };
        } else {
          // Server also thinks it's active; merge carefully.
          sessions[idx] = {
            ...optimistic,
            ...fetched,
            id: sid,
            active_stream_id: fetched.active_stream_id || optimistic.active_stream_id || null,
            pending_user_message: fetched.pending_user_message || optimistic.pending_user_message || null,
            pending_started_at: fetched.pending_started_at || optimistic.pending_started_at || undefined,
            is_streaming: fetched.is_streaming || optimistic.is_streaming || false,
          };
        }
      } else {
        // Session not yet on server list; inject optimistic row
        sessions.unshift({ ...optimistic, session_id: sid, id: sid });
      }
    }
    return { ...data, sessions };
  }, [data, optimisticMap]);

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
