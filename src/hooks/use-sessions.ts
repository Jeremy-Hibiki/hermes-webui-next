"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/api-client";
import { bucketSessionsByDate, type DateBucket } from "@/lib/date-buckets";
import type { Session, SessionsResponse } from "@/types";

interface SessionGroup {
  projectId: string | null;
  projectName: string;
  projectColor: string;
  sessions: Session[];
}

export function useSessions() {
  const { data, error, isLoading, mutate } = useSWR<SessionsResponse>("/sessions", fetcher);

  const sessions = data?.sessions ?? [];
  const projects = data?.projects ?? [];

  const activeSessions = useMemo(() => sessions.filter((s) => !s.archived), [sessions]);

  const pinnedSessions = useMemo(() => sessions.filter((s) => s.pinned && !s.archived), [sessions]);

  const groupedSessions = useMemo<SessionGroup[]>(() => {
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
      const projectSessions = groups[project.id];
      if (projectSessions && projectSessions.length > 0) {
        result.push({
          projectId: project.id,
          projectName: project.name,
          projectColor: project.color,
          sessions: projectSessions,
        });
      }
    }

    if (ungrouped.length > 0) {
      result.push({
        projectId: null,
        projectName: "",
        projectColor: "",
        sessions: ungrouped,
      });
    }

    return result;
  }, [activeSessions, projects]);

  const dateGroupedSessions = useMemo<DateBucket[]>(
    () => bucketSessionsByDate(activeSessions),
    [activeSessions],
  );

  return {
    sessions,
    projects,
    activeSessions,
    pinnedSessions,
    groupedSessions,
    dateGroupedSessions,
    isLoading,
    error,
    mutate,
  };
}
