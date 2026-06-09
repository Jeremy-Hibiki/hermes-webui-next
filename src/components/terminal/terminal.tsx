"use client";

import { Terminal } from "lucide-react";

interface TerminalPanelProps {
  sessionId: string;
}

export function TerminalPanel({ sessionId }: TerminalPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
        <Terminal className="w-4 h-4" />
        <span className="text-xs text-[var(--muted)]">Session: {sessionId}</span>
      </div>
      <div
        data-testid="terminal-container"
        className="flex-1 bg-black text-green-400 font-mono text-xs p-2"
      >
        {/* xterm.js mount point — initialized client-side */}
        <div className="text-[var(--muted)] text-center p-8">
          Terminal ready. Connecting to session...
        </div>
      </div>
    </div>
  );
}
