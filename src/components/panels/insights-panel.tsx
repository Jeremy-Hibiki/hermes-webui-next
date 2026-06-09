"use client";

import { BarChart3 } from "lucide-react";

export function InsightsPanel() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Insights
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 text-sm text-[var(--muted)]">
        <p className="text-center">No insights available</p>
      </div>
    </div>
  );
}
