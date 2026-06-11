'use client';

import { useState, useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { busyAtom } from '@/atoms/chat';

interface LiveRunStatusProps {
  startedAt?: number | null;
}

export function LiveRunStatus({ startedAt }: LiveRunStatusProps) {
  const busy = useAtomValue(busyAtom);
  const [elapsed, setElapsed] = useState(0);
  const [tokenCount, _setTokenCount] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (busy) {
      // Use server-provided pending_started_at (seconds) if available,
      // otherwise fall back to local Date.now().
      const serverMs = typeof startedAt === 'number' && startedAt > 0 ? startedAt * 1000 : null;
      startRef.current = serverMs ?? Date.now();
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      const interval = setInterval(() => {
        if (startRef.current) {
          setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      startRef.current = null;
    }
  }, [busy, startedAt]);

  if (!busy) return null;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `${sec}s`;
  };

  return (
    <div
      className="flex items-center gap-2 text-[13px] text-[var(--muted)]"
      style={{
        marginLeft: 'var(--msg-rail, 0px)',
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1,
      }}
    >
      <span className="w-[7px] h-[7px] rounded-full bg-[var(--accent)] opacity-45 animate-pulse" />
      <span className="text-[var(--text)] whitespace-nowrap">{formatTime(elapsed)}</span>
      <span className="opacity-40">·</span>
      {tokenCount > 0 && (
        <>
          <span className="tabular-nums">{tokenCount} tokens</span>
          <span className="opacity-40">·</span>
        </>
      )}
      <span className="opacity-85">Running</span>
    </div>
  );
}
