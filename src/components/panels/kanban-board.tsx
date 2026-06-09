"use client";

import { LayoutGrid } from "lucide-react";

export function KanbanBoard() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
          <LayoutGrid className="w-4 h-4" />
          Kanban
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-3 gap-4">
          {["To Do", "In Progress", "Done"].map((col) => (
            <div key={col} className="space-y-2">
              <h3 className="text-xs font-medium text-[var(--muted)]">{col}</h3>
              <div className="min-h-24 rounded-lg border border-dashed border-[var(--border)] p-2">
                <p className="text-xs text-[var(--muted)] text-center">No items</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
