"use client";

import { useState } from "react";
import { Lock } from "lucide-react";

interface LoginPageProps {
  onLogin?: (password: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin?.(password);
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
          />
        </div>

        <button
          type="submit"
          className="w-full py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Login
        </button>
      </form>
    </div>
  );
}
