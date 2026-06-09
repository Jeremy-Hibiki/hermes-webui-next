'use client';

import { useState } from 'react';
import { Lock, Loader2 } from 'lucide-react';

interface LoginPageProps {
  onLogin?: (password: string) => Promise<void>;
  error?: string | null;
}

export function LoginPage({ onLogin, error }: LoginPageProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const displayError = error || localError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || loading) return;

    setLoading(true);
    setLocalError(null);
    try {
      await onLogin?.(password);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg)]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm p-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-6"
      >
        <div className="flex items-center justify-center gap-2">
          <Lock className="w-6 h-6 text-[var(--accent)]" />
          <h1 className="text-xl font-bold text-[var(--text)]">Hermes</h1>
        </div>

        <div>
          <label htmlFor="password" className="text-xs font-medium text-[var(--muted)] block mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Password"
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            placeholder="Enter password"
            disabled={loading}
            autoFocus
          />
        </div>

        {displayError && (
          <div className="text-xs text-[var(--error)] bg-[var(--error)]/10 px-3 py-2 rounded-lg">{displayError}</div>
        )}

        <button
          type="submit"
          disabled={loading || !password.trim()}
          className="w-full py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Logging in...
            </>
          ) : (
            'Login'
          )}
        </button>
      </form>
    </div>
  );
}
