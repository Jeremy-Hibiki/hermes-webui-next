"use client";

import { cn } from "@/lib/utils";
import {
  MessageSquare,
  ListChecks,
  BarChart3,
  Wrench,
  Brain,
  FolderOpen,
  Settings,
  Kanban,
  Lightbulb,
  Terminal,
} from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "tasks", label: "Tasks", icon: ListChecks },
  { id: "kanban", label: "Kanban", icon: Kanban },
  { id: "skills", label: "Skills", icon: Wrench },
  { id: "memory", label: "Memory", icon: Brain },
  { id: "workspaces", label: "Workspaces", icon: FolderOpen },
  { id: "terminal", label: "Terminal", icon: Terminal },
  { id: "insights", label: "Insights", icon: Lightbulb },
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

export function RailNav({
  activePanel,
  onPanelChange,
}: {
  activePanel?: string;
  onPanelChange?: (panel: string) => void;
}) {
  return (
    <nav className="flex flex-col items-center gap-1 py-2 w-12 bg-[var(--sidebar)] border-r border-[var(--border)]">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activePanel === item.id;
        return (
          <button
            key={item.id}
            aria-label={item.label}
            title={item.label}
            onClick={() => onPanelChange?.(item.id)}
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-lg transition-colors",
              isActive
                ? "active bg-[var(--accent-bg-strong)] text-[var(--accent)]"
                : "text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text)]"
            )}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}
    </nav>
  );
}
