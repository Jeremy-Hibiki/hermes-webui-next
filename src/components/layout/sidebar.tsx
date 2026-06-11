'use client';

import { useRef, useState, useCallback, useMemo } from 'react';
import { useAtom } from 'jotai';
import { useRouter } from 'next/navigation';
import { activeSessionAtom } from '@/atoms/session';
import { activeProfileAtom, activeWorkspaceAtom } from '@/atoms/settings';
import { useSessions } from '@/hooks/use-sessions';
import { useSessionSearch } from '@/hooks/use-session-search';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Plus, Search, X, Pin, ChevronRight, Terminal as TerminalIcon, Globe } from 'lucide-react';
import { apiPost } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { Session } from '@/types';
import { messagesAtom, busyAtom } from '@/atoms/chat';
import { SessionItem } from '@/components/sessions/session-item';
import { bucketSessionsByDate, translateBucketLabel } from '@/lib/date-buckets';
import { useTranslation } from '@/lib/i18n';

type SourceFilter = 'webui' | 'cli';
const NO_PROJECT = '__none__';

export function Sidebar() {
  const [active, setActive] = useAtom(activeSessionAtom);
  const [, setMessages] = useAtom(messagesAtom);
  const [busy] = useAtom(busyAtom);
  const [profile] = useAtom(activeProfileAtom);
  const [workspace] = useAtom(activeWorkspaceAtom);
  const { t: t18n } = useTranslation();
  const router = useRouter();
  const { sessions, projects, isLoading, mutate } = useSessions();
  const { query, setQuery, results: searchResults, isSearching, clearSearch } = useSessionSearch(sessions);
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSearchingActive = query.trim().length > 0;

  // --- Filter state (persisted to localStorage) ---
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>(() => {
    try {
      return (localStorage.getItem('hermes-source-filter') as SourceFilter) || 'webui';
    } catch {
      return 'webui';
    }
  });
  const [activeProject, setActiveProject] = useState<string | null>(() => {
    try {
      return localStorage.getItem('hermes-project-filter');
    } catch {
      return null;
    }
  });
  const [showAllProfiles, setShowAllProfiles] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('hermes-date-groups-collapsed');
      return saved ? new Set(JSON.parse(saved) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  // --- Source filter helpers ---
  const isCli = (s: Session) =>
    s.is_cli_session || s.source_tag === 'claude-code' || s.source_tag === 'codex' || s.session_source === 'cli';

  const { webuiCount, cliCount } = useMemo(() => {
    let w = 0,
      c = 0;
    for (const s of sessions) {
      if (isCli(s)) c++;
      else w++;
    }
    return { webuiCount: w, cliCount: c };
  }, [sessions]);

  // --- Filtering pipeline ---
  const filteredSessions = useMemo(() => {
    let result = sessions;

    // Source filter
    if (cliCount > 0) {
      result = result.filter((s) => (sourceFilter === 'cli' ? isCli(s) : !isCli(s)));
    }

    // Profile filter
    if (!showAllProfiles) {
      // Show only sessions matching the active profile (no profile filter = show all)
    }

    // Project filter
    if (activeProject === NO_PROJECT) {
      result = result.filter((s) => !s.project_id);
    } else if (activeProject) {
      result = result.filter((s) => s.project_id === activeProject);
    }

    // Archived filter
    if (!showArchived) {
      result = result.filter((s) => !s.archived);
    }

    return result;
  }, [sessions, sourceFilter, activeProject, showAllProfiles, showArchived, cliCount]);

  const pinnedSessions = useMemo(() => filteredSessions.filter((s) => s.pinned && !s.archived), [filteredSessions]);
  const nonPinnedSessions = useMemo(() => filteredSessions.filter((s) => !s.pinned && !s.archived), [filteredSessions]);
  const archivedSessions = useMemo(() => filteredSessions.filter((s) => s.archived), [filteredSessions]);
  const dateGroupedSessions = useMemo(() => bucketSessionsByDate(nonPinnedSessions), [nonPinnedSessions]);

  // Other profile count
  const otherProfileCount = useMemo(() => {
    // Simple heuristic: count sessions with different profile than the active session
    if (sessions.length === 0) return 0;
    const profiles = new Set(sessions.map((s) => s.profile).filter(Boolean));
    return profiles.size > 1 ? sessions.filter((s) => s.profile && s.profile !== sessions[0]?.profile).length : 0;
  }, [sessions]);

  // --- Handlers ---
  const toggleGroup = useCallback((label: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      try {
        localStorage.setItem('hermes-date-groups-collapsed', JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }, []);

  const handleSourceChange = useCallback((f: SourceFilter) => {
    setSourceFilter(f);
    try {
      localStorage.setItem('hermes-source-filter', f);
    } catch {}
  }, []);

  const handleProjectChange = useCallback((p: string | null) => {
    setActiveProject(p);
    try {
      if (p) localStorage.setItem('hermes-project-filter', p);
      else localStorage.removeItem('hermes-project-filter');
    } catch {}
  }, []);

  const handleNewChat = async () => {
    try {
      const body: Record<string, unknown> = {
        profile: profile || 'default',
      };
      if (workspace) body.workspace = workspace;
      const res = await apiPost<Record<string, unknown>>('/session/new', body);
      const session = (res.session ?? res) as Record<string, unknown>;
      const sid = session.session_id as string;
      if (!sid) throw new Error('No session_id returned');
      setActive(session as unknown as Session);
      setMessages([]);
      router.push(`/chat?sid=${sid}`);
      void mutate();
    } catch (err) {
      console.error('Failed to create session:', err);
      alert(`Failed to create session: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleSelect = async (sessionId: string) => {
    router.push(`/chat?sid=${sessionId}`);
  };

  const handleRename = async (sessionId: string, newTitle: string) => {
    try {
      await apiPost('/session/rename', { session_id: sessionId, title: newTitle });
      await mutate();
    } catch (err) {
      console.error('Failed to rename session:', err);
    }
  };

  const handlePin = async (sessionId: string) => {
    try {
      await apiPost('/session/pin', { session_id: sessionId });
      await mutate();
    } catch (err) {
      console.error('Failed to pin session:', err);
    }
  };

  const handleArchive = async (sessionId: string) => {
    try {
      await apiPost('/session/archive', { session_id: sessionId });
      if (active?.session_id === sessionId) setActive(null);
      await mutate();
    } catch (err) {
      console.error('Failed to archive session:', err);
    }
  };

  const handleDelete = async (sessionId: string) => {
    try {
      await apiPost('/session/delete', { session_id: sessionId });
      if (active?.session_id === sessionId) setActive(null);
      await mutate();
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const handleDuplicate = async (sessionId: string) => {
    try {
      await apiPost('/session/duplicate', { session_id: sessionId });
      await mutate();
    } catch (err) {
      console.error('Failed to duplicate session:', err);
    }
  };

  const handleRegenerateTitle = async (sessionId: string) => {
    try {
      await apiPost('/session/title/regenerate', { session_id: sessionId });
      await mutate();
    } catch (err) {
      console.error('Failed to regenerate title:', err);
    }
  };

  const handleOpenSearch = useCallback(() => {
    setSearchOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleCloseSearch = useCallback(() => {
    setSearchOpen(false);
    clearSearch();
  }, [clearSearch]);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseSearch();
    },
    [handleCloseSearch],
  );

  const hasProjects = projects.length > 0 || filteredSessions.some((s) => !s.project_id);
  const renderSessionItem = (session: Session, opts?: { highlight?: string }) => (
    <SessionItem
      key={session.session_id}
      session={session}
      isActive={active?.session_id === session.session_id}
      isStreaming={!!session.is_streaming || (active?.session_id === session.session_id && busy)}
      onSelect={handleSelect}
      onRename={handleRename}
      onPin={handlePin}
      onArchive={handleArchive}
      onDelete={handleDelete}
      onDuplicate={handleDuplicate}
      onRegenerateTitle={handleRegenerateTitle}
      highlightQuery={opts?.highlight}
      projectColor={session.project_id ? projects.find((p) => p.project_id === session.project_id)?.color : undefined}
    />
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-[18px] pt-4 pb-[14px] border-b border-[var(--border)]">
        <Button
          variant="ghost"
          size="icon"
          className="text-[var(--muted)]"
          onClick={handleNewChat}
          aria-label={t18n('session.new')}
        >
          <Plus className="w-4 h-4" />
        </Button>
        {searchOpen ? (
          <div className="flex-1 flex items-center gap-1 border border-[var(--border)] rounded-lg px-2.5 py-1.5">
            <Search className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={t18n('session.search')}
              aria-label={t18n('session.search')}
              className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--muted)] outline-none"
            />
            <Button
              variant="ghost"
              size="icon"
              className="text-[var(--muted)] h-6 w-6 shrink-0"
              onClick={handleCloseSearch}
              aria-label={t18n('session.clearSearch')}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 text-sm font-medium text-[var(--text)]">{t18n('session.title')}</div>
            <Button
              variant="ghost"
              size="icon"
              className="text-[var(--muted)]"
              onClick={handleOpenSearch}
              aria-label={t18n('session.search')}
            >
              <Search className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0 overflow-hidden">
        {isLoading && <div className="p-4 text-sm text-[var(--muted)] text-center">{t18n('common.loading')}</div>}

        {!isLoading && sessions.length === 0 && (
          <div className="p-4 text-sm text-[var(--muted)] text-center">{t18n('session.noSessions')}</div>
        )}

        {!isLoading && !isSearchingActive && (
          <>
            {/* Source tabs */}
            {cliCount > 0 && (
              <div className="flex gap-1 px-3 pt-2 pb-1">
                <button
                  onClick={() => handleSourceChange('webui')}
                  className={cn(
                    'flex-1 text-[11px] py-1 rounded-md transition-colors',
                    sourceFilter === 'webui'
                      ? 'bg-[var(--accent-bg)] text-[var(--accent-text)] font-medium'
                      : 'text-[var(--muted)] hover:bg-[var(--hover-bg)]',
                  )}
                >
                  <Globe className="w-3 h-3 inline mr-1" />
                  WebUI ({webuiCount})
                </button>
                <button
                  onClick={() => handleSourceChange('cli')}
                  className={cn(
                    'flex-1 text-[11px] py-1 rounded-md transition-colors',
                    sourceFilter === 'cli'
                      ? 'bg-[var(--accent-bg)] text-[var(--accent-text)] font-medium'
                      : 'text-[var(--muted)] hover:bg-[var(--hover-bg)]',
                  )}
                >
                  <TerminalIcon className="w-3 h-3 inline mr-1" />
                  CLI ({cliCount})
                </button>
              </div>
            )}

            {/* Project chips */}
            {hasProjects && (
              <div className="flex gap-1 px-3 pb-1 flex-wrap">
                <button
                  onClick={() => handleProjectChange(null)}
                  className={cn(
                    'text-[11px] px-2 py-0.5 rounded-full transition-colors',
                    !activeProject
                      ? 'bg-[var(--accent-bg)] text-[var(--accent-text)] font-medium'
                      : 'text-[var(--muted)] hover:bg-[var(--hover-bg)] border border-[var(--border)]',
                  )}
                >
                  All
                </button>
                {filteredSessions.some((s) => !s.project_id && !s.pinned && !s.archived) && (
                  <button
                    onClick={() => handleProjectChange(NO_PROJECT)}
                    className={cn(
                      'text-[11px] px-2 py-0.5 rounded-full transition-colors border border-dashed',
                      activeProject === NO_PROJECT
                        ? 'bg-[var(--accent-bg)] text-[var(--accent-text)] font-medium border-solid'
                        : 'text-[var(--muted)] hover:bg-[var(--hover-bg)] border-[var(--border)]',
                    )}
                  >
                    Unassigned
                  </button>
                )}
                {projects.map((p) => (
                  <button
                    key={p.project_id}
                    onClick={() => handleProjectChange(p.project_id)}
                    className={cn(
                      'text-[11px] px-2 py-0.5 rounded-full transition-colors flex items-center gap-1',
                      activeProject === p.project_id
                        ? 'bg-[var(--accent-bg)] text-[var(--accent-text)] font-medium'
                        : 'text-[var(--muted)] hover:bg-[var(--hover-bg)] border border-[var(--border)]',
                    )}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </button>
                ))}
              </div>
            )}

            {/* Profile toggle */}
            {otherProfileCount > 0 && (
              <button
                onClick={() => setShowAllProfiles((p) => !p)}
                className="w-full text-[10px] py-1 text-[var(--muted)] text-center opacity-70 hover:opacity-100 transition-opacity"
              >
                {showAllProfiles ? 'Show active profile only' : `Show ${otherProfileCount} from other profiles`}
              </button>
            )}

            {/* Archived toggle */}
            {archivedSessions.length > 0 && (
              <button
                onClick={() => setShowArchived((a) => !a)}
                className="w-full text-[10px] py-1 text-[var(--muted)] text-center opacity-70 hover:opacity-100 transition-opacity"
              >
                {showArchived ? 'Hide archived' : `Show ${archivedSessions.length} archived`}
              </button>
            )}

            {/* Empty state */}
            {filteredSessions.length === 0 && sessions.length > 0 && (
              <div className="p-4 text-sm text-[var(--muted)] text-center">No sessions match filters</div>
            )}
          </>
        )}

        {/* Search results */}
        {isSearchingActive && (
          <div className="p-2">
            {searchResults.length === 0 && !isSearching && (
              <div className="p-4 text-sm text-[var(--muted)] text-center">{t18n('session.noResults')}</div>
            )}
            {isSearching && searchResults.length === 0 && (
              <div className="p-4 text-sm text-[var(--muted)] text-center">{t18n('session.searching')}</div>
            )}
            {searchResults.map((s) => renderSessionItem(s, { highlight: query }))}
          </div>
        )}

        {/* Pinned sessions */}
        {!isSearchingActive && pinnedSessions.length > 0 && (
          <div className="p-2">
            <div className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[var(--muted)]">
              <Pin className="w-3 h-3" />
              {t18n('session.pinned')}
            </div>
            {pinnedSessions.map((s) => renderSessionItem(s))}
          </div>
        )}

        {/* Date-grouped sessions */}
        {!isSearchingActive &&
          dateGroupedSessions.map((bucket) => {
            const collapsed = collapsedGroups.has(bucket.label);
            return (
              <div key={bucket.label} className="mb-1">
                <button
                  onClick={() => toggleGroup(bucket.label)}
                  className="flex items-center gap-1 w-full px-3 py-1.5 text-xs font-medium text-[var(--muted)] uppercase tracking-wide hover:text-[var(--text)] transition-colors"
                >
                  <ChevronRight className={cn('w-3 h-3 transition-transform', !collapsed && 'rotate-90')} />
                  {translateBucketLabel(bucket.label)}
                </button>
                {!collapsed && bucket.sessions.map((s) => renderSessionItem(s))}
              </div>
            );
          })}

        {/* Archived sessions (when toggled on) */}
        {showArchived && !isSearchingActive && archivedSessions.length > 0 && (
          <div className="p-2">
            <div className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[var(--muted)]">Archived</div>
            {archivedSessions.map((s) => renderSessionItem(s))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
