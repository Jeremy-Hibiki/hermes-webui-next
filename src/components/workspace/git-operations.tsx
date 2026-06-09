"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { fetcher, apiPost } from "@/lib/api-client";
import type { GitStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { GitCommit, GitPullRequest, Upload, Plus, Minus, FileQuestion } from "lucide-react";

interface GitOperationsProps {
  sessionId?: string;
}

export function GitOperations({ sessionId }: GitOperationsProps) {
  const [commitMsg, setCommitMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: statusData, mutate: mutateStatus } = useSWR<{ git: GitStatus }>(
    sessionId ? `/git-info?session_id=${sessionId}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const { data: diffData, mutate: mutateDiff } = useSWR<{ staged: string; unstaged: string }>(
    sessionId ? `/git/diff?session_id=${sessionId}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const status = statusData?.git;
  const staged = status?.staged ?? [];
  const unstaged = status?.unstaged ?? [];
  const untracked = status?.untracked ?? [];

  const runGit = useCallback(
    async (endpoint: string, body?: Record<string, unknown>) => {
      setBusy(true);
      try {
        await apiPost(`/git/${endpoint}`, { session_id: sessionId, ...body });
        void mutateStatus();
        void mutateDiff();
      } catch {
        // Error handled silently
      } finally {
        setBusy(false);
      }
    },
    [sessionId, mutateStatus, mutateDiff],
  );

  const handleStage = useCallback(
    (file: string) => {
      void runGit("stage", { files: [file] });
    },
    [runGit],
  );

  const handleUnstage = useCallback(
    (file: string) => {
      void runGit("unstage", { files: [file] });
    },
    [runGit],
  );

  const handleStageAll = () => {
    void runGit("stage", { files: [...unstaged, ...untracked] });
  };

  const handleCommit = useCallback(async () => {
    if (!commitMsg.trim()) return;
    await runGit("commit", { message: commitMsg.trim() });
    setCommitMsg("");
  }, [commitMsg, runGit]);

  const handlePush = useCallback(() => {
    void runGit("push");
  }, [runGit]);
  const handlePull = useCallback(() => {
    void runGit("pull");
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

      {/* Staged files */}
      {staged.length > 0 && (
        <div className="border-b border-[var(--border)]">
          <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--success)] uppercase tracking-wide">
            Staged ({staged.length})
          </div>
          {staged.map((f) => (
            <div
              key={f}
              className="flex items-center gap-2 px-3 py-1 text-xs hover:bg-[var(--hover-bg)] group"
            >
              <Plus className="w-3 h-3 text-green-400 shrink-0" />
              <span className="flex-1 truncate text-[var(--text)]">{f}</span>
              <button
                onClick={() => {
                  handleUnstage(f);
                }}
                className="text-[var(--muted)] opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Unstage ${f}`}
              >
                <Minus className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Unstaged files */}
      {(unstaged.length > 0 || untracked.length > 0) && (
        <div className="border-b border-[var(--border)]">
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-[10px] font-semibold text-[var(--warning)] uppercase tracking-wide">
              Changes ({unstaged.length + untracked.length})
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 text-[10px] text-[var(--muted)]"
              onClick={handleStageAll}
              disabled={busy}
            >
              Stage all
            </Button>
          </div>
          {unstaged.map((f) => (
            <div
              key={f}
              className="flex items-center gap-2 px-3 py-1 text-xs hover:bg-[var(--hover-bg)] group"
            >
              <span className="w-3 h-3 text-[var(--warning)] shrink-0 text-center leading-3 text-[8px]">
                M
              </span>
              <span className="flex-1 truncate text-[var(--text)]">{f}</span>
              <button
                onClick={() => {
                  handleStage(f);
                }}
                className="text-[var(--muted)] opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Stage ${f}`}
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          ))}
          {untracked.map((f) => (
            <div
              key={f}
              className="flex items-center gap-2 px-3 py-1 text-xs hover:bg-[var(--hover-bg)] group"
            >
              <FileQuestion className="w-3 h-3 text-[var(--muted)] shrink-0" />
              <span className="flex-1 truncate text-[var(--text)]">{f}</span>
              <button
                onClick={() => {
                  handleStage(f);
                }}
                className="text-[var(--muted)] opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Stage ${f}`}
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

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
              if (e.key === "Enter") {
                void handleCommit();
              }
            }}
          />
          <Button
            size="sm"
            onClick={() => {
              void handleCommit();
            }}
            disabled={!commitMsg.trim() || busy || staged.length === 0}
          >
            <GitCommit className="w-3 h-3 mr-1" />
            Commit
          </Button>
        </div>
      </div>

      {/* Diff preview */}
      <div className="flex-1 overflow-auto p-2 font-mono text-[10px] leading-4 text-[var(--muted)] whitespace-pre-wrap">
        {diffData?.staged || diffData?.unstaged ? (
          <>
            {diffData.staged && <div>{diffData.staged}</div>}
            {diffData.unstaged && <div>{diffData.unstaged}</div>}
          </>
        ) : (
          <div className="text-center py-8">No changes</div>
        )}
      </div>
    </div>
  );
}
