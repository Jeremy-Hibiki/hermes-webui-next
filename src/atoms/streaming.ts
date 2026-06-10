import { atom } from 'jotai';

interface InflightSnapshot {
  sessionId: string;
  streamId: string;
  startedAt: number;
}

export interface QueuedTurn {
  text: string;
  files?: File[];
  attachments?: string[];
  model?: string | null;
  model_provider?: string | null;
  profile?: string;
  _queued_at: number;
}

export const inflightAtom = atom<Record<string, InflightSnapshot>>({});
export const sessionQueuesAtom = atom<Record<string, QueuedTurn[]>>({});

export function getSessionQueue(sid: string, create = false): QueuedTurn[] {
  if (!sid) return [];
  const key = `hermes-queue-${sid}`;
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return create ? [] : [];
}

export function queueSessionMessage(sid: string, payload: Omit<QueuedTurn, '_queued_at'>): number {
  if (!sid) return 0;
  const q = getSessionQueue(sid, true);
  const entry: QueuedTurn = { ...payload, _queued_at: Date.now() };
  q.push(entry);
  try {
    sessionStorage.setItem(`hermes-queue-${sid}`, JSON.stringify(q));
  } catch {
    /* ignore */
  }
  return q.length;
}

export function shiftQueuedSessionMessage(sid: string): QueuedTurn | null {
  if (!sid) return null;
  const q = getSessionQueue(sid, false);
  const next = q.shift() || null;
  if (!q.length) {
    try {
      sessionStorage.removeItem(`hermes-queue-${sid}`);
    } catch {
      /* ignore */
    }
  } else {
    try {
      sessionStorage.setItem(`hermes-queue-${sid}`, JSON.stringify(q));
    } catch {
      /* ignore */
    }
  }
  return next;
}

export function clearSessionQueue(sid: string) {
  if (!sid) return;
  try {
    sessionStorage.removeItem(`hermes-queue-${sid}`);
  } catch {
    /* ignore */
  }
}
