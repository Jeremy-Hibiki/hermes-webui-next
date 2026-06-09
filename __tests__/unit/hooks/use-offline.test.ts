import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test';
import { renderHook, act } from '@testing-library/react';

describe('useOffline', () => {
  const listeners: Record<string, EventListener[]> = {};

  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    window.addEventListener = vi.fn((event: string, handler: EventListener) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    });
    window.removeEventListener = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns online by default', async () => {
    const { useOffline } = await import('@/hooks/use-offline');
    const { result } = renderHook(() => useOffline());
    expect(result.current.offline).toBe(false);
  });

  it('detects offline state', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const { useOffline } = await import('@/hooks/use-offline');
    const { result } = renderHook(() => useOffline());
    expect(result.current.offline).toBe(true);
  });
});
