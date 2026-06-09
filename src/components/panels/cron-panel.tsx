"use client";

import { Clock, Plus, Trash2, Play, Pause } from "lucide-react";

export function CronPanel() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Cron Jobs
        </h2>
        <button className="p-1.5 rounded hover:bg-[var(--hover-bg)] text-[var(--muted)]">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 text-sm text-[var(--muted)]">
        <p className="text-center">No cron jobs configured</p>
      </div>
    </div>
  );
}
