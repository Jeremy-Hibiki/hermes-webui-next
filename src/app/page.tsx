"use client";

import { useEffect, useState, useCallback } from "react";
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
import { LoginPage } from "@/app/login/login-page";
import { activeSessionAtom } from "@/atoms/session";
import { API_BASE } from "@/lib/constants";

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

type AuthState = "loading" | "unauthenticated" | "authenticated" | "no_auth";

export default function Home() {
  const [currentPanel, setCurrentPanel] = useAtom(currentPanelAtom);
  const [workspaceOpen] = useAtom(workspacePanelOpenAtom);
  const [activeSession] = useAtom(activeSessionAtom);
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [loginError, setLoginError] = useState<string | null>(null);

  // Check auth status on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch(`${API_BASE}/auth/status`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (!data.auth_enabled) {
          setAuthState("no_auth");
        } else if (data.logged_in) {
          setAuthState("authenticated");
        } else {
          setAuthState("unauthenticated");
        }
      } catch {
        // If we can't reach auth status, backend might be down.
        // Try to proceed anyway — let individual requests handle 401.
        setAuthState("no_auth");
      }
    }
    void checkAuth();

    // Listen for 401 events from api-client
    function onUnauthorized() {
      setAuthState("unauthenticated");
    }
    window.addEventListener("hermes:unauthorized", onUnauthorized);
    return () => window.removeEventListener("hermes:unauthorized", onUnauthorized);
  }, []);

  const handleLogin = useCallback(async (password: string) => {
    setLoginError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.error || "Login failed");
        return;
      }

      // Login successful — reload to get fresh session
      setAuthState("authenticated");
    } catch {
      setLoginError("Failed to connect to server");
    }
  }, []);

  // Loading state
  if (authState === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--bg)]">
        <div className="text-[var(--muted)] text-sm">Loading...</div>
      </div>
    );
  }

  // Show login page if auth is required and user isn't logged in
  if (authState === "unauthenticated") {
    return <LoginPage onLogin={handleLogin} error={loginError} />;
  }

  // Main app
  const sessionId = activeSession?.id ?? "";
  const mainContent = getPanelContent(currentPanel, sessionId);
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
