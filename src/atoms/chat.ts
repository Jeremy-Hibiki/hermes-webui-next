import { atom } from "jotai";
import type { Message, ToolCall } from "@/types";

export const messagesAtom = atom<Message[]>([]);
export const busyAtom = atom<boolean>(false);
export const pendingFilesAtom = atom<File[]>([]);
export const toolCallsAtom = atom<ToolCall[]>([]);
export const activeStreamIdAtom = atom<string | null>(null);
