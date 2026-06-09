"use client";

import { useAtom } from "jotai";
import { activeSessionAtom } from "@/atoms/session";
import { useWorkspace } from "@/hooks/use-workspace";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { FolderOpen, RefreshCw, ChevronRight, Plus, Trash2, Home, GitBranch } from "lucide-react";
import { FileTree } from "@/components/workspace/file-tree";
import { FilePreview } from "@/components/workspace/file-preview";
import { GitBadge } from "@/components/workspace/git-badge";
import { GitOperations } from "@/components/workspace/git-operations";
import { useEffect, useState, useCallback } from "react";
import useSWR from "swr";
import { fetcher, apiPost } from "@/lib/api-client";
import type { WorkspaceInfo, GitStatus } from "@/types";
import { cn } from "@/lib/utils";

export function WorkspacePanel() {
  const [activeSession] = useAtom(activeSessionAtom);
  const { fileTree, fileContent, loading, fetchTree, fetchFile } = useWorkspace();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [currentPath, setCurrentPath] = useState<string>("");
  const [manageMode, setManageMode] = useState(false);
  const [addPath, setAddPath] = useState("");
  const [activeTab, setActiveTab] = useState<"files" | "git">("files");

  const sessionId = activeSession?.id ?? "";
  const workspace = activeSession?.workspace ?? ".";

  const { data: gitData } = useSWR<{ git: GitStatus }>(
    sessionId ? `/git-info?session_id=${sessionId}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );
  const { data: workspacesData, mutate: mutateWorkspaces } = useSWR<{
    workspaces: WorkspaceInfo[];
  }>("/workspaces", fetcher, { revalidateOnFocus: false });
  const workspaces = workspacesData?.workspaces ?? [];

  // Fetch tree on mount or workspace change
  useEffect(() => {
    if (workspace) {
      void fetchTree(workspace);
      setCurrentPath(workspace);
    }
  }, [workspace, fetchTree]);

  const handleFileSelect = useCallback(
    (path: string) => {
      setSelectedFile(path);
      void fetchFile(path);
    },
    [fetchFile],
  );

  const handleDirToggle = useCallback(
    (path: string) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(path)) next.delete(path);
        else {
          next.add(path);
          void fetchTree(path);
        }
        return next;
      });
    },
    [fetchTree],
  );

  const handleClosePreview = useCallback(() => {
    setSelectedFile(null);
  }, []);

  const handleBreadcrumb = useCallback(
    (path: string) => {
      setCurrentPath(path);
      void fetchTree(path);
      setSelectedFile(null);
    },
    [fetchTree],
  );

  const handleAddWorkspace = useCallback(async () => {
    if (!addPath.trim()) return;
    try {
      await apiPost("/workspaces/add", { path: addPath.trim() });
      setAddPath("");
      void mutateWorkspaces();
    } catch (err) {
      console.error("Failed to add workspace:", err);
    }
  }, [addPath, mutateWorkspaces]);

  const handleRemoveWorkspace = useCallback(
    async (path: string) => {
      if (!window.confirm(`Remove workspace "${path}"?`)) return;
      try {
        await apiPost("/workspaces/remove", { path });
        void mutateWorkspaces();
      } catch (err) {
        console.error("Failed to remove workspace:", err);
      }
    },
    [mutateWorkspaces],
  );

  // Breadcrumb segments
  const segments = currentPath.split("/").filter(Boolean);
  const breadcrumbParts = segments.map((seg, i) => ({
    label: seg,
    path: "/" + segments.slice(0, i + 1).join("/"),
  }));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b border-[var(--border)]">
        <FolderOpen className="w-4 h-4 text-[var(--muted)]" />
        <span className="text-sm font-medium text-[var(--text)]">Workspace</span>
        <GitBadge status={gitData?.git ?? null} />
        <span className="flex-1" />
        <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
          <button
            onClick={() => setActiveTab("files")}
            className={cn(
              "px-2 py-0.5 text-[10px] transition-colors",
              activeTab === "files"
                ? "bg-[var(--accent-bg)] text-[var(--accent)]"
                : "text-[var(--muted)] hover:text-[var(--text)]",
            )}
            aria-label="Files tab"
          >
            Files
          </button>
          <button
            onClick={() => setActiveTab("git")}
            className={cn(
              "px-2 py-0.5 text-[10px] transition-colors",
              activeTab === "git"
                ? "bg-[var(--accent-bg)] text-[var(--accent)]"
                : "text-[var(--muted)] hover:text-[var(--text)]",
            )}
            aria-label="Git tab"
          >
            <GitBranch className="w-3 h-3" />
          </button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={cn("text-[var(--muted)]", manageMode && "text-[var(--accent)]")}
          onClick={() => setManageMode(!manageMode)}
          aria-label="Manage workspaces"
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-[var(--muted)]"
          onClick={() => fetchTree(currentPath)}
          aria-label="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {manageMode ? (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <h3 className="text-xs font-medium text-[var(--muted)]">Workspaces</h3>
          {workspaces.map((ws) => (
            <div
              key={ws.id || ws.path}
              className="flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)]"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-[var(--text)] truncate">{ws.name}</div>
                <div className="text-xs text-[var(--muted)] truncate">{ws.path}</div>
                {ws.is_git && (
                  <div className="text-xs text-[var(--muted)]">
                    <span className="text-green-400">git</span> {ws.branch}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-[var(--error)] shrink-0"
                onClick={() => void handleRemoveWorkspace(ws.path)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="text"
              aria-label="Workspace path"
              value={addPath}
              onChange={(e) => setAddPath(e.target.value)}
              placeholder="/path/to/workspace"
              className="flex-1 px-2 py-1 text-sm border border-[var(--border)] rounded bg-transparent text-[var(--text)] outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleAddWorkspace();
              }}
            />
            <Button size="sm" onClick={() => void handleAddWorkspace()} disabled={!addPath.trim()}>
              Add
            </Button>
          </div>
        </div>
      ) : activeTab === "git" ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <GitOperations sessionId={sessionId} />
        </div>
      ) : (
        <>
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[var(--border)] text-xs text-[var(--muted)] overflow-x-auto">
            <button
              onClick={() => handleBreadcrumb(workspace)}
              className="hover:text-[var(--text)] shrink-0"
            >
              <Home className="w-3 h-3" />
            </button>
            {breadcrumbParts.map((part, i) => (
              <span key={part.path} className="flex items-center gap-1 shrink-0">
                <ChevronRight className="w-3 h-3" />
                {i === breadcrumbParts.length - 1 ? (
                  <span className="text-[var(--text)]">{part.label}</span>
                ) : (
                  <button
                    onClick={() => handleBreadcrumb(part.path)}
                    className="hover:text-[var(--text)]"
                  >
                    {part.label}
                  </button>
                )}
              </span>
            ))}
          </div>

          {selectedFile ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <FilePreview
                path={selectedFile}
                content={fileContent ?? ""}
                onClose={handleClosePreview}
              />
            </div>
          ) : (
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="p-4 text-sm text-[var(--muted)] text-center">Loading...</div>
              ) : (
                <FileTree
                  entries={fileTree}
                  onFileSelect={handleFileSelect}
                  onDirToggle={handleDirToggle}
                  expanded={expanded}
                />
              )}
            </ScrollArea>
          )}
        </>
      )}
    </div>
  );
}
