'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAtom } from 'jotai';
import { useSearchParams, useRouter } from 'next/navigation';
import { sidebarCollapsedAtom, workspacePanelOpenAtom, currentPanelAtom, currentMobileViewAtom } from '@/atoms/ui';
import { activeSessionAtom } from '@/atoms/session';
import { messagesAtom, composerContextAtom } from '@/atoms/chat';
import { ThreePanel } from '@/components/layout/three-panel';
import { RailNav } from '@/components/layout/rail-nav';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { SidebarContent } from '@/components/layout/sidebar-content';
import { MainPanel } from '@/components/layout/main-panel';
import { WorkspacePanel } from '@/components/layout/workspace-panel';
import { AppTitlebar } from '@/components/layout/app-titlebar';
import { OfflineBanner } from '@/components/shared/system-banners';
import { LoginPage } from '@/app/login/login-page';
import { useIsMobile } from '@/hooks/use-mobile';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useMobileSwipe } from '@/hooks/use-mobile-swipe';
import { apiPost, fetcher } from '@/lib/api-client';
import { API_BASE } from '@/lib/constants';
import type { Message } from '@/types';
import { extractTextContent } from '@/types/message';

type AuthState = 'loading' | 'unauthenticated' | 'authenticated' | 'no_auth';

interface AppShellProps {
  panel: string;
}

