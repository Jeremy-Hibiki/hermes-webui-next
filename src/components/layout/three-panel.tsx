"use client";

import { useAtom } from "jotai";
import { sidebarCollapsedAtom, workspacePanelOpenAtom } from "@/atoms/ui";
import { cn } from "@/lib/utils";

interface ThreePanelProps {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  workspace: React.ReactNode;
  workspaceOpen?: boolean;
}

export function ThreePanel({ sidebar, main, workspace, workspaceOpen }: ThreePanelProps) {
  const [collapsed] = useAtom(sidebarCollapsedAtom);
  const [wsOpen] = useAtom(workspacePanelOpenAtom);
  const showWorkspace = workspaceOpen ?? wsOpen;

  return (
    <div className="flex h-full w-full overflow-hidden bg-[var(--bg)]">
      <aside
        className={cn(
          "shrink-0 border-r border-[var(--border)] bg-[var(--sidebar)] transition-all duration-200 overflow-hidden",
          collapsed ? "w-0" : "w-64"
        )}
        data-testid="panel-sidebar"
      >
        <div className="w-64 h-full overflow-y-auto">{sidebar}</div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-[var(--main-bg)]" data-testid="panel-main">
        {main}
      </main>

      {showWorkspace && (
        <aside
          className="shrink-0 w-80 border-l border-[var(--border)] bg-[var(--sidebar)] overflow-hidden"
          data-testid="panel-workspace"
        >
          <div className="h-full overflow-y-auto">{workspace}</div>
        </aside>
      )}
    </div>
  );
}
