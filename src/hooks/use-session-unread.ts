'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAtom } from 'jotai';
import { activeSessionAtom } from '@/atoms/session';

const VIEWED_COUNTS_KEY = 'hermes-session-viewed-counts';
const COMPLETION_UNREAD_KEY = 'hermes-session-completion-unread';

function getViewedCounts(): Record<string, number> {
  try {
    const raw = localStorage.getItem(VIEWED_COUNTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveViewedCounts(counts: Record<string, number>) {
  try {
    localStorage.setItem(VIEWED_COUNTS_KEY, JSON.stringify(counts));
  } catch {
    /* ignore */
  }
}

function getCompletionUnread(): Record<string, { message_count: number; completed_at: number }> {
  try {
    const raw = localStorage.getItem(COMPLETION_UNREAD_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCompletionUnread(data: Record<string, { message_count: number; completed_at: number }>) {
  try {
    localStorage.setItem(COMPLETION_UNREAD_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function setSessionViewedCount(sid: string, count: number) {
  const counts = getViewedCounts();
  counts[sid] = count;
  saveViewedCounts(counts);
  // Clear any completion-unread marker
  const unread = getCompletionUnread();
  if (sid in unread) {
    delete unread[sid];
    saveCompletionUnread(unread);
  }
}

export function markSessionCompletionUnread(sid: string, messageCount: number) {
  const unread = getCompletionUnread();
  unread[sid] = { message_count: messageCount, completed_at: Date.now() };
  saveCompletionUnread(unread);
}

export function hasUnreadForSession(sessionId: string, messageCount: number): boolean {
  const unread = getCompletionUnread();
  if (sessionId in unread) return true;
  const counts = getViewedCounts();
  if (!(sessionId in counts)) return false;
  return messageCount > (counts[sessionId] || 0);
}

export function useSessionUnread() {
  const [activeSession] = useAtom(activeSessionAtom);
  const prevCountRef = useRef<number>(0);

  // When the active session's message count increases while we're viewing it,
  // sync the viewed count so it's not marked as unread.
  useEffect(() => {
    if (!activeSession?.session_id) return;
    const mc = activeSession.message_count || 0;
    if (mc > prevCountRef.current) {
      setSessionViewedCount(activeSession.session_id, mc);
    }
    prevCountRef.current = mc;
  }, [activeSession?.session_id, activeSession?.message_count]);

  // Mark current session as viewed when it becomes active
  useEffect(() => {
    if (!activeSession?.session_id) return;
    const mc = activeSession.message_count || 0;
    setSessionViewedCount(activeSession.session_id, mc);
    prevCountRef.current = mc;
  }, [activeSession?.session_id]);

  const isSessionUnread = useCallback(
    (sessionId: string, messageCount: number, isActive: boolean): boolean => {
      if (isActive) return false;
      return hasUnreadForSession(sessionId, messageCount);
    },
    [],
  );

  return { isSessionUnread };
}
