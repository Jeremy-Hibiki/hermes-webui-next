import { describe, it, expect, vi, beforeEach } from 'vite-plus/test';
import { renderHook, act, waitFor } from '@testing-library/react';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('checks auth status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ enabled: true, logged_in: false, has_passkeys: false }),
    });

    const { useAuth } = await import('@/hooks/use-auth');
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.checkStatus();
    });

    await waitFor(() => {
      expect(result.current.enabled).toBe(true);
      expect(result.current.loggedIn).toBe(false);
    });
  });

  it('logs in with password', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });

    const { useAuth } = await import('@/hooks/use-auth');
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('mypassword');
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ password: 'mypassword' }),
      }),
    );
  });
});
