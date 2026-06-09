'use client';

import { useAtom } from 'jotai';
import { sidebarCollapsedAtom, workspacePanelOpenAtom, currentMobileViewAtom } from '@/atoms/ui';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface ThreePanelProps {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  workspace: React.ReactNode;
  workspaceOpen?: boolean;
}

export function ThreePanel({ sidebar, main, workspace, workspaceOpen }: ThreePanelProps) {
  const [collapsed] = useAtom(sidebarCollapsedAtom);
  const [wsOpen] = useAtom(workspacePanelOpenAtom);
  const [mobileView, setMobileView] = useAtom(currentMobileViewAtom);
  const isMobile = useIsMobile();
  const showWorkspace = workspaceOpen ?? wsOpen;

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

  return (
    <div className="flex h-full w-full overflow-hidden bg-[var(--bg)]">
      <aside
        className={cn(
          'shrink-0 border-r border-[var(--border)] bg-[var(--sidebar)] transition-all duration-200 overflow-hidden',
          collapsed ? 'w-0' : 'w-64',
        )}
        data-testid="panel-sidebar"
      >
        <div className="w-64 h-full overflow-y-auto">{sidebar}</div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-[var(--main-bg)]" data-testid="panel-main">
        {main}
      </main>

      {showWorkspace && (
        <aside
          className="shrink-0 w-80 border-l border-[var(--border)] bg-[var(--sidebar)] overflow-hidden"
          data-testid="panel-workspace"
        >
          <div className="h-full overflow-y-auto">{workspace}</div>
        </aside>
      )}
    </div>
  );
}
