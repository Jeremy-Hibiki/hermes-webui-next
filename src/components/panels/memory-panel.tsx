"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { fetcher, apiPost } from "@/lib/api-client";
import { MarkdownRenderer } from "@/components/chat/markdown-renderer";
import { Brain, Pencil, Save, X, StickyNote, User, Sparkles, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MemoryData {
  memory?: string;
  user?: string;
  soul?: string;
  memory_mtime?: string;
  user_mtime?: string;
  soul_mtime?: string;
  external_notes_enabled?: boolean;
}

const SECTIONS = [
  { key: "memory", label: "My Notes", icon: StickyNote },
  { key: "user", label: "User Profile", icon: User },
  { key: "soul", label: "Agent Soul", icon: Sparkles },
  { key: "external_notes", label: "External Notes", icon: BookOpen },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

export function MemoryPanel() {
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editDraft, setEditDraft] = useState("");

  const { data, mutate } = useSWR<MemoryData>("/memory", fetcher, { revalidateOnFocus: false });

  const sectionContent =
    activeSection && data
      ? ((data as Record<string, string | undefined>)[activeSection] ?? "")
      : "";

  const sectionMtime =
    activeSection && data
      ? (data as Record<string, string | undefined>)[`${activeSection}_mtime`]
      : undefined;

  const handleSelect = useCallback((key: SectionKey) => {
    setActiveSection(key);
    setEditMode(false);
  }, []);

  const startEdit = useCallback(() => {
    setEditDraft(sectionContent);
    setEditMode(true);
  }, [sectionContent]);

  const handleSave = useCallback(async () => {
    if (!activeSection) return;
    try {
      await apiPost("/memory/write", { section: activeSection, content: editDraft });
      setEditMode(false);
      void mutate();
    } catch (err) {
      console.error("Failed to save memory:", err);
    }
  }, [activeSection, editDraft, mutate]);

  const formatMtime = (mtime?: string) => {
    if (!mtime) return null;
    try {
      return new Date(mtime).toLocaleString();
    } catch {
      return mtime;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
          <Brain className="w-4 h-4" />
          Memory
        </h2>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Section list */}
        <div className="w-48 border-r border-[var(--border)] p-2 space-y-1">
          {SECTIONS.map((s) => {
            if (s.key === "external_notes" && !data?.external_notes_enabled) return null;
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                onClick={() => handleSelect(s.key)}
                className={cn(
                  "w-full text-left flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors",
                  activeSection === s.key
                    ? "bg-[var(--accent-bg)] text-[var(--accent)]"
                    : "text-[var(--text)] hover:bg-[var(--hover-bg)]",
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0 text-[var(--muted)]" />
                <span className="truncate">{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content area */}
        <div className="flex-1 flex flex-col min-h-0">
          {activeSection ? (
            <>
              <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
                <div>
                  <span className="text-sm font-medium text-[var(--text)]">
                    {SECTIONS.find((s) => s.key === activeSection)?.label}
                  </span>
                  {sectionMtime && (
                    <span className="text-xs text-[var(--muted)] ml-2">
                      Modified {formatMtime(sectionMtime)}
                    </span>
                  )}
                </div>
                {activeSection !== "external_notes" && (
                  <div className="flex items-center gap-1">
                    {editMode ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-[var(--accent)]"
                          onClick={() => void handleSave()}
                        >
                          <Save className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-[var(--muted)]"
                          onClick={() => setEditMode(false)}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-[var(--muted)]"
                        onClick={startEdit}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-4 text-sm">
                {editMode ? (
                  <textarea
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    rows={20}
                    className="w-full px-2 py-1 text-sm border border-[var(--border)] rounded bg-transparent text-[var(--text)] outline-none resize-none font-mono focus:ring-1 focus:ring-[var(--focus-ring)]"
                    aria-label="Edit memory"
                  />
                ) : (
                  <MarkdownRenderer content={sectionContent || "*(empty)*"} />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-[var(--muted)]">
              Select a section to view
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
