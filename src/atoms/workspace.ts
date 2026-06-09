import { atom } from "jotai";
import type { FileEntry } from "@/types";

export const fileTreeAtom = atom<FileEntry[]>([]);
export const expandedDirsAtom = atom<Set<string>>(new Set<string>());
export const selectedFilePathAtom = atom<string | null>(null);
export const filePreviewContentAtom = atom<string | null>(null);
