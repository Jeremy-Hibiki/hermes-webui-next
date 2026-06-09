"use client";

import { useAtom } from "jotai";
import { activeSessionAtom } from "@/atoms/session";
import { useWorkspace } from "@/hooks/use-workspace";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { FolderOpen, RefreshCw } from "lucide-react";
import { FileTree } from "@/components/workspace/file-tree";
import { FilePreview } from "@/components/workspace/file-preview";
import { useEffect, useState, useCallback } from "react";

export function WorkspacePanel() {
  const [activeSession] = useAtom(activeSessionAtom);
  const { fileTree, fileContent, loading, fetchTree, fetchFile } = useWorkspace();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const workspace = activeSession?.workspace ?? ".";

  // Fetch tree on mount or workspace change
  useEffect(() => {
    if (workspace) {
      void fetchTree(workspace);
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b border-[var(--border)]">
        <FolderOpen className="w-4 h-4 text-[var(--muted)]" />
        <span className="text-sm font-medium text-[var(--text)]">Workspace</span>
        <span className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          className="text-[var(--muted)]"
          onClick={() => fetchTree(workspace)}
          aria-label="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
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
    </div>
  );
}
