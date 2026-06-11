import { atom } from 'jotai';
import type { Message, ToolCall, ApprovalRequest, ClarifyRequest, TodoItem, TurnUsage } from '@/types';

export const messagesAtom = atom<Message[]>([]);
export const busyAtom = atom<boolean>(false);
export const pendingFilesAtom = atom<File[]>([]);
export const toolCallsAtom = atom<ToolCall[]>([]);
export const activeStreamIdAtom = atom<string | null>(null);
export const approvalAtom = atom<ApprovalRequest | null>(null);
export const clarifyAtom = atom<ClarifyRequest | null>(null);
export const yoloAtom = atom<boolean>(false);
export const todosAtom = atom<TodoItem[]>([]);
export const todoMetaAtom = atom<Record<string, unknown>>({});
export const composerContextAtom = atom<TurnUsage | null>(null);
export const bgTasksAtom = atom<string[]>([]);

export interface CompressionState {
  phase: 'running' | 'done';
  automatic: boolean;
  message: string;
  continuationSessionId?: string;
  startedAt?: number;
}

export const compressionAtom = atom<CompressionState | null>(null);
export const composerStatusAtom = atom<string>('');
export const liveTpsAtom = atom<number | null>(null);
export const composerAppendAtom = atom<string | null>(null);
