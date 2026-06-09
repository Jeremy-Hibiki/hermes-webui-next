"use client";

import { useEffect } from "react";
import { useCron } from "@/hooks/use-cron";
import { Clock, Plus, Trash2, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CronPanel() {
  const { jobs, loading, fetchJobs, deleteJob, toggleJob, runJob } = useCron();

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Cron Jobs
        </h2>
        <Button variant="ghost" size="icon" className="text-[var(--muted)]">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {loading && <div className="p-4 text-sm text-[var(--muted)] text-center">Loading...</div>}

        {!loading && jobs.length === 0 && (
          <div className="p-4 text-sm text-[var(--muted)] text-center">No cron jobs configured</div>
        )}

        {jobs.map((job) => (
          <div
            key={job.id}
            className="flex items-center gap-2 p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)]"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[var(--text)] truncate">{job.name}</div>
              <div className="text-xs text-[var(--muted)]">{job.schedule}</div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="text-[var(--muted)]"
                onClick={() => runJob(job.id)}
                title="Run now"
              >
                <Play className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-[var(--muted)]"
                onClick={() => toggleJob(job.id, !job.enabled)}
                title={job.enabled ? "Pause" : "Resume"}
              >
                <Pause className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-[var(--error)]"
                onClick={() => deleteJob(job.id)}
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
