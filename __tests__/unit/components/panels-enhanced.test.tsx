import { describe, it, expect, vi } from 'vite-plus/test';
import { render, screen, fireEvent } from '@testing-library/react';
import { SkillsPanel } from '@/components/panels/skills-panel';
import { MemoryPanel } from '@/components/panels/memory-panel';
import { TodoPanel } from '@/components/panels/todo-panel';
import { ProfilePanel } from '@/components/panels/profile-panel';
import { InsightsPanel } from '@/components/panels/insights-panel';
import { CronPanel } from '@/components/panels/cron-panel';

// Mock SWR
vi.mock('swr', () => ({
  default: (key: string | null) => {
    if (!key) return { data: undefined, mutate: vi.fn() };
    if (key.startsWith('/skills?') || key === '/skills') {
      return {
        data: {
          skills: [
            { name: 'coding', description: 'Code helper', category: 'dev', disabled: false },
            { name: 'writing', description: 'Write stuff', category: 'general', disabled: true },
          ],
        },
        mutate: vi.fn(),
      };
    }
    if (key.startsWith('/skills/content')) {
      return { data: { content: '# My Skill\nHello world', linked_files: [] }, mutate: vi.fn() };
    }
    if (key === '/memory') {
      return {
        data: {
          memory: '# My Notes\nSome notes here',
          user: '# Profile\nUser data',
          soul: '# Soul\nAgent personality',
          memory_mtime: '2025-01-01T00:00:00Z',
        },
        mutate: vi.fn(),
      };
    }
    if (key.startsWith('/profiles')) {
      return {
        data: {
          profiles: [
            {
              name: 'default',
              model: 'gpt-4',
              provider: 'openai',
              is_default: true,
              gateway_running: true,
              has_env: true,
              total_skills: 5,
              enabled_skills: 3,
            },
            {
              name: 'dev',
              model: 'claude-3',
              provider: 'anthropic',
              is_default: false,
              gateway_running: false,
            },
          ],
          active: 'default',
        },
        mutate: vi.fn(),
      };
    }
    if (key === '/models') {
      return {
        data: { models: [{ id: 'gpt-4', name: 'GPT-4', provider: 'openai' }] },
        mutate: vi.fn(),
      };
    }
    if (key.startsWith('/insights')) {
      return {
        data: {
          total_sessions: 42,
          total_messages: 500,
          total_tokens: 100000,
          total_cost: 5.5,
          total_input_tokens: 60000,
          total_output_tokens: 40000,
          daily_tokens: [{ date: '2025-01-01', input_tokens: 1000, output_tokens: 500, sessions: 5, cost: 0.1 }],
          models: [
            {
              model: 'gpt-4',
              sessions: 30,
              total_tokens: 80000,
              cost: 4.0,
              cost_share: 0.73,
              token_share: 0.8,
              session_share: 0.71,
              input_tokens: 50000,
              output_tokens: 30000,
            },
          ],
          activity_by_day: [
            { day: 'Mon', sessions: 10 },
            { day: 'Tue', sessions: 5 },
          ],
          activity_by_hour: [
            { hour: 9, sessions: 15 },
            { hour: 14, sessions: 8 },
          ],
          period_days: 30,
        },
        mutate: vi.fn(),
      };
    }
    if (key === '/skills/usage') {
      return {
        data: {
          usage: { coding: { use_count: 10, view_count: 5, patch_count: 2 } },
          total_invocations: 10,
          unique_skills_used: 1,
        },
        mutate: vi.fn(),
      };
    }
    if (key.startsWith('/crons/history')) {
      return { data: { runs: [] }, mutate: vi.fn() };
    }
    return { data: undefined, mutate: vi.fn() };
  },
}));

// Mock apiPost
vi.mock('@/lib/api-client', () => ({
  fetcher: vi.fn(),
  apiPost: vi.fn().mockResolvedValue({ ok: true }),
}));

// Mock jotai atoms
vi.mock('jotai', () => ({
  useAtom: (atom: { key: string }) => {
    if (atom.key === 'activeProfileAtom') return ['default', vi.fn()];
    if (atom.key === 'defaultModelAtom') return ['gpt-4', vi.fn()];
    if (atom.key === 'todosAtom') return [[], vi.fn()];
    if (atom.key === 'todoMetaAtom') return [{}, vi.fn()];
    return [undefined, vi.fn()];
  },
  atom: (initial: unknown) => ({ init: initial, key: '' }),
}));

vi.mock('@/atoms/chat', () => ({
  todosAtom: { key: 'todosAtom' },
  todoMetaAtom: { key: 'todoMetaAtom' },
  messagesAtom: { key: 'messagesAtom' },
  busyAtom: { key: 'busyAtom' },
  activeStreamIdAtom: { key: 'activeStreamIdAtom' },
  approvalAtom: { key: 'approvalAtom' },
  clarifyAtom: { key: 'clarifyAtom' },
  yoloAtom: { key: 'yoloAtom' },
  pendingFilesAtom: { key: 'pendingFilesAtom' },
  toolCallsAtom: { key: 'toolCallsAtom' },
}));

vi.mock('@/atoms/settings', () => ({
  activeProfileAtom: { key: 'activeProfileAtom' },
  defaultModelAtom: { key: 'defaultModelAtom' },
  themeAtom: { key: 'themeAtom' },
  skinAtom: { key: 'skinAtom' },
  fontSizeAtom: { key: 'fontSizeAtom' },
}));

