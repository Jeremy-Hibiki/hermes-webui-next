'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAtom } from 'jotai';
import useSWR from 'swr';
import { fetcher, apiPost } from '@/lib/api-client';
import { activeProfileAtom, defaultModelAtom, assistantDisplayNameAtom } from '@/atoms/settings';
import { activeSessionAtom, sessionsListAtom } from '@/atoms/session';
import { busyAtom } from '@/atoms/chat';
import { ChevronDown, User, Check } from 'lucide-react';
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
            <div className="text-[15px] font-semibold text-[var(--text)] truncate tracking-tight">
              {activeSession.title || 'Untitled'}
            </div>
            <div className="text-[11px] text-[var(--muted)] mt-0.5 opacity-75 truncate">
              {activeSession.model || activeSession.profile || displayName}
              {activeSession.message_count != null && ` · ${activeSession.message_count} messages`}
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
