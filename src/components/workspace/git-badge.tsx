'use client';

import { GitBranch } from 'lucide-react';
import type { GitStatus } from '@/types';

interface GitBadgeProps {
  status: GitStatus | null;
}

export function GitBadge({ status }: GitBadgeProps) {
  if (!status) return null;

  const totalChanges = status.staged.length + status.unstaged.length + status.untracked.length;

  return (
    <div className="flex items-center gap-2 text-xs text-[var(--muted)] px-2 py-1 rounded bg-[var(--surface)]">
      <GitBranch className="w-3 h-3" />
      <span className="font-medium text-[var(--text)]">{status.branch}</span>
      {totalChanges > 0 && (
        <span className="px-1.5 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] font-medium">
          {status.staged.length}
        </span>
      )}
      {status.ahead > 0 && <span className="text-[var(--success)]">↑{status.ahead}</span>}
      {status.behind > 0 && <span className="text-[var(--warning)]">↓{status.behind}</span>}
    </div>
  );
}
