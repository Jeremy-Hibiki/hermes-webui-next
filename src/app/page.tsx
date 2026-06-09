"use client";

import { useAtom } from "jotai";
import { currentPanelAtom, workspacePanelOpenAtom } from "@/atoms/ui";
import { ThreePanel } from "@/components/layout/three-panel";
import { RailNav } from "@/components/layout/rail-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { MainPanel } from "@/components/layout/main-panel";
import { WorkspacePanel } from "@/components/layout/workspace-panel";
import { CronPanel } from "@/components/panels/cron-panel";
import { SkillsPanel } from "@/components/panels/skills-panel";
import { MemoryPanel } from "@/components/panels/memory-panel";
import { TodoPanel } from "@/components/panels/todo-panel";
import { SettingsPanel } from "@/components/panels/settings-panel";
import { InsightsPanel } from "@/components/panels/insights-panel";
import { KanbanBoard } from "@/components/panels/kanban-board";
import { TerminalPanel } from "@/components/terminal/terminal";
import { activeSessionAtom } from "@/atoms/session";

/** Map panel id to its component */
function getPanelContent(panelId: string, sessionId: string) {
  switch (panelId) {
    case "chat":
      return <MainPanel />;
    case "tasks":
      return <TodoPanel />;
    case "kanban":
      return <KanbanBoard />;
    case "skills":
      return <SkillsPanel />;
    case "memory":
      return <MemoryPanel />;
    case "workspaces":
      return <WorkspacePanel />;
    case "terminal":
      return <TerminalPanel sessionId={sessionId} />;
    case "insights":
      return <InsightsPanel />;
    case "settings":
      return <SettingsPanel />;
    case "cron":
      return <CronPanel />;
    default:
      return <MainPanel />;
  }
}

export default function Home() {
  const [currentPanel, setCurrentPanel] = useAtom(currentPanelAtom);
  const [workspaceOpen] = useAtom(workspacePanelOpenAtom);
  const [activeSession] = useAtom(activeSessionAtom);

  const sessionId = activeSession?.id ?? "";
  const mainContent = getPanelContent(currentPanel, sessionId);

  // Workspace panel is shown when viewing chat and toggled on
  const showWorkspace = currentPanel === "chat" && workspaceOpen;

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <RailNav activePanel={currentPanel} onPanelChange={setCurrentPanel} />
      <ThreePanel
        sidebar={<Sidebar />}
        main={mainContent}
        workspace={showWorkspace ? <WorkspacePanel /> : undefined}
      />
    </div>
  );
}
