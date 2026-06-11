'use client';

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import { useAtom } from 'jotai';
import useSWR from 'swr';
import { fetcher, apiPost } from '@/lib/api-client';
import { activeProfileAtom, defaultModelAtom, assistantDisplayNameAtom } from '@/atoms/settings';
import { activeSessionAtom, sessionsListAtom } from '@/atoms/session';
import { busyAtom } from '@/atoms/chat';
import { ChevronDown, User, Check, Terminal as TerminalIcon, Globe, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';

interface ProfileEntry {
  name: string;
  model?: string;
  provider?: string;
  is_default?: boolean;
}

interface ProfilesResponse {
  profiles: ProfileEntry[];
  active: string;
}

export function TopBar() {
  const [profile, setProfile] = useAtom(activeProfileAtom);
  const [displayName] = useAtom(assistantDisplayNameAtom);
  const [, setDefaultModel] = useAtom(defaultModelAtom);
  const [activeSession, setActiveSession] = useAtom(activeSessionAtom);
  const [sessions, setSessions] = useAtom(sessionsListAtom);
  const [busy] = useAtom(busyAtom);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data, mutate: mutateProfiles } = useSWR<ProfilesResponse>('/profiles', fetcher, {
    revalidateOnFocus: false,
  });

  const profiles = data?.profiles ?? [];
  const active = data?.active ?? profile;

  // Editable title state
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  // Sync document.title
  useEffect(() => {
    if (activeSession?.title) {
      document.title = `${activeSession.title} — ${displayName}`;
    } else {
      document.title = displayName;
    }
  }, [activeSession?.title, displayName]);

  const startEditTitle = useCallback(() => {
    setTitleDraft(activeSession?.title || '');
    setEditing(true);
  }, [activeSession?.title]);

  const submitTitle = useCallback(async () => {
    setEditing(false);
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== (activeSession?.title || '') && activeSession?.session_id) {
      try {
        await apiPost('/session/rename', { session_id: activeSession.session_id, title: trimmed });
        setActiveSession({ ...activeSession, title: trimmed } as typeof activeSession);
      } catch {}
    }
  }, [titleDraft, activeSession, setActiveSession]);

  const handleTitleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        void submitTitle();
      } else if (e.key === 'Escape') setEditing(false);
    },
    [submitTitle],
  );

  // Source badge for session
  const sourceBadge = (() => {
    if (!activeSession) return null;
    const src = activeSession.raw_source || activeSession.session_source;
    const tag = activeSession.source_tag;
    const label = activeSession.source_label;
    // Suppress "WebUI" source label
    if (label && /^webui$/i.test(label)) return null;
    if (src === 'cli' || activeSession.is_cli_session || tag === 'claude-code' || tag === 'codex')
      return (
        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/25">
          <TerminalIcon className="w-2.5 h-2.5" />
          CLI{activeSession.read_only ? ' · read-only' : ''}
        </span>
      );
    if (src === 'cron' || tag === 'cron')
      return (
        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25">
          <Zap className="w-2.5 h-2.5" />
          Cron
        </span>
      );
    if (src === 'api' || tag === 'api')
      return (
        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/25">
          <Globe className="w-2.5 h-2.5" />
          API
        </span>
      );
    if (activeSession.read_only)
      return (
        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--hover-bg)] text-[var(--muted)] border border-[var(--border)]">
          read-only
        </span>
      );
    return null;
  })();

  // Close dropdown on click outside
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const handleSwitch = useCallback(
    async (name: string) => {
      try {
        const res = await apiPost<{
          active: string;
          default_model?: string;
          default_model_provider?: string;
          default_workspace?: string;
        }>('/profile/switch', { name });

        setProfile(res.active);
        if (res.default_model) setDefaultModel(res.default_model);

        // If session is in progress, create a new session for the new profile
        if (busy && activeSession) {
          try {
            const newSessionRes = await apiPost<{ session: { session_id: string; title: string } }>('/session/new', {
              profile: res.active,
            });
            const newSession = newSessionRes.session ?? newSessionRes;
            // Refresh sessions list
            const sessionsRes = await fetcher<{ sessions: typeof sessions }>('/sessions');
            setSessions(sessionsRes.sessions ?? []);
            // Set new session as active
            setActiveSession({
              ...activeSession,
              session_id: newSession.session_id,
              title: newSession.title ?? activeSession?.title,
              profile: res.active,
            });
          } catch {
            // If new session creation fails, just continue with profile switch
          }
        }

        void mutateProfiles();
        setDropdownOpen(false);
        toast(`Switched to ${name}`, 'success');
      } catch (err) {
        toast(`Switch failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
      }
    },
    [busy, activeSession, setProfile, setDefaultModel, mutateProfiles, setSessions, setActiveSession, toast],
  );

  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] bg-[var(--topbar-bg)] shrink-0 backdrop-blur-xl">
      <div className="min-w-0">
        {activeSession ? (
          <>
            <div className="flex items-center gap-2">
              {editing ? (
                <input
                  ref={titleRef}
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={() => void submitTitle()}
                  onKeyDown={handleTitleKeyDown}
                  className="text-[15px] font-semibold text-[var(--text)] bg-[var(--input-bg)] border border-[var(--accent)] rounded px-2 py-0.5 outline-none min-w-0 w-full"
                  autoFocus
                />
              ) : (
                <button
                  onDoubleClick={startEditTitle}
                  className="text-[15px] font-semibold text-[var(--text)] truncate tracking-tight hover:text-[var(--accent)] transition-colors text-left"
                  title="Double-click to rename"
                >
                  {activeSession.title || 'Untitled'}
                </button>
              )}
              {sourceBadge}
            </div>
            <div className="text-[11px] text-[var(--muted)] mt-0.5 opacity-75 truncate">
              {activeSession.model || activeSession.profile || displayName}
              {activeSession.message_count != null && activeSession.message_count > 0 && (
                <>
                  {' · '}
                  {activeSession._messagesTruncated
                    ? `${activeSession.message_count} messages (truncated)`
                    : `${activeSession.message_count} messages`}
                </>
              )}
            </div>
          </>
        ) : (
          <div className="text-[15px] font-semibold text-[var(--text)] tracking-tight">{displayName}</div>
        )}
      </div>

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors px-2 py-1 rounded hover:bg-[var(--hover-bg)]"
          aria-label="Switch profile"
        >
          <User className="w-3.5 h-3.5" />
          <span className="capitalize">{active}</span>
          <ChevronDown className={cn('w-3 h-3 transition-transform', dropdownOpen && 'rotate-180')} />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg z-50 py-1">
            <div className="px-3 py-1.5 text-[10px] font-medium text-[var(--muted)] uppercase tracking-wide">
              Profiles
            </div>
            {profiles.map((p) => (
              <button
                key={p.name}
                onClick={() => {
                  if (p.name !== active) void handleSwitch(p.name);
                  else setDropdownOpen(false);
                }}
                className={cn(
                  'w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--hover-bg)] flex items-center gap-2 transition-colors',
                  p.name === active && 'text-[var(--accent)]',
                )}
              >
                <span className="flex-1 truncate">{p.name}</span>
                {p.name === active && <Check className="w-3 h-3 shrink-0" />}
              </button>
            ))}
            {profiles.length === 0 && (
              <div className="px-3 py-2 text-xs text-[var(--muted)] text-center">No profiles</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
