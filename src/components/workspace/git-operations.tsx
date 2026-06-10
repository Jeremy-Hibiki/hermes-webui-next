'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { fetcher, apiPost } from '@/lib/api-client';
import type { GitStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { GitCommit, GitPullRequest, Upload } from 'lucide-react';

interface GitOperationsProps {
  sessionId?: string;
}

export function GitOperations({ sessionId }: GitOperationsProps) {
  const [commitMsg, setCommitMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: statusData, mutate: mutateStatus } = useSWR<{ git: GitStatus }>(
    sessionId ? `/git-info?session_id=${sessionId}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const { data: diffData, mutate: mutateDiff } = useSWR<{ diff: string }>(
    sessionId ? `/git/diff?session_id=${sessionId}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const status = statusData?.git;
  const dirty = status?.dirty ?? 0;
  const untracked = status?.untracked ?? 0;
  const hasChanges = dirty > 0 || untracked > 0;

  const runGit = useCallback(
    async (endpoint: string, body?: Record<string, unknown>) => {
      setBusy(true);
      setError(null);
      try {
        await apiPost(`/git/${endpoint}`, { session_id: sessionId, ...body });
        void mutateStatus();
        void mutateDiff();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Git operation failed';
        setError(msg);
        toast(msg, 'error');
      } finally {
        setBusy(false);
      }
    },
    [sessionId, mutateStatus, mutateDiff, toast],
  );

  const handleStageAll = () => {
    void runGit('stage', { all: true });
  };

  const handleCommit = useCallback(async () => {
    if (!commitMsg.trim()) return;
    await runGit('commit', { message: commitMsg.trim() });
    setCommitMsg('');
  }, [commitMsg, runGit]);

  const handlePush = useCallback(() => {
    void runGit('push');
  }, [runGit]);
  const handlePull = useCallback(() => {
    void runGit('pull');
  }, [runGit]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
        <span className="text-xs font-semibold text-[var(--text)]">Git</span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-[var(--muted)]"
            onClick={handlePull}
            disabled={busy}
            aria-label="Pull"
          >
            <GitPullRequest className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-[var(--muted)]"
            onClick={handlePush}
            disabled={busy}
            aria-label="Push"
          >
            <Upload className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-red-500/10 border-b border-[var(--border)]">
          <span className="text-[10px] text-[var(--error)] truncate flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-[var(--muted)] text-[10px] shrink-0 hover:text-[var(--text)]"
          >
            dismiss
          </button>
        </div>
      )}

      {/* Status summary */}
      <div className="px-3 py-2 border-b border-[var(--border)] space-y-1">
        {dirty > 0 && <div className="text-[10px] text-[var(--warning)]">{dirty} modified</div>}
        {untracked > 0 && <div className="text-[10px] text-[var(--muted)]">{untracked} untracked</div>}
        {status && dirty === 0 && untracked === 0 && <div className="text-[10px] text-[var(--success)]">Clean</div>}
        {hasChanges && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 text-[10px] text-[var(--muted)]"
            onClick={handleStageAll}
            disabled={busy}
          >
            Stage all
          </Button>
        )}
      </div>

      {/* Commit input */}
      <div className="p-3 border-b border-[var(--border)]">
        <div className="flex gap-2">
          <input
            value={commitMsg}
            onChange={(e) => setCommitMsg(e.target.value)}
            placeholder="Commit message..."
            aria-label="Commit message"
            className="flex-1 px-2 py-1.5 text-xs border border-[var(--border)] rounded bg-[var(--input-bg)] text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleCommit();
            }}
          />
          <Button size="sm" onClick={() => void handleCommit()} disabled={!commitMsg.trim() || busy || !hasChanges}>
            <GitCommit className="w-3 h-3 mr-1" />
            Commit
          </Button>
        </div>
      </div>

      {/* Diff preview */}
      <div className="flex-1 overflow-auto p-2 font-mono text-[10px] leading-4 text-[var(--muted)] whitespace-pre-wrap">
        {diffData?.diff ? <pre>{diffData.diff}</pre> : <div className="text-center py-8">No changes</div>}
      </div>
    </div>
  );
}
