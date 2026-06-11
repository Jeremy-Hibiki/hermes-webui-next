'use client';

import { FileText } from 'lucide-react';
import type { CompressionState } from '@/atoms/chat';

interface CompressionCardProps {
  state: CompressionState;
}

export function CompressionCard({ state }: CompressionCardProps) {
  if (!state.automatic) return null;

  const done = state.phase === 'done';

  return (
    <div className="max-w-[var(--msg-max)] mx-auto w-full px-6">
      <div className="py-[7px] pb-2">
        <div
          className={`grid items-center gap-[10px] select-none pointer-events-none opacity-[0.72] ${done ? 'opacity-[0.82]' : ''}`}
          style={{ gridTemplateColumns: 'minmax(32px, 1fr) auto minmax(32px, 1fr)' }}
        >
          <div className="h-px bg-[var(--border-subtle)] opacity-75" />
          <span className="inline-flex items-center justify-center gap-[6px] whitespace-nowrap text-[var(--muted)] text-[calc(var(--message-body-font-size)*0.92)] font-normal leading-[1.2]">
            {done && <FileText className="w-[13px] h-[13px] opacity-[0.78]" />}
            {state.message}
          </span>
          <div className="h-px bg-[var(--border-subtle)] opacity-75" />
        </div>
      </div>
    </div>
  );
}

export function CompressionRunningCard() {
  return (
    <div className="max-w-[var(--msg-max)] mx-auto w-full px-6">
      <div className="rounded-lg overflow-hidden bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] ml-[var(--msg-rail)]">
        <div className="flex items-center gap-2 px-2.5 py-[5px] select-none">
          <span className="inline-flex gap-[3px] items-center shrink-0">
            <span className="w-[5px] h-[5px] rounded-full bg-[var(--blue)] opacity-45 animate-[compressionPulse_1.05s_ease-in-out_infinite]" />
            <span
              className="w-[5px] h-[5px] rounded-full bg-[var(--blue)] opacity-45 animate-[compressionPulse_1.05s_ease-in-out_infinite]"
              style={{ animationDelay: '0.14s' }}
            />
            <span
              className="w-[5px] h-[5px] rounded-full bg-[var(--blue)] opacity-45 animate-[compressionPulse_1.05s_ease-in-out_infinite]"
              style={{ animationDelay: '0.28s' }}
            />
          </span>
          <span className="text-[11px] font-bold font-mono tracking-[0.03em] text-[var(--muted)] shrink-0">
            Compressing
          </span>
          <span className="text-[11px] text-[var(--text)] font-mono overflow-hidden text-ellipsis whitespace-nowrap flex-1">
            context
          </span>
        </div>
      </div>
    </div>
  );
}
