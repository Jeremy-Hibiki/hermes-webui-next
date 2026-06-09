"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { FolderOpen } from "lucide-react";

export function WorkspacePanel() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b border-[var(--border)]">
        <FolderOpen className="w-4 h-4 text-[var(--muted)]" />
        <span className="text-sm font-medium text-[var(--text)]">Workspace</span>
      </div>
      <ScrollArea className="flex-1 p-3">
        <div className="text-sm text-[var(--muted)] text-center py-8">
          Select a workspace to browse files
        </div>
      </ScrollArea>
    </div>
  );
}
