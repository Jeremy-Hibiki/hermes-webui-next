'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAtom } from 'jotai';
import { useSearchParams } from 'next/navigation';
import { sidebarCollapsedAtom, workspacePanelOpenAtom, currentPanelAtom } from '@/atoms/ui';
import { activeSessionAtom } from '@/atoms/session';
import { messagesAtom } from '@/atoms/chat';
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
import { fetcher } from '@/lib/api-client';
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
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [loginError, setLoginError] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const searchParams = useSearchParams();
  const sid = searchParams.get('sid');

  const [activeSession, setActiveSession] = useAtom(activeSessionAtom);
  const [, setMessages] = useAtom(messagesAtom);

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
        } as any);

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
  }, [sid, panel, setMessages, activeSession?.session_id, setActiveSession]);

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
    escape: () => {},
  });

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
