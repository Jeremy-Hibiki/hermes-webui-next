'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Brain, ChevronRight } from 'lucide-react';

interface ThinkingCardProps {
  content: string;
}

export function ThinkingCard({ content }: ThinkingCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-[var(--border)] rounded-lg bg-[var(--surface-subtle,var(--surface))] text-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--hover-bg)] transition-colors text-[var(--muted)]"
      >
        <Brain className="w-3.5 h-3.5" />
        <span className="text-xs">Thinking</span>
        <ChevronRight className={cn('w-3 h-3 ml-auto transition-transform', expanded && 'rotate-90')} />
      </button>
      {expanded && <div className="px-3 pb-2 text-xs text-[var(--muted)] italic whitespace-pre-wrap">{content}</div>}
    </div>
  );
}
