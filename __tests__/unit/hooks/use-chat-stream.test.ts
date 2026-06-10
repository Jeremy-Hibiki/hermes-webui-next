import { describe, it, expect, vi, beforeEach } from 'vite-plus/test';
import { renderHook, act } from '@testing-library/react';

// Mock fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Mock EventSource
class MockES {
  url: string;
  onerror: ((e: Event) => void) | null = null;
  readyState = 0;
  static last: MockES | null = null;
  _handlers: Record<string, ((e: Event) => void)[]> = {};

  constructor(url: string) {
    this.url = url;
    MockES.last = this;
  }

  addEventListener(event: string, handler: EventListener) {
    if (!this._handlers[event]) this._handlers[event] = [];
    this._handlers[event].push(handler as (e: Event) => void);
  }

  removeEventListener = vi.fn();
  close = vi.fn(() => {
    this.readyState = 2;
  });
}

describe('useChatStream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockES.last = null;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ stream_id: 'st1', session_id: 's1' }),
    });
  });

  it('send() calls POST /api/chat/start', async () => {
    const OrigES = globalThis.EventSource;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).EventSource = MockES;

    const { useChatStream } = await import('@/hooks/use-chat-stream');
    const { result } = renderHook(() => useChatStream('s1'));

    await act(async () => {
      await result.current.send('Hello');
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/chat/start',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Hello'),
      }),
    );

    expect(MockES.last).toBeTruthy();
    expect(MockES.last!.url).toContain('/api/chat/stream');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).EventSource = OrigES;
  });
});
