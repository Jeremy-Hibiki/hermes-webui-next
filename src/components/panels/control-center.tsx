"use client";

import { useState } from "react";
import {
  Settings,
  Clock,
  Zap,
  Brain,
  ListTodo,
  BarChart3,
  LayoutGrid,
  FileText,
} from "lucide-react";

interface PanelItem {
  key: string;
  label: string;
  icon: React.ReactNode;
}

const PANELS: PanelItem[] = [
  { key: "cron", label: "Cron", icon: <Clock className="w-4 h-4" /> },
  { key: "skills", label: "Skills", icon: <Zap className="w-4 h-4" /> },
  { key: "memory", label: "Memory", icon: <Brain className="w-4 h-4" /> },
  { key: "todo", label: "Todo", icon: <ListTodo className="w-4 h-4" /> },
  { key: "insights", label: "Insights", icon: <BarChart3 className="w-4 h-4" /> },
  { key: "kanban", label: "Kanban", icon: <LayoutGrid className="w-4 h-4" /> },
  { key: "logs", label: "Logs", icon: <FileText className="w-4 h-4" /> },
  { key: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
];

export function ControlCenter() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Control Center"
        className="p-2 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
      >
        <Settings className="w-5 h-5" />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-48 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg z-50">
          <div className="p-1">
            {PANELS.map((panel) => (
              <button
                key={panel.key}
                className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-[var(--text)] hover:bg-[var(--hover-bg)] transition-colors"
                onClick={() => setOpen(false)}
              >
                {panel.icon}
                {panel.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
