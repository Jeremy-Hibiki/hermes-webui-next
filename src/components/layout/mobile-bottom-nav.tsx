'use client';

import { useAtom } from 'jotai';
import { currentMobileViewAtom, currentPanelAtom } from '@/atoms/ui';
import { cn } from '@/lib/utils';
import { MessageSquare, ListChecks, FolderOpen, Terminal, Settings } from 'lucide-react';

interface MobileNavItem {
  id: string;
  view: 'sidebar' | 'chat' | 'workspace';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MOBILE_NAV: MobileNavItem[] = [
  { id: 'chat', view: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'tasks', view: 'sidebar', label: 'Tasks', icon: ListChecks },
  { id: 'workspaces', view: 'workspace', label: 'Files', icon: FolderOpen },
  { id: 'terminal', view: 'sidebar', label: 'Terminal', icon: Terminal },
  { id: 'settings', view: 'sidebar', label: 'Settings', icon: Settings },
];

export function MobileBottomNav() {
  const [, setMobileView] = useAtom(currentMobileViewAtom);
  const [panel, setPanel] = useAtom(currentPanelAtom);

  return (
    <nav
      className="fixed bottom-0 inset-x-0 h-14 z-50 flex items-center justify-around bg-[var(--sidebar)] border-t border-[var(--border)] safe-area-bottom"
      aria-label="Mobile navigation"
    >
      {MOBILE_NAV.map((item) => {
        const Icon = item.icon;
        const isActive = item.id === 'chat' ? panel === 'chat' || panel === '' : panel === item.id;
        return (
          <button
            key={item.id}
            aria-label={item.label}
            onClick={() => {
              setPanel(item.id);
              setMobileView(item.view);
            }}
            className={cn(
              'flex flex-col items-center justify-center w-11 h-11 rounded-lg transition-colors',
              isActive ? 'text-[var(--accent)]' : 'text-[var(--muted)] hover:text-[var(--text)]',
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
