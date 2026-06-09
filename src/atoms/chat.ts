import { atom } from "jotai";
import type { Message, ToolCall, ApprovalRequest, ClarifyRequest } from "@/types";

export const messagesAtom = atom<Message[]>([]);
export const busyAtom = atom<boolean>(false);
export const pendingFilesAtom = atom<File[]>([]);
export const toolCallsAtom = atom<ToolCall[]>([]);
export const activeStreamIdAtom = atom<string | null>(null);
export const approvalAtom = atom<ApprovalRequest | null>(null);
export const clarifyAtom = atom<ClarifyRequest | null>(null);
export const yoloAtom = atom<boolean>(false);