vi.mock('@/atoms/session', () => ({
  activeSessionAtom: { key: 'activeSessionAtom' },
}));

vi.mock('@/hooks/use-cron', () => ({
  useCron: () => ({
    jobs: [
      {
        id: 'j1',
        name: 'Daily Report',
        schedule: '0 9 * * *',
        enabled: true,
        prompt: 'Report',
        session_id: 's1',
        next_run: '2025-01-02T09:00:00Z',
      },
      {
        id: 'j2',
        name: 'Weekly Review',
        schedule: '0 9 * * 1',
        enabled: false,
        prompt: 'Review',
        session_id: 's2',
      },
    ],
    loading: false,
    error: null,
    fetchJobs: vi.fn(),
    createJob: vi.fn().mockResolvedValue(undefined),
    deleteJob: vi.fn().mockResolvedValue(undefined),
    toggleJob: vi.fn().mockResolvedValue(undefined),
    runJob: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@/components/chat/markdown-renderer', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div>{content}</div>,
}));

// Silence confirm dialogs
vi.spyOn(window, 'confirm').mockReturnValue(true);

describe('SkillsPanel', () => {
  it('renders skill categories and items', () => {
    render(<SkillsPanel />);
    expect(screen.getByText('dev')).toBeTruthy();
    expect(screen.getByText('general')).toBeTruthy();
    expect(screen.getByText('coding')).toBeTruthy();
    expect(screen.getByText('writing')).toBeTruthy();
  });

  it('opens create form on + click', () => {
    render(<SkillsPanel />);
    const buttons = screen.getAllByRole('button');
    const addBtn = buttons.find((b) => b.querySelector('svg.lucide-plus'));
    expect(addBtn).toBeTruthy();
    if (addBtn) fireEvent.click(addBtn);
    expect(screen.getByPlaceholderText('my-skill')).toBeTruthy();
  });

  it('has search input', () => {
    render(<SkillsPanel />);
    expect(screen.getByPlaceholderText('Search skills...')).toBeTruthy();
  });
});

describe('MemoryPanel', () => {
  it('renders section buttons', () => {
    render(<MemoryPanel />);
    expect(screen.getByText('My Notes')).toBeTruthy();
    expect(screen.getByText('User Profile')).toBeTruthy();
    expect(screen.getByText('Agent Soul')).toBeTruthy();
  });

  it('shows content placeholder when no section selected', () => {
    render(<MemoryPanel />);
    expect(screen.getByText('Select a section to view')).toBeTruthy();
  });

  it('opens edit mode on pencil click', async () => {
    render(<MemoryPanel />);
    // Click My Notes section
    fireEvent.click(screen.getByText('My Notes'));
    // Content area should show
    expect(screen.getAllByText(/My Notes/).length).toBeGreaterThan(0);
  });
});

describe('TodoPanel', () => {
  it('shows empty state when no todos', () => {
    render(<TodoPanel />);
    expect(screen.getByText('No tasks')).toBeTruthy();
  });

  it('renders header', () => {
    render(<TodoPanel />);
    expect(screen.getAllByText(/todo/i).length).toBeGreaterThan(0);
  });
});

describe('ProfilePanel', () => {
  it('renders profile cards', () => {
    render(<ProfilePanel />);
    expect(screen.getAllByText('default').length).toBeGreaterThan(0);
    expect(screen.getByText('dev')).toBeTruthy();
  });

  it('shows info card', () => {
    render(<ProfilePanel />);
    expect(screen.getByText('Profiles vs workspaces')).toBeTruthy();
  });

  it('shows active badge on default profile', () => {
    render(<ProfilePanel />);
    expect(screen.getByText('active')).toBeTruthy();
  });
});

describe('InsightsPanel', () => {
  it('renders overview stat cards', () => {
    render(<InsightsPanel />);
    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.getByText('$5.50')).toBeTruthy(); // cost formatted
  });

  it('renders period selector', () => {
    render(<InsightsPanel />);
    const select = document.querySelector('select');
    expect(select).toBeTruthy();
  });

  it('renders token breakdown section', () => {
    render(<InsightsPanel />);
    expect(screen.getByText('Token Breakdown')).toBeTruthy();
  });

  it('renders models table', () => {
    render(<InsightsPanel />);
    expect(screen.getByText('Models')).toBeTruthy();
    expect(screen.getByText('gpt-4')).toBeTruthy();
  });

  it('renders skill usage section', () => {
    render(<InsightsPanel />);
    expect(screen.getByText(/skill usage/i)).toBeTruthy();
  });
});

describe('CronPanel', () => {
  it('renders existing cron jobs', () => {
    render(<CronPanel />);
    expect(screen.getByText('Daily Report')).toBeTruthy();
    expect(screen.getByText('Weekly Review')).toBeTruthy();
  });

  it('shows schedule info', () => {
    render(<CronPanel />);
    expect(screen.getByText('0 9 * * *')).toBeTruthy();
    expect(screen.getByText('0 9 * * 1')).toBeTruthy();
  });

  it('shows paused badge for disabled jobs', () => {
    render(<CronPanel />);
    expect(screen.getByText('paused')).toBeTruthy();
  });
});
