import { describe, it, expect } from 'vite-plus/test';
import type { Session, Project } from '@/types/session';
import type { Message, ToolCall, ApprovalRequest } from '@/types/message';
import type { FileEntry, WorkspaceInfo, GitStatus } from '@/types/workspace';
import type { CronJob, CronCreateParams } from '@/types/cron';
import type { AppSettings, ThemeMode, FontSize, Profile } from '@/types/settings';
import type { SSEEvent } from '@/types/sse';

describe('Type definitions', () => {
  it('Session accepts valid object', () => {
    const session: Session = {
      id: 'abc-123',
      title: 'Test Session',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      messages: [],
      model: 'gpt-4',
      provider: 'openai',
      workspace: '/home/user/workspace',
      profile: 'default',
      pinned: false,
      archived: false,
      project_id: null,
      message_count: 0,
    };
    expect(session.id).toBe('abc-123');
  });

  it('Message accepts all roles', () => {
    const userMsg: Message = {
      id: 'm1',
      role: 'user',
      content: 'hi',
      timestamp: '',
    };
    const assistantMsg: Message = {
      id: 'm2',
      role: 'assistant',
      content: 'hello',
      timestamp: '',
      reasoning: 'thinking...',
    };
    expect(userMsg.role).toBe('user');
    expect(assistantMsg.reasoning).toBe('thinking...');
  });

  it('ToolCall tracks status', () => {
    const tc: ToolCall = {
      id: 'tc1',
      name: 'read_file',
      arguments: '{}',
      status: 'completed',
      result: 'file contents',
    };
    expect(tc.status).toBe('completed');
  });

  it('FileEntry supports nested children', () => {
    const dir: FileEntry = {
      name: 'src',
      path: 'src',
      is_dir: true,
      children: [{ name: 'index.ts', path: 'src/index.ts', is_dir: false }],
    };
    expect(dir.children).toHaveLength(1);
  });

  it('CronJob has schedule and prompt', () => {
    const job: CronJob = {
      id: 'j1',
      name: 'Daily Report',
      schedule: '0 9 * * *',
      prompt: 'Summarize today',
      session_id: 's1',
      enabled: true,
      paused: false,
      created_at: '',
    };
    expect(job.schedule).toBe('0 9 * * *');
  });

  it('AppSettings has theme and skin', () => {
    const settings: AppSettings = {
      theme: 'dark',
      skin: 'default',
      font_size: 'default',
      default_model: null,
      default_provider: null,
      default_workspace: null,
      send_key: 'enter',
      password_enabled: false,
      active_profile: 'default',
    };
    expect(settings.theme).toBe('dark');
  });

  it('SSEEvent discriminated union', () => {
    const msgEvent: SSEEvent = { event: 'message', data: { content: 'hi' } };
    const doneEvent: SSEEvent = { event: 'done', data: {} };
    expect(msgEvent.event).toBe('message');
    expect(doneEvent.event).toBe('done');
  });
});
