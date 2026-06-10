import { atom } from 'jotai';
import type { Session, Project } from '@/types';

export const activeSessionAtom = atom<Session | null>(null);
export const sessionsListAtom = atom<Session[]>([]);
export const projectsAtom = atom<Project[]>([]);
export const pinnedSessionIdsAtom = atom((get) =>
  get(sessionsListAtom)
    .filter((s) => s.pinned)
    .map((s) => s.session_id),
);
