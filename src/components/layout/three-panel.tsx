'use client';

import { useAtom } from 'jotai';
import { sidebarCollapsedAtom, workspacePanelOpenAtom, currentMobileViewAtom } from '@/atoms/ui';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useRef, useEffect, useCallback } from 'react';

interface ThreePanelProps {
  sidebar: React.ReactNode;
  main?: React.ReactNode;
  workspace?: React.ReactNode;
  workspaceOpen?: boolean;
}

const SIDEBAR_MIN = 180;
const SIDEBAR_MAX = 420;
const PANEL_MIN = 180;
const PANEL_MAX = 1200;

export function ThreePanel({ sidebar, main, workspace, workspaceOpen }: ThreePanelProps) {
  const [collapsed] = useAtom(sidebarCollapsedAtom);
  const [wsOpen] = useAtom(workspacePanelOpenAtom);
  const [mobileView, setMobileView] = useAtom(currentMobileViewAtom);
  const isMobile = useIsMobile();
  const showWorkspace = workspaceOpen ?? wsOpen;
  const sidebarRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  // Restore saved widths on mount
  useEffect(() => {
    const savedSidebar = localStorage.getItem('hermes-sidebar-w');
    if (savedSidebar && sidebarRef.current) {
      const w = parseInt(savedSidebar, 10);
      if (!Number.isNaN(w) && w > 0) sidebarRef.current.style.width = `${w}px`;
    }
    const savedPanel = localStorage.getItem('hermes-panel-w');
    if (savedPanel && workspaceRef.current) {
      const w = parseInt(savedPanel, 10);
      if (!Number.isNaN(w) && w > 0) workspaceRef.current.style.width = `${w}px`;
    }
  }, []);

  const startResize = useCallback(
    (
      e: React.MouseEvent,
      edge: 'right' | 'left',
      targetRef: React.RefObject<HTMLDivElement | null>,
      minW: number,
      maxW: number,
      storageKey: string,
    ) => {
      e.preventDefault();
      const target = targetRef.current;
      if (!target) return;
      const startX = e.clientX;
      const startW = target.getBoundingClientRect().width;
      document.body.classList.add('resizing');

      const onMove = (ev: MouseEvent) => {
        const delta = edge === 'right' ? ev.clientX - startX : startX - ev.clientX;
        const newW = Math.min(maxW, Math.max(minW, startW + delta));
        target.style.width = `${newW}px`;
      };
      const onUp = () => {
        document.body.classList.remove('resizing');
        localStorage.setItem(storageKey, String(parseInt(target.style.width, 10)));
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [],
  );

  if (isMobile) {
    return (
      <div className="flex h-full w-full overflow-hidden bg-[var(--bg)]">
        {/* Mobile: full-width main */}
        <main className="flex-1 flex flex-col min-w-0 bg-[var(--main-bg)]" data-testid="panel-main">
          {main}
        </main>

        {/* Mobile sidebar overlay */}
        {mobileView === 'sidebar' && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-[199]"
              onClick={() => setMobileView('chat')}
              aria-hidden="true"
            />
            <aside
              className="fixed inset-y-0 left-0 w-80 z-[200] bg-[var(--sidebar)] border-r border-[var(--border)] animate-slide-in-left overflow-y-auto"
              data-testid="panel-sidebar"
            >
              {sidebar}
            </aside>
          </>
        )}

        {/* Mobile workspace overlay */}
        {mobileView === 'workspace' && showWorkspace && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-[199]"
              onClick={() => setMobileView('chat')}
              aria-hidden="true"
            />
            <aside
              className="fixed inset-y-0 right-0 w-80 z-[200] bg-[var(--sidebar)] border-l border-[var(--border)] animate-slide-in-right overflow-y-auto"
              data-testid="panel-workspace"
            >
              {workspace}
            </aside>
          </>
        )}
      </div>
    );
  }

  const sidebarExpanded = !main;

  return (
    <div className="flex h-full w-full overflow-hidden bg-[var(--bg)]">
      <aside
        ref={sidebarRef}
        className={cn(
          'relative shrink-0 border-r border-[var(--border)] bg-[var(--sidebar)] overflow-hidden',
          collapsed && !sidebarExpanded
            ? 'w-0 opacity-0 -translate-x-[14px]'
            : sidebarExpanded
              ? 'flex-1'
              : 'w-[300px]',
        )}
        style={{
          transition:
            'width .24s cubic-bezier(.22,1,.36,1), opacity .18s ease, transform .24s cubic-bezier(.22,1,.36,1)',
        }}
        data-testid="panel-sidebar"
      >
        <div className="h-full overflow-y-auto w-full">{sidebar}</div>
        {!sidebarExpanded && (
          <div
            className="resize-handle sidebar-resize"
            onMouseDown={(e) => startResize(e, 'right', sidebarRef, SIDEBAR_MIN, SIDEBAR_MAX, 'hermes-sidebar-w')}
            aria-hidden="true"
          />
        )}
      </aside>

      {main && (
        <main className="flex-1 flex flex-col min-w-0 bg-[var(--main-bg)]" data-testid="panel-main">
          {main}
        </main>
      )}

      {showWorkspace && (
        <aside
          ref={workspaceRef}
          className="relative shrink-0 w-[300px] border-l border-[var(--border)] bg-[var(--sidebar)] overflow-hidden"
          style={{
            transition:
              'width .24s cubic-bezier(.22,1,.36,1), opacity .18s ease, transform .24s cubic-bezier(.22,1,.36,1)',
          }}
          data-testid="panel-workspace"
        >
          <div className="h-full overflow-y-auto">{workspace}</div>
          <div
            className="resize-handle workspace-resize"
            onMouseDown={(e) => startResize(e, 'left', workspaceRef, PANEL_MIN, PANEL_MAX, 'hermes-panel-w')}
            aria-hidden="true"
          />
        </aside>
      )}
    </div>
  );
}
