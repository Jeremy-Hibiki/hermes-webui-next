'use client';

import { useState, useCallback } from 'react';
import { API_BASE } from '@/lib/constants';

interface UseAuthReturn {
  enabled: boolean;
  loggedIn: boolean;
  hasPasskeys: boolean;
  loading: boolean;
  error: string | null;
  checkStatus: () => Promise<void>;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [enabled, setEnabled] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [hasPasskeys, setHasPasskeys] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/status`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      const data = await res.json();
      setEnabled(data.auth_enabled ?? false);
      setLoggedIn(data.logged_in ?? false);
      setHasPasskeys(data.passkeys_enabled ?? false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check auth');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error('Invalid password');
      setLoggedIn(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    setLoggedIn(false);
  }, []);

  return { enabled, loggedIn, hasPasskeys, loading, error, checkStatus, login, logout };
}
