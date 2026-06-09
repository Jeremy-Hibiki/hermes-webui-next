"use client";

import { Settings, Sun, Moon, Monitor } from "lucide-react";

export function SettingsPanel() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Settings
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Theme Section */}
        <div>
          <h3 className="text-xs font-medium text-[var(--muted)] mb-2">Theme</h3>
          <div className="flex gap-2">
            <button className="flex items-center gap-1 px-3 py-1.5 rounded text-xs border border-[var(--border)] hover:bg-[var(--hover-bg)]">
              <Monitor className="w-3 h-3" /> System
            </button>
            <button className="flex items-center gap-1 px-3 py-1.5 rounded text-xs border border-[var(--border)] hover:bg-[var(--hover-bg)]">
              <Sun className="w-3 h-3" /> Light
            </button>
            <button className="flex items-center gap-1 px-3 py-1.5 rounded text-xs border border-[var(--border)] hover:bg-[var(--hover-bg)]">
              <Moon className="w-3 h-3" /> Dark
            </button>
          </div>
        </div>

        {/* Skin Section */}
        <div>
          <h3 className="text-xs font-medium text-[var(--muted)] mb-2">Skin</h3>
          <div className="grid grid-cols-8 gap-1">
            {Array.from({ length: 16 }, (_, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full border border-[var(--border)] cursor-pointer hover:ring-2 ring-[var(--accent)]"
                style={{ backgroundColor: `hsl(${i * 22.5}, 70%, 60%)` }}
              />
            ))}
          </div>
        </div>

        {/* Font Size Section */}
        <div>
          <h3 className="text-xs font-medium text-[var(--muted)] mb-2">Font Size</h3>
          <div className="flex gap-2">
            {(["small", "default", "large", "xlarge"] as const).map((size) => (
              <button
                key={size}
                className="px-3 py-1.5 rounded text-xs border border-[var(--border)] hover:bg-[var(--hover-bg)] capitalize"
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
