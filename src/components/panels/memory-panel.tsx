'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { fetcher, apiPost } from '@/lib/api-client';
import { MarkdownRenderer } from '@/components/chat/markdown-renderer';
import { Brain, Pencil, Save, X, StickyNote, User, Sparkles, BookOpen, Clock, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { useTranslation } from '@/lib/i18n';

interface MemoryData {
  memory?: string;
  user?: string;
  soul?: string;
  /** Epoch seconds from the backend */
  memory_mtime?: number;
  /** Epoch seconds from the backend */
  user_mtime?: number;
  /** Epoch seconds from the backend */
  soul_mtime?: number;
  external_notes_enabled?: boolean;
}

interface NotesTool {
  name: string;
  description?: string;
}

interface NotesSource {
  name: string;
  label?: string;
  active: boolean;
  status?: string;
  tool_count: number;
  tool_source?: string;
  tools: NotesTool[];
}

interface RecentAiNote {
  source?: string;
  id?: string;
  title?: string;
  label?: string;
  updated_time?: string;
}

interface NotesSourcesData {
  enabled: boolean;
  sources: NotesSource[];
  source?: string;
  automatic_recall_unchanged: boolean;
  recent_ai_notes: RecentAiNote[];
}

interface NotesSearchResult {
  id?: string;
  title?: string;
  snippet?: string;
  source?: string;
}

interface NotesItemData {
  note?: {
    source?: string;
    title?: string;
    body?: string;
    id?: string;
  };
}

const SECTIONS = [
  { key: 'memory', label: 'My Notes', icon: StickyNote },
  { key: 'user', label: 'User Profile', icon: User },
  { key: 'soul', label: 'Agent Soul', icon: Sparkles },
  { key: 'external_notes', label: 'External Notes', icon: BookOpen },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];

// ── External Notes sub-view ──────────────────────────────────────────────

function ExternalNotesView() {
  const [selectedSource, setSelectedSource] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NotesSearchResult[]>([]);
  const [searchError, setSearchError] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [previewNote, setPreviewNote] = useState<{ title?: string; body?: string; source?: string } | null>(null);

  const { data: sourcesData, isLoading: sourcesLoading } = useSWR<NotesSourcesData>('/notes/sources', fetcher, {
    revalidateOnFocus: false,
  });

  const sources = sourcesData?.sources ?? [];
  const recentAiNotes = sourcesData?.recent_ai_notes ?? [];
  const autoRecallUnchanged = sourcesData?.automatic_recall_unchanged ?? true;

  const sourceOptions = sources.length > 0 ? sources : [];
  const activeSource = selectedSource || (sourceOptions[0]?.name ?? '');

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    setSearchError('');
    setPreviewNote(null);
    try {
      const params = new URLSearchParams({
        source: activeSource || 'joplin',
        q,
        limit: '20',
      });
      const data = await fetcher<NotesSearchResult & { results?: NotesSearchResult[]; error?: string }>(
        `/notes/search?${params}`,
      );
      setSearchResults(data.results ?? []);
      if (data.error) setSearchError(data.error);
    } catch (e) {
      setSearchResults([]);
      setSearchError(e instanceof Error ? e.message : String(e));
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, activeSource]);

  const handlePreview = useCallback(async (source: string, id: string) => {
    setSearchError('');
    try {
      const params = new URLSearchParams({ source: source || 'joplin', id });
      const data = await fetcher<NotesItemData>(`/notes/item?${params}`);
      setPreviewNote(data.note ?? null);
    } catch (e) {
      setPreviewNote(null);
      setSearchError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  if (sourcesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-[var(--muted)]">Loading sources...</div>
    );
  }

  if (!sources.length) {
    return (
      <div className="flex-1 overflow-y-auto p-4 text-sm space-y-3">
        {autoRecallUnchanged && (
          <p className="text-xs text-[var(--muted)] opacity-70">
            Automatic session recall is unchanged; this drawer only shows configured sources and available read/search
            tools.
          </p>
        )}
        <p className="text-[var(--muted)] italic text-xs">
          No note or knowledge MCP sources are visible yet. Configure Joplin, Obsidian, Notion, llm-wiki, or another
          notes server to list it here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 text-sm space-y-4">
      {autoRecallUnchanged && (
        <p className="text-xs text-[var(--muted)] opacity-70">
          Automatic session recall is unchanged; this drawer only shows configured sources and available read/search
          tools.
        </p>
      )}

      {/* Recently used by AI */}
      {recentAiNotes.length > 0 && (
        <section className="border border-[var(--border)] rounded-xl bg-white/[0.03] p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Bot className="w-3.5 h-3.5 text-[var(--muted)]" />
            <span className="text-xs font-semibold text-[var(--text)]">Recently used by AI</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] font-bold uppercase tracking-wider">
              auto
            </span>
          </div>
          <div className="space-y-1">
            {recentAiNotes.map((note, i) => {
              const updated = note.updated_time ? new Date(Number(note.updated_time)).toLocaleString() : '';
              return (
                <button
                  key={i}
                  type="button"
                  className="w-full text-left border border-[var(--border)] rounded-lg bg-[var(--hover-bg)] p-2 hover:border-[var(--accent)] transition-colors"
                  onClick={() => {
                    if (note.source && note.id) handlePreview(note.source, note.id);
                  }}
                >
                  <span className="font-medium text-[var(--text)] text-xs">
                    {note.title || note.label || 'Untitled'}
                  </span>
                  <span className="flex items-center gap-1 text-[var(--muted)] text-xs mt-0.5">
                    <Clock className="w-3 h-3" />
                    {note.label || 'Automatic recall'}
                    {updated ? ` · ${updated}` : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Search */}
      <section className="border border-[var(--border)] rounded-xl bg-white/[0.03] p-3 space-y-3">
        <form
          className="flex gap-2 items-center flex-wrap"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSearch();
          }}
        >
          <select
            value={activeSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="h-8 border border-[var(--border)] rounded-lg bg-[var(--panel,var(--surface))] text-[var(--text)] px-2 text-xs"
          >
            {sourceOptions.map((src) => (
              <option key={src.name} value={src.name}>
                {src.label || src.name}
              </option>
            ))}
          </select>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            className="flex-1 min-w-[180px] h-8 border border-[var(--border)] rounded-lg bg-[var(--panel,var(--surface))] text-[var(--text)] px-2 text-xs"
          />
          <button
            type="submit"
            disabled={searchLoading}
            className="h-8 border border-[var(--border)] rounded-lg bg-[var(--panel,var(--surface))] text-[var(--text)] px-3 text-xs font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors disabled:opacity-50"
          >
            {searchLoading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {searchError && <p className="text-xs text-red-400">{searchError}</p>}

        {searchResults.length > 0 ? (
          <div className="space-y-1">
            {searchResults.map((note, i) => (
              <button
                key={i}
                type="button"
                className="w-full text-left border border-[var(--border)] rounded-lg bg-[var(--hover-bg)] p-2 hover:border-[var(--accent)] transition-colors space-y-0.5"
                onClick={() => handlePreview(note.source || activeSource, note.id || '')}
              >
                <span className="font-medium text-[var(--text)] text-xs">{note.title || 'Untitled'}</span>
                {note.snippet && <span className="block text-[var(--muted)] text-xs">{note.snippet}</span>}
              </button>
            ))}
          </div>
        ) : searchQuery && !searchLoading ? (
          <p className="text-[var(--muted)] italic text-xs">No results found.</p>
        ) : !searchQuery ? (
          <p className="text-[var(--muted)] italic text-xs">Search a configured notes source to preview notes here.</p>
        ) : null}
      </section>

      {/* Preview */}
      {previewNote && (
        <section className="border border-[var(--border)] rounded-xl bg-white/[0.03] p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-[var(--text)] text-xs">{previewNote.title || 'Untitled'}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] font-medium">
              {previewNote.source || activeSource}
            </span>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            <MarkdownRenderer content={previewNote.body || ''} />
          </div>
        </section>
      )}

      {/* Source cards */}
      {sources.map((src) => {
        const status = src.active ? 'active' : src.status || 'configured';
        return (
          <section key={src.name} className="border border-[var(--border)] rounded-xl bg-white/[0.03] p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[var(--text)] text-xs">{src.label || src.name}</span>
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                  src.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[var(--accent-bg)] text-[var(--muted)]',
                )}
              >
                {status}
              </span>
            </div>
            <p className="text-xs text-[var(--muted)]">
              {src.tool_count} note tool{src.tool_count === 1 ? '' : 's'} available
            </p>
            {src.tool_source === 'configured_hint' && (
              <p className="text-xs text-[var(--muted)] opacity-70">
                Tool names are expected from this configured source; live schemas will appear when the WebUI runtime
                exposes them.
              </p>
            )}
            {src.tools.length > 0 ? (
              <ul className="ml-4 space-y-0.5 text-xs text-[var(--muted)] list-disc">
                {src.tools.map((tool, i) => (
                  <li key={i}>
                    <strong className="text-[var(--text)]">{tool.name}</strong>
                    {tool.description ? ` — ${tool.description}` : ''}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[var(--muted)] italic text-xs">
                No read/search tools are currently visible for this source.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}

// ── Main Memory Panel ──────────────────────────────────────────────────────

export function MemoryPanel() {
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editDraft, setEditDraft] = useState('');
  const { toast } = useToast();
  const { t: t18n } = useTranslation();

  const { data, mutate } = useSWR<MemoryData>('/memory', fetcher, { revalidateOnFocus: false });

  const sectionContent =
    activeSection && data ? ((data as Record<string, string | undefined>)[activeSection] ?? '') : '';

  const sectionMtime =
    activeSection && data ? (data as Record<string, number | string | undefined>)[`${activeSection}_mtime`] : undefined;

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
      await apiPost('/memory/write', { section: activeSection, content: editDraft });
      setEditMode(false);
      void mutate();
      toast('Memory saved', 'success');
    } catch (err) {
      console.error('Failed to save memory:', err);
      toast('Save failed', 'error');
    }
  }, [activeSection, editDraft, mutate, toast]);

  const formatMtime = (mtime?: number | string) => {
    if (!mtime) return null;
    try {
      // Backend returns epoch seconds; numeric values need *1000
      const ms = typeof mtime === 'number' ? mtime * 1000 : new Date(mtime).getTime();
      return new Date(ms).toLocaleString();
    } catch {
      return String(mtime);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
          <Brain className="w-4 h-4" />
          {t18n('memory.title')}
        </h2>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Section list */}
        <div className="w-48 border-r border-[var(--border)] p-2 space-y-1">
          {SECTIONS.map((s) => {
            if (s.key === 'external_notes' && !data?.external_notes_enabled) return null;
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                onClick={() => handleSelect(s.key)}
                className={cn(
                  'w-full text-left flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors',
                  activeSection === s.key
                    ? 'bg-[var(--accent-bg)] text-[var(--accent)]'
                    : 'text-[var(--text)] hover:bg-[var(--hover-bg)]',
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
          {activeSection === 'external_notes' ? (
            <ExternalNotesView />
          ) : activeSection ? (
            <>
              <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
                <div>
                  <span className="text-sm font-medium text-[var(--text)]">
                    {SECTIONS.find((s) => s.key === activeSection)?.label}
                  </span>
                  {sectionMtime && (
                    <span className="text-xs text-[var(--muted)] ml-2">Modified {formatMtime(sectionMtime)}</span>
                  )}
                </div>
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
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-[var(--muted)]" onClick={startEdit}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
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
                ) : sectionContent ? (
                  <MarkdownRenderer content={sectionContent} />
                ) : (
                  <p className="text-sm text-[var(--muted)] italic">
                    No {SECTIONS.find((s) => s.key === activeSection)?.label.toLowerCase()} yet. Click edit to add
                    content.
                  </p>
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
