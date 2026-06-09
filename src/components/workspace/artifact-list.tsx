"use client";

import { useMemo } from "react";
import { useAtomValue } from "jotai";
import { messagesAtom } from "@/atoms/chat";
import { FileText } from "lucide-react";
import type { ToolCall } from "@/types/message";

const ARTIFACT_TOOLS = new Set([
  "write_file",
  "patch",
  "edit_file",
  "create_file",
  "mcp__filesystem__write_file",
  "mcp__filesystem__edit_file",
]);

const SKIP_DIRS = new Set([".git", "node_modules", "dist", "__pycache__", ".venv", "build"]);

function normalizePath(p: string): string | null {
  let path = p.trim().replace(/^[`"']+|[`"']+$/g, "");
  if (path.startsWith("~/")) path = path.slice(2);
  if (path.startsWith("./")) path = path.slice(2);
  if (path.length > 240) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return null;
  const firstSeg = path.split("/")[0];
  if (SKIP_DIRS.has(firstSeg)) return null;
  if (!path.includes(".") && !path.includes("/")) return null;
  return path || null;
}

function extractPathFromArgs(name: string, argsStr: string): string[] {
  const paths: string[] = [];
  try {
    const args = JSON.parse(argsStr);
    for (const key of ["path", "file_path", "source", "destination"]) {
      if (typeof args[key] === "string") paths.push(args[key]);
    }
    if (Array.isArray(args.paths)) {
      for (const p of args.paths) {
        if (typeof p === "string") paths.push(p);
      }
    }
    if (Array.isArray(args.edits)) {
      for (const edit of args.edits) {
        if (typeof edit.path === "string") paths.push(edit.path);
      }
    }
  } catch {
    // ignore parse errors
  }
  return paths;
}

function extractDiffPaths(content: string): string[] {
  const paths: string[] = [];
  const diffRegex = /^\+\+\+\s+b?\//gm;
  let match: RegExpExecArray | null;
  while ((match = diffRegex.exec(content)) !== null) {
    const raw = match[0].replace(/^\++\s+b?/, "").trim();
    if (raw) paths.push(raw);
  }
  return paths;
}

export function useArtifacts() {
  const messages = useAtomValue(messagesAtom);

  return useMemo(() => {
    const seen = new Set<string>();
    const artifacts: { path: string; source: string }[] = [];

    for (const msg of messages) {
      // Extract from tool calls
      if (msg.tool_calls) {
        for (const tc of msg.tool_calls as ToolCall[]) {
          if (ARTIFACT_TOOLS.has(tc.name)) {
            const extracted = extractPathFromArgs(tc.name, tc.arguments);
            for (const raw of extracted) {
              const p = normalizePath(raw);
              if (p && !seen.has(p)) {
                seen.add(p);
                artifacts.push({ path: p, source: tc.name });
              }
            }
          }
        }
      }
      // Extract from diff blocks in content
      if (msg.content) {
        const diffPaths = extractDiffPaths(msg.content);
        for (const raw of diffPaths) {
          const p = normalizePath(raw);
          if (p && !seen.has(p)) {
            seen.add(p);
            artifacts.push({ path: p, source: "diff" });
          }
        }
      }
    }

    return artifacts.slice(0, 50);
  }, [messages]);
}

interface ArtifactListProps {
  onOpenFile: (path: string) => void;
}

export function ArtifactList({ onOpenFile }: ArtifactListProps) {
  const artifacts = useArtifacts();

  if (artifacts.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-[var(--muted)]">
        No artifacts yet
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {artifacts.map((a) => (
        <button
          key={a.path}
          onClick={() => onOpenFile(a.path)}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--hover-bg)] text-left transition-colors"
        >
          <FileText className="w-3 h-3 text-[var(--accent)] shrink-0" />
          <span className="flex-1 truncate font-mono text-[var(--text)]">{a.path}</span>
          <span className="text-[10px] text-[var(--muted)] shrink-0">{a.source}</span>
        </button>
      ))}
    </div>
  );
}
