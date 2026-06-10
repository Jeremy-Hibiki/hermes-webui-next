'use client';

import { useAtom } from 'jotai';
import { bgTasksAtom } from '@/atoms/chat';

export function BackgroundTasksBadge() {
  const [tasks] = useAtom(bgTasksAtom);
  const count = tasks.length;
  if (!count) return null;

  return (
    <span
      className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-[5px] rounded-full text-[10px] font-semibold shrink-0"
      style={{
        background: 'var(--accent-bg-strong)',
        color: 'var(--accent-text)',
      }}
      title={`${count} background task${count > 1 ? 's' : ''} running`}
    >
      {count}
    </span>
  );
}
