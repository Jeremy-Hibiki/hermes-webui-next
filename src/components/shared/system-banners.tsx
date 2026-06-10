'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAtom } from 'jotai';
import { offlineAtom, agentHealthAtom, updateBannerAtom, reconnectBannerAtom } from '@/atoms/ui';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export function OfflineBanner() {
  const [visible, setVisible] = useAtom(offlineAtom);
  const [checking, setChecking] = useState(false);

  const checkNow = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch('/health', { cache: 'no-store' });
      if (res.ok) setVisible(false);
    } catch {
      // still offline
    } finally {
      setChecking(false);
    }
  }, [setVisible]);

  useEffect(() => {
    const onOffline = () => setVisible(true);
    const onOnline = () => setVisible(false);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, [setVisible]);

  if (!visible) return null;

  return (
    <div
      className="fixed left-0 right-0 top-0 z-[1200] flex items-center justify-between gap-3.5 px-5 py-3"
      style={{
        borderBottom: '1px solid color-mix(in srgb, var(--accent) 50%, var(--surface))',
        background: 'color-mix(in srgb, var(--surface) 88%, var(--accent))',
        color: 'var(--text)',
        boxShadow: '0 12px 40px rgba(0,0,0,.22)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="flex flex-col gap-[3px] min-w-0 text-[13px] leading-snug">
        <strong className="text-[var(--accent-text)] text-[13px] tracking-wide uppercase">Connection lost</strong>
        <span className="text-[var(--muted)]">Your browser reports that this device is offline.</span>
        <span className="text-[var(--muted)]">
          I will refresh this page automatically when Hermes is reachable again.
        </span>
      </div>
      <button
        onClick={checkNow}
        disabled={checking}
        className="shrink-0 px-3.5 py-1.5 rounded-lg border border-[var(--accent-bg-strong)] bg-[var(--accent-bg)] text-[var(--accent-text)] text-xs font-bold cursor-pointer hover:bg-[var(--accent-bg-strong)] disabled:opacity-65 disabled:cursor-wait"
      >
        Check now
      </button>
    </div>
  );
}

export function AgentHealthBanner() {
  const [visible, setVisible] = useAtom(agentHealthAtom);

  if (!visible) return null;

  return (
    <div
      className="sticky bottom-0 z-[4] flex items-center justify-between gap-3 mx-auto mt-2.5 w-[calc(100%-40px)] px-4 py-3 rounded-xl"
      style={{
        maxWidth: 'var(--msg-max)',
        border: '1px solid color-mix(in srgb, var(--error) 55%, var(--surface))',
        background: 'color-mix(in srgb, var(--error) 14%, var(--surface))',
        color: 'var(--text)',
        boxShadow: '0 10px 32px rgba(0,0,0,.16)',
      }}
    >
      <div className="flex flex-col gap-[3px] min-w-0 text-[13px] leading-snug">
        <strong className="text-[var(--error)] text-[13px]">Hermes agent is not responding</strong>
        <span className="text-[var(--muted)]">
          The gateway heartbeat failed. Messages may not be delivered until it comes back.
        </span>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="shrink-0 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors"
        style={{
          borderColor: 'color-mix(in srgb, var(--error) 45%, var(--surface))',
          background: 'color-mix(in srgb, var(--error) 10%, var(--surface))',
          color: 'var(--error)',
        }}
      >
        Dismiss
      </button>
    </div>
  );
}

export function ReconnectBanner() {
  const [visible, setVisible] = useAtom(reconnectBannerAtom);

  if (!visible) return null;

  return (
    <div
      className="flex items-center justify-between gap-3 bg-[var(--surface)] border border-[var(--accent-bg-strong)] rounded-[10px] px-4 py-2.5 mx-auto mt-2.5 text-[13px] text-[var(--accent-text)]"
      style={{ maxWidth: '780px', width: 'calc(100% - 24px)' }}
    >
      <span className="flex items-center gap-2">
        <AlertTriangle className="w-3.5 h-3.5" />
        A response may have been in progress when you last left. Reload messages?
      </span>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => setVisible(false)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent-bg-strong)] border border-[var(--accent-bg-strong)] text-[var(--accent-text)] cursor-pointer hover:bg-[var(--accent-bg-strong)]"
        >
          Dismiss
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent-bg-strong)] border border-[var(--accent-bg-strong)] text-[var(--accent-text)] cursor-pointer hover:bg-[var(--accent-bg-strong)] flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          Reload
        </button>
      </div>
    </div>
  );
}

export function UpdateBanner() {
  const [visible, setVisible] = useAtom(updateBannerAtom);

  if (!visible) return null;

  return (
    <div
      className="flex items-start justify-between gap-3 flex-wrap bg-[var(--surface)] border border-[var(--accent)] rounded-[10px] px-4 py-2.5 mx-auto mt-2.5 text-[13px] text-[var(--accent-text)] overflow-wrap-anywhere"
      style={{ maxWidth: '780px', width: 'calc(100% - 24px)' }}
    >
      <span>A new version of Hermes is available.</span>
      <div className="flex gap-2 shrink-0 ml-auto">
        <button
          onClick={() => setVisible(false)}
          className="update-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent-bg)] border border-[var(--accent-bg-strong)] text-[var(--accent-text)] cursor-pointer transition-colors hover:bg-[var(--accent-bg-strong)]"
        >
          Later
        </button>
        <button
          onClick={() => window.location.reload()}
          className="update-btn update-primary px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent-bg-strong)] border border-[var(--accent)] text-[var(--accent-text)] cursor-pointer transition-colors hover:bg-[var(--accent-bg-strong)]"
        >
          Update Now
        </button>
      </div>
    </div>
  );
}
