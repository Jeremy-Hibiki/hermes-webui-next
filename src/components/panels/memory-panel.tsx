"use client";

import { Brain } from "lucide-react";

export function MemoryPanel() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
          <Brain className="w-4 h-4" />
          Memory
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 text-sm text-[var(--muted)]">
        <p className="text-center">No memory files</p>
      </div>
    </div>
  );
}
