'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetcher } from '@/lib/api-client';

interface QuotaWindow {
  remaining_percent?: number;
}

interface AccountLimits {
  windows?: QuotaWindow[];
}

interface QuotaData {
  limit_remaining?: string | number;
  usage?: string | number;
  limit?: string | number;
}

interface ProviderQuotaStatus {
  status: string;
  display_name?: string;
  provider?: string;
  message?: string;
  account_limits?: AccountLimits;
  quota?: QuotaData;
}

function fmtMoneyShort(value: string | number | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  if (Math.abs(n) >= 100) return '$' + n.toFixed(0);
  if (Math.abs(n) >= 10) return '$' + n.toFixed(1);
  return '$' + n.toFixed(2);
}

function fmtPercentShort(value: number | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return Math.max(0, Math.min(100, n)).toFixed(0) + '%';
}

function indicatorText(status: ProviderQuotaStatus | null): { label: string; title: string } | null {
  if (!status || status.status !== 'available') return null;
  const provider = status.display_name || status.provider || 'Provider';
  const accountLimits = status.account_limits || null;
  if (accountLimits && Array.isArray(accountLimits.windows) && accountLimits.windows.length) {
    const w =
      accountLimits.windows.find((x) => x && Number.isFinite(Number(x.remaining_percent))) || accountLimits.windows[0];
    const remaining = fmtPercentShort(w?.remaining_percent);
    if (remaining) {
      return {
        label: provider + ' ' + remaining,
        title: (status.message || 'Provider usage loaded') + ' — ' + remaining + ' remaining',
      };
    }
  }
  const quota = status.quota || null;
  if (quota) {
    const remaining = fmtMoneyShort(quota.limit_remaining);
    const used = fmtMoneyShort(quota.usage);
    const limit = fmtMoneyShort(quota.limit);
    if (remaining) {
      const parts: string[] = [];
      if (used) parts.push('used ' + used);
      if (limit) parts.push('limit ' + limit);
      return {
        label: provider + ' ' + remaining,
        title: (status.message || 'Provider quota loaded') + (parts.length ? ' — ' + parts.join(' · ') : ''),
      };
    }
  }
  return null;
}

export function ProviderQuotaChip() {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem('hermes-show-quota-chip') === 'true';
    } catch {
      return false;
    }
  });
  const [status, setStatus] = useState<ProviderQuotaStatus | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const st = await fetcher<ProviderQuotaStatus>('/api/provider/quota');
      setStatus(st);
    } catch {
      setStatus(null);
    }
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Refresh on tab visibility change
  useEffect(() => {
    function onVis() {
      if (document.visibilityState === 'visible') refresh();
    }
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [refresh]);

  // Listen for settings change
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'hermes-show-quota-chip') {
        setEnabled(e.newValue === 'true');
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (!enabled) return null;

  const text = indicatorText(status);
  if (!text) return null;

  return (
    <button
      id="providerQuotaChip"
      onClick={() => {
        window.location.href = '/settings?section=providers';
      }}
      className="provider-quota-chip hidden xl:inline-flex items-center gap-1.5 h-[34px] max-w-[150px] px-2.5 rounded-full text-[11px] font-semibold leading-none whitespace-nowrap cursor-pointer transition-colors"
      style={{
        background: 'rgba(34,197,94,.10)',
        color: 'var(--text)',
        border: '1px solid var(--border2)',
      }}
      title={text.title}
      aria-label={text.title}
    >
      <span
        className="w-[6px] h-[6px] rounded-full shrink-0"
        style={{ background: '#22c55e', boxShadow: '0 0 0 3px rgba(34,197,94,.12)' }}
      />
      <span id="providerQuotaChipLabel" className="truncate">
        {text.label}
      </span>
    </button>
  );
}
