'use client';

import { useState, useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { busyAtom } from '@/atoms/chat';

export function LiveRunStatus() {
  const busy = useAtomValue(busyAtom);
  const [elapsed, setElapsed] = useState(0);
  const [tokenCount, _setTokenCount] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (busy) {
      startRef.current = Date.now();
      setElapsed(0);
      const interval = setInterval(() => {
        if (startRef.current) {
          setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      startRef.current = null;
    }
  }, [busy]);

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
