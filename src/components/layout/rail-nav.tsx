'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import {
  MessageSquare,
  ListChecks,
  KanbanSquare,
  Layers,
  Brain,
  FolderOpen,
  User,
  ClipboardList,
  BarChart3,
  FileText,
  Settings,
} from 'lucide-react';

interface NavItem {
  id: string;
  path: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'chat', path: '/chat', labelKey: 'session.new', icon: MessageSquare },
  { id: 'tasks', path: '/tasks', labelKey: 'cron.title', icon: ListChecks },
  { id: 'kanban', path: '/kanban', labelKey: 'kanban.title', icon: KanbanSquare },
  { id: 'skills', path: '/skills', labelKey: 'skills.title', icon: Layers },
  { id: 'memory', path: '/memory', labelKey: 'memory.title', icon: Brain },
  { id: 'workspaces', path: '/workspaces', labelKey: 'workspaces.title', icon: FolderOpen },
  { id: 'profiles', path: '/profiles', labelKey: 'profiles.title', icon: User },
  { id: 'todos', path: '/todos', labelKey: 'todo.title', icon: ClipboardList },
  { id: 'insights', path: '/insights', labelKey: 'insights.title', icon: BarChart3 },
  { id: 'logs', path: '/logs', labelKey: 'logs.title', icon: FileText },
];
const SETTINGS_ITEM: NavItem = { id: 'settings', path: '/settings', labelKey: 'settings.title', icon: Settings };

function RailTooltip({ children, text }: { children: React.ReactNode; text: string }) {
  const [show, setShow] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      className="relative has-tooltip"
      onMouseEnter={() => {
        timeoutRef.current = setTimeout(() => setShow(true), 150);
      }}
      onMouseLeave={() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setShow(false);
      }}
    >
      {children}
      {show && (
        <div
          className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 text-[11px] font-medium text-[var(--text)] whitespace-nowrap rounded-md z-50 pointer-events-none"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--accent-bg-strong, var(--accent-bg))',
            boxShadow: '0 8px 24px rgba(0,0,0,.65)',
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}

export function RailNav({ onPanelChange }: { activePanel?: string; onPanelChange?: (panel: string) => void }) {
  const { t: t18n } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();

  const currentRoute = pathname.split('/')[1] || 'chat';

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = currentRoute === item.id;
    const label = t18n(item.labelKey);
    return (
      <RailTooltip key={item.id} text={label}>
        <button
          aria-label={label}
          onClick={() => {
            onPanelChange?.(item.id);
            router.push(item.path);
          }}
          className={cn(
            'flex items-center justify-center w-9 h-9 rounded-lg transition-colors relative',
            isActive
              ? 'text-[var(--accent-text)] bg-[var(--accent-bg)]'
              : 'text-[var(--muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text)]',
          )}
        >
          {isActive && (
            <span className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[var(--accent)] rounded-r-sm" />
          )}
          <Icon className="w-[18px] h-[18px]" />
        </button>
      </RailTooltip>
    );
  };

  return (
    <nav className="flex flex-col items-center gap-1 py-2 w-12 bg-[var(--sidebar)] border-r border-[var(--border)]">
      {NAV_ITEMS.map(renderItem)}
      <div className="flex-1 min-h-2" />
      {renderItem(SETTINGS_ITEM)}
    </nav>
  );
}
