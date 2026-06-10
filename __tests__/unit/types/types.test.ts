import { describe, it, expect } from 'vite-plus/test';
import type { Session } from '@/types/session';
import type { Message, ToolCall } from '@/types/message';
import type { FileEntry } from '@/types/workspace';
import type { CronJob } from '@/types/cron';
import type { AppSettings } from '@/types/settings';
import type { SSEEvent } from '@/types/sse';

describe('Type definitions', () => {
  it('Session accepts valid object', () => {
    const session: Session = {
      session_id: 'abc-123',
      title: 'Test Session',
      created_at: Date.now(),
      updated_at: Date.now(),
      last_message_at: Date.now(),
      model: 'gpt-4',
      model_provider: 'openai',
      workspace: '/home/user/workspace',
      profile: 'default',
      pinned: false,
      archived: false,
      project_id: null,
      message_count: 0,
      input_tokens: 0,
      output_tokens: 0,
      estimated_cost: null,
    };
    expect(session.session_id).toBe('abc-123');
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
      type: 'dir',
      children: [{ name: 'index.ts', path: 'src/index.ts', type: 'file' }],
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
    const msgEvent: SSEEvent = { event: 'token', data: { text: 'hi' } };
    const doneEvent: SSEEvent = { event: 'done', data: {} };
    expect(msgEvent.event).toBe('token');
    expect(doneEvent.event).toBe('done');
  });
});