export function AppShell({ panel }: AppShellProps) {
  const [collapsed, setCollapsed] = useAtom(sidebarCollapsedAtom);
  const [workspaceOpen] = useAtom(workspacePanelOpenAtom);
  const [, setCurrentPanel] = useAtom(currentPanelAtom);
  const [, setCurrentMobileView] = useAtom(currentMobileViewAtom);
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [loginError, setLoginError] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const searchParams = useSearchParams();
  const router = useRouter();
  const sid = searchParams.get('sid');

  const [activeSession, setActiveSession] = useAtom(activeSessionAtom);
  const [, setMessages] = useAtom(messagesAtom);
  const [, setComposerContext] = useAtom(composerContextAtom);

  // Sync panel from route
  useEffect(() => {
    setCurrentPanel(panel);
  }, [panel, setCurrentPanel]);

  // Auth check
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch(`${API_BASE}/auth/status`, { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data.auth_enabled) setAuthState('no_auth');
        else if (data.logged_in) setAuthState('authenticated');
        else setAuthState('unauthenticated');
      } catch {
        setAuthState('no_auth');
      }
    }
    void checkAuth();
    function onUnauthorized() {
      setAuthState('unauthenticated');
    }
    window.addEventListener('hermes:unauthorized', onUnauthorized);
    return () => window.removeEventListener('hermes:unauthorized', onUnauthorized);
  }, []);

  // bfcache restoration: re-sync state when browser restores page from back-forward cache
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      // Re-sync sidebar collapse from localStorage (another tab may have toggled it)
      try {
        const wantCollapsed = localStorage.getItem('hermes-webui-sidebar-collapsed') === '1';
        if (wantCollapsed !== collapsed) setCollapsed(wantCollapsed);
      } catch {
        /* ignore */
      }
      // Clear any open mobile overlays
      setCurrentMobileView('chat');
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [collapsed, setCollapsed]);

  // Load session from URL ?sid=
  useEffect(() => {
    if (panel !== 'chat' || !sid) return;
    if (activeSession?.session_id === sid) return;

    let cancelled = false;
    (async () => {
      try {
        const resp = await fetcher<Record<string, unknown>>(`/session?session_id=${sid}&messages=1`);
        if (cancelled) return;

        // Backend wraps session data in {"session": {...}}
        const data = (resp.session ?? resp) as Record<string, unknown>;

        setActiveSession({
          session_id: data.session_id as string,
          title: data.title as string,
          workspace: data.workspace as string,
          model: data.model as string,
          model_provider: data.model_provider as string,
          message_count: data.message_count as number,
          created_at: data.created_at as string,
          updated_at: data.updated_at as string,
          pinned: data.pinned as boolean,
          archived: data.archived as boolean,
          profile: data.profile as string,
          input_tokens: (data.input_tokens as number) ?? 0,
          output_tokens: (data.output_tokens as number) ?? 0,
          estimated_cost: (data.estimated_cost as number) ?? null,
          cache_read_tokens: (data.cache_read_tokens as number) ?? undefined,
          cache_write_tokens: (data.cache_write_tokens as number) ?? undefined,
          cache_hit_percent: (data.cache_hit_percent as number) ?? undefined,
          context_length: (data.context_length as number) || undefined,
          threshold_tokens: (data.threshold_tokens as number) || undefined,
          last_prompt_tokens: (data.last_prompt_tokens as number) ?? undefined,
        } as any);

        setComposerContext({
          input_tokens: (data.input_tokens as number) ?? 0,
          output_tokens: (data.output_tokens as number) ?? 0,
          estimated_cost: (data.estimated_cost as number) ?? undefined,
          cache_read_tokens: (data.cache_read_tokens as number) ?? undefined,
          cache_write_tokens: (data.cache_write_tokens as number) ?? undefined,
          cache_hit_percent: (data.cache_hit_percent as number) ?? undefined,
          context_length: (data.context_length as number) || undefined,
          threshold_tokens: (data.threshold_tokens as number) || undefined,
          last_prompt_tokens: (data.last_prompt_tokens as number) ?? undefined,
        });

        const raw = Array.isArray(data.messages) ? (data.messages as Message[]) : [];
        const sessionToolCalls = Array.isArray(data.tool_calls) ? (data.tool_calls as any[]) : [];

        const visible = raw
          .filter((m) => {
            if (!m || typeof m !== 'object') return false;
            const role = m.role;
            if (role === 'tool' || role === 'system') return false;
            const text = extractTextContent(m.content);
            return (
              text.length > 0 ||
              (Array.isArray(m.content) && m.content.length > 0) ||
              (m.tool_calls && m.tool_calls.length > 0)
            );
          })
          .map((m, i) => {
            const msg = { ...m, id: m.id || `msg-${i}` };

            // Normalize OpenAI-format tool_calls: {id, function:{name,arguments}}
            if (Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0 && (msg.tool_calls as any[])[0]?.function) {
              msg.tool_calls = (msg.tool_calls as any[]).map((tc: any) => ({
                id: tc.id,
                name: tc.function?.name || tc.name,
                arguments:
                  typeof tc.function?.arguments === 'string'
                    ? tc.function.arguments
                    : JSON.stringify(tc.function?.arguments ?? {}),
              }));
            }

            // Inject session-level tool_calls onto matching assistant messages
            if (
              msg.role === 'assistant' &&
              (!msg.tool_calls || msg.tool_calls.length === 0) &&
              sessionToolCalls.length > 0
            ) {
              const matching = sessionToolCalls.filter((tc: any) => tc.assistant_msg_idx === i);
              if (matching.length > 0) {
                msg.tool_calls = matching.map((tc: any) => ({
                  tid: tc.tid,
                  id: tc.tid || tc.id,
                  name: tc.name,
                  args: tc.args,
                  snippet: tc.snippet,
                  preview: tc.preview,
                  done: tc.done,
                  is_error: tc.is_error,
                  duration: tc.duration,
                }));
              }
            }

            return msg;
          });
        setMessages(visible);
      } catch (err) {
        console.error('Failed to load session from URL:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sid, panel, setMessages, activeSession?.session_id, setActiveSession, setComposerContext]);

  const handleLogin = useCallback(async (password: string) => {
    setLoginError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Login failed');
        return;
      }
      setAuthState('authenticated');
    } catch {
      setLoginError('Failed to connect to server');
    }
  }, []);

  const handlePanelChange = useCallback(
    (p: string) => {
      if (p === panel && !collapsed) setCollapsed(true);
      else {
        setCollapsed(false);
        setCurrentPanel(p);
      }
    },
    [panel, collapsed, setCollapsed, setCurrentPanel],
  );

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    'mod+b': () => setCollapsed((c) => !c),
    'mod+k': async () => {
      // If the current session has no messages and nothing is in flight,
      // just focus the composer rather than creating another empty session.
      const hasMessages = (activeSession?.message_count ?? 0) > 0;
      if (!hasMessages) {
        const textarea = document.querySelector<HTMLTextAreaElement>('[aria-label="Message input"]');
        if (textarea) {
          textarea.focus();
          return;
        }
      }
      try {
        const body: Record<string, unknown> = { profile: activeSession?.profile || 'default' };
        if (activeSession?.workspace) body.workspace = activeSession.workspace;
        const res = await apiPost<Record<string, unknown>>('/session/new', body);
        const session = (res.session ?? res) as Record<string, unknown>;
        const newSid = session.session_id as string;
        if (!newSid) return;
        setActiveSession({
          ...activeSession,
          session_id: newSid,
          title: (session.title as string) ?? activeSession?.title,
        } as any);
        setMessages([]);
        router.push(`/chat?sid=${newSid}`);
      } catch (err) {
        console.error('Failed to create session:', err);
      }
    },
    escape: () => {
      // Cancel any active message edit
      const editArea = document.querySelector('.msg-edit-area');
      if (editArea) {
        const bar = editArea.closest('.msg-row')?.querySelector('.msg-edit-bar');
        const cancel = bar?.querySelector('.msg-edit-cancel') as HTMLElement | null;
        if (cancel) {
          cancel.click();
          return;
        }
      }
      // Close mobile composer config
      const panel = document.getElementById('composerMobileConfigPanel');
      if (panel?.classList.contains('open')) {
        panel.classList.remove('open');
        return;
      }
    },
  });

  // Mobile sidebar swipe gesture (PWA only)
  useMobileSwipe(() => setCurrentMobileView('sidebar'));

  if (authState === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--bg)]">
        <div className="text-[var(--muted)] text-sm">Loading...</div>
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    return <LoginPage onLogin={handleLogin} error={loginError} />;
  }

  const isChat = panel === 'chat';
  const showWorkspace = isChat && workspaceOpen;

  return (
    <div className={`flex flex-col h-screen w-full overflow-hidden ${isMobile ? 'pb-14' : ''}`}>
      <OfflineBanner />
      <AppTitlebar />
      <div className="flex flex-1 min-h-0">
        {!isMobile && <RailNav activePanel={panel} onPanelChange={handlePanelChange} />}
        <ThreePanel
          sidebar={<SidebarContent />}
          main={isChat ? <MainPanel /> : undefined}
          workspace={showWorkspace ? <WorkspacePanel /> : undefined}
        />
        {isMobile && <MobileBottomNav />}
      </div>
    </div>
  );
}
