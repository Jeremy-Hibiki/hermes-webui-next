"use client";

import { useAtom } from "jotai";
import { sessionsListAtom } from "@/atoms/session";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";

export function Sidebar() {
  const [sessions] = useAtom(sessionsListAtom);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b border-[var(--border)]">
        <Button variant="ghost" size="icon" className="text-[var(--muted)]">
          <Plus className="w-4 h-4" />
        </Button>
        <div className="flex-1 text-sm font-medium text-[var(--text)]">Sessions</div>
        <Button variant="ghost" size="icon" className="text-[var(--muted)]">
          <Search className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {sessions.length === 0 ? (
          <div className="p-4 text-sm text-[var(--muted)] text-center">
            No sessions yet
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {sessions.map((session) => (
              <button
                key={session.id}
                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[var(--hover-bg)] text-[var(--text)] truncate"
              >
                {session.title || "New Chat"}
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
