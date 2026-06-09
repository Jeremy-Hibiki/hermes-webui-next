import { atom } from 'jotai';

interface InflightSnapshot {
  sessionId: string;
  streamId: string;
  startedAt: number;
}

interface QueuedTurn {
  message: string;
  attachments?: string[];
}

export const inflightAtom = atom<Record<string, InflightSnapshot>>({});
export const sessionQueuesAtom = atom<Record<string, QueuedTurn[]>>({});
