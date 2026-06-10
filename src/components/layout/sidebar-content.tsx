'use client';

import { useAtom } from 'jotai';
import { currentPanelAtom } from '@/atoms/ui';
import { Sidebar } from '@/components/layout/sidebar';
import { CronPanel } from '@/components/panels/cron-panel';
import { SkillsPanel } from '@/components/panels/skills-panel';
import { MemoryPanel } from '@/components/panels/memory-panel';
import { TodoPanel } from '@/components/panels/todo-panel';
import { SettingsPanel } from '@/components/panels/settings-panel';
import { InsightsPanel } from '@/components/panels/insights-panel';
import { KanbanBoard } from '@/components/panels/kanban-board';
import { ProfilePanel } from '@/components/panels/profile-panel';
import { LogsPanel } from '@/components/panels/logs-panel';
import { WorkspacesPanel } from '@/components/panels/workspaces-panel';

function getPanelComponent(panelId: string) {
  switch (panelId) {
    case 'tasks':
      return <CronPanel />;
    case 'kanban':
      return <KanbanBoard />;
    case 'skills':
      return <SkillsPanel />;
    case 'memory':
      return <MemoryPanel />;
    case 'todos':
      return <TodoPanel />;
    case 'settings':
      return <SettingsPanel />;
    case 'insights':
      return <InsightsPanel />;
    case 'profiles':
      return <ProfilePanel />;
    case 'logs':
      return <LogsPanel />;
    case 'workspaces':
      return <WorkspacesPanel />;
    default:
      return null;
  }
}

export function SidebarContent() {
  const [currentPanel] = useAtom(currentPanelAtom);

  if (currentPanel === 'chat') {
    return <Sidebar />;
  }

  const content = getPanelComponent(currentPanel);

  if (!content) {
    return <Sidebar />;
  }

  return content;
}
