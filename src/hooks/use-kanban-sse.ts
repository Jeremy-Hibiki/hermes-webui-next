'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { API_BASE } from '@/lib/constants';

export type SSEConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

interface UseKanbanSSEOptions {
  board: string | null;
  enabled?: boolean;
  onEvents: (taskIds: string[]) => void;
}

interface UseKanbanSSEReturn {
  connectionStatus: SSEConnectionStatus;
}

const MAX_FAILURES = 3;
const POLL_INTERVAL_MS = 30000;
const DEBOUNCE_MS = 250;

export function useKanbanSSE({ board, enabled = true, onEvents }: UseKanbanSSEOptions): UseKanbanSSEReturn {
  const esRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const failuresRef = useRef(0);
  const latestEventIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTaskIdsRef = useRef<Set<string>>(new Set());
  const onEventsRef = useRef(onEvents);
  onEventsRef.current = onEvents;
  const [connectionStatus, setConnectionStatus] = useState<SSEConnectionStatus>('disconnected');

  const buildQuery = useCallback(
    (extra?: Record<string, string>) => {
      const params = new URLSearchParams();
      const since = Number(latestEventIdRef.current || 0);
      if (since > 0) params.set('since', String(since));
      if (board) params.set('board', board);
      if (extra) {
        for (const [k, v] of Object.entries(extra)) params.set(k, v);
      }
      const qs = params.toString();
      return qs ? `?${qs}` : '';
    },
    [board],
  );

  const flushEvents = useCallback(() => {
    debounceRef.current = null;
    const ids = Array.from(pendingTaskIdsRef.current);
    pendingTaskIdsRef.current.clear();
    if (ids.length > 0) onEventsRef.current(ids);
  }, []);

  const scheduleFlush = useCallback(
    (taskIds: string[]) => {
      for (const id of taskIds) pendingTaskIdsRef.current.add(id);
      if (debounceRef.current) return;
      debounceRef.current = setTimeout(flushEvents, DEBOUNCE_MS);
    },
    [flushEvents],
  );

  const pollForEvents = useCallback(async () => {
    try {
      setConnectionStatus('reconnecting');
      const res = await fetch(`${API_BASE}/kanban/events${buildQuery()}`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      if (data && Array.isArray(data.events) && data.events.length > 0) {
        latestEventIdRef.current = Number(data.latest_event_id || data.cursor || latestEventIdRef.current);
        const taskIds = data.events.map((ev: { task_id?: string }) => ev.task_id).filter(Boolean) as string[];
        scheduleFlush(taskIds);
      }
      setConnectionStatus('connected');
    } catch {
      setConnectionStatus('disconnected');
      // polling should not spam toasts
    }
  }, [buildQuery, scheduleFlush]);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(pollForEvents, POLL_INTERVAL_MS);
  }, [pollForEvents]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startSSE = useCallback(() => {
    if (esRef.current) {
      try {
        esRef.current.close();
      } catch {
        /* ignore */
      }
      esRef.current = null;
    }

    const url = `${API_BASE}/kanban/events/stream${buildQuery()}`;
    let es: EventSource;
    try {
      es = new EventSource(url);
      setConnectionStatus('reconnecting');
    } catch {
      failuresRef.current += 1;
      setConnectionStatus('disconnected');
      if (failuresRef.current < MAX_FAILURES && !pollRef.current) startPolling();
      return;
    }
    esRef.current = es;

    es.addEventListener('hello', () => {
      failuresRef.current = 0;
      setConnectionStatus('connected');
    });

    es.addEventListener('events', (ev: MessageEvent) => {
      let data: { events?: { task_id?: string }[]; cursor?: number; latest_event_id?: number };
      try {
        data = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (!data || !Array.isArray(data.events) || !data.events.length) return;
      latestEventIdRef.current = Number(data.cursor || data.latest_event_id || latestEventIdRef.current);
      const taskIds = data.events.map((e) => e.task_id).filter(Boolean) as string[];
      scheduleFlush(taskIds);
    });

    es.onerror = () => {
      failuresRef.current += 1;
      setConnectionStatus('disconnected');
      if (failuresRef.current >= MAX_FAILURES) {
        try {
          es.close();
        } catch {
          /* ignore */
        }
        esRef.current = null;
        if (!pollRef.current) startPolling();
      }
    };
  }, [buildQuery, scheduleFlush, startPolling]);

  useEffect(() => {
    if (!enabled) {
      stopPolling();
      if (esRef.current) {
        try {
          esRef.current.close();
        } catch {
          /* ignore */
        }
        esRef.current = null;
      }
      return;
    }

    failuresRef.current = 0;

    if (typeof EventSource === 'undefined' || failuresRef.current >= MAX_FAILURES) {
      startPolling();
    } else {
      startSSE();
    }

    return () => {
      stopPolling();
      if (esRef.current) {
        try {
          esRef.current.close();
        } catch {
          /* ignore */
        }
        esRef.current = null;
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [enabled, board, startSSE, startPolling, stopPolling]);

  return { connectionStatus };
}
