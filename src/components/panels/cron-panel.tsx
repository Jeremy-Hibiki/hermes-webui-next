'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCron } from '@/hooks/use-cron';
import { fetcher } from '@/lib/api-client';
import { Clock, Plus, Trash2, Play, Pause, X, History, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import useSWR from 'swr';
import type { CronRun } from '@/types';

export function CronPanel() {
  const { jobs, loading, fetchJobs, createJob, deleteJob, toggleJob, runJob } = useCron();

  const [createMode, setCreateMode] = useState(false);
  const [editJob, setEditJob] = useState<string | null>(null);
  const [historyJob, setHistoryJob] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    schedule: '',
    prompt: '',
    session_id: '',
    profile: '',
    telegram: false,
    discord: false,
    slack: false,
    email: '',
  });

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  const resetForm = useCallback(() => {
    setForm({
      name: '',
      schedule: '',
      prompt: '',
      session_id: '',
      profile: '',
      telegram: false,
      discord: false,
      slack: false,
      email: '',
    });
    setCreateMode(false);
    setEditJob(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    try {
      const emailList = form.email
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);
      await createJob({
        name: form.name,
        schedule: form.schedule,
        prompt: form.prompt,
        session_id: form.session_id || `cron-${Date.now()}`,
        profile: form.profile || undefined,
        delivery_options: {
          telegram: form.telegram || undefined,
          discord: form.discord || undefined,
          slack: form.slack || undefined,
          email: emailList.length > 0 ? emailList : undefined,
        },
      });
      resetForm();
      void fetchJobs();
    } catch (err) {
      console.error('Failed to create cron job:', err);
    }
  }, [form, createJob, resetForm, fetchJobs]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('Delete this cron job?')) return;
      try {
        await deleteJob(id);
        void fetchJobs();
      } catch (err) {
        console.error('Failed to delete job:', err);
      }
    },
    [deleteJob, fetchJobs],
  );

  const startEdit = useCallback(
    (jobId: string) => {
      const job = jobs.find((j) => j.id === jobId);
      if (!job) return;
      setEditJob(jobId);
      setCreateMode(true);
      setForm({
        name: job.name,
        schedule: job.schedule,
        prompt: job.prompt,
        session_id: job.session_id,
        profile: job.profile || '',
        telegram: job.delivery_options?.telegram || false,
        discord: job.delivery_options?.discord || false,
        slack: job.delivery_options?.slack || false,
        email: job.delivery_options?.email?.join(', ') || '',
      });
    },
    [jobs],
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Cron Jobs
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="text-[var(--muted)] hover:text-[var(--text)]"
          onClick={() => {
            resetForm();
            setCreateMode(true);
          }}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {loading && <div className="p-4 text-sm text-[var(--muted)] text-center">Loading...</div>}

        {!loading && jobs.length === 0 && !createMode && (
          <div className="p-4 text-sm text-[var(--muted)] text-center">No cron jobs configured</div>
        )}

        {jobs.map((job) => (
          <CronJobCard
            key={job.id}
            job={job}
            onToggle={() => void toggleJob(job.id, !job.enabled)}
            onRun={() => void runJob(job.id)}
            onDelete={() => void handleDelete(job.id)}
            onEdit={() => startEdit(job.id)}
            onHistory={setHistoryJob}
            isHistoryOpen={historyJob === job.id}
          />
        ))}

        {createMode && (
          <div className="rounded-lg border border-[var(--accent)] bg-[var(--surface)] p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--text)]">{editJob ? 'Edit Job' : 'Create Job'}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={resetForm}>
                <X className="w-3 h-3" />
              </Button>
            </div>
            <Field label="Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
            <Field
              label="Schedule (cron)"
              value={form.schedule}
              onChange={(v) => setForm((f) => ({ ...f, schedule: v }))}
              placeholder="0 9 * * 1-5"
            />
            <div>
              <label htmlFor="cron-prompt" className="text-xs font-medium text-[var(--muted)]">
                Prompt
              </label>
              <textarea
                id="cron-prompt"
                aria-label="Prompt"
                value={form.prompt}
                onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
                rows={4}
                className="w-full mt-1 px-2 py-1 text-sm border border-[var(--border)] rounded bg-transparent text-[var(--text)] outline-none resize-none focus:ring-1 focus:ring-[var(--focus-ring)]"
                placeholder="Check the logs and report any errors..."
              />
            </div>
            <Field
              label="Profile (optional)"
              value={form.profile}
              onChange={(v) => setForm((f) => ({ ...f, profile: v }))}
            />
            <div className="border-t border-[var(--border)] pt-2">
              <div className="text-xs font-medium text-[var(--muted)] mb-2">Delivery Options</div>
              <div className="space-y-1">
                <ToggleOption
                  label="Telegram"
                  checked={form.telegram}
                  onChange={(v) => setForm((f) => ({ ...f, telegram: v }))}
                />
                <ToggleOption
                  label="Discord"
                  checked={form.discord}
                  onChange={(v) => setForm((f) => ({ ...f, discord: v }))}
                />
                <ToggleOption
                  label="Slack"
                  checked={form.slack}
                  onChange={(v) => setForm((f) => ({ ...f, slack: v }))}
                />
                <Field
                  label="Email (comma-separated)"
                  value={form.email}
                  onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                  placeholder="user@example.com"
                />
              </div>
            </div>
            <Button size="sm" onClick={() => void handleSubmit()} disabled={!form.name.trim() || !form.schedule.trim()}>
              {editJob ? 'Update' : 'Create'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function CronJobCard({
  job,
  onToggle,
  onRun,
  onDelete,
  onEdit,
  onHistory,
  isHistoryOpen,
}: {
  job: {
    id: string;
    name: string;
    schedule: string;
    enabled: boolean;
    last_run?: string;
    next_run?: string;
  };
  onToggle: () => void;
  onRun: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onHistory: (id: string | null) => void;
  isHistoryOpen: boolean;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center gap-2 p-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--text)] truncate">{job.name}</span>
            {!job.enabled && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--muted)]/20 text-[var(--muted)]">paused</span>
            )}
          </div>
          <div className="text-xs text-[var(--muted)]">{job.schedule}</div>
          {job.next_run && (
            <div className="text-[10px] text-[var(--muted)] mt-0.5">
              Next: {new Date(job.next_run).toLocaleString()}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-[var(--muted)]" onClick={onRun} title="Run now">
            <Play className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[var(--muted)]"
            onClick={onToggle}
            title={job.enabled ? 'Pause' : 'Resume'}
          >
            <Pause className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-[var(--muted)]" onClick={onEdit} title="Edit">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[var(--muted)]"
            onClick={() => onHistory(isHistoryOpen ? null : job.id)}
            title="History"
          >
            <History className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-[var(--error)]" onClick={onDelete} title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      {isHistoryOpen && <CronRunHistory jobId={job.id} />}
    </div>
  );
}

function CronRunHistory({ jobId }: { jobId: string }) {
  const { data } = useSWR<{ runs: CronRun[] }>(`/crons/history?job_id=${jobId}`, fetcher, {
    revalidateOnFocus: false,
  });
  const runs = data?.runs ?? [];

  return (
    <div className="border-t border-[var(--border)] px-3 py-2 space-y-1">
      <div className="text-xs font-medium text-[var(--muted)]">Run History</div>
      {runs.length === 0 ? (
        <div className="text-xs text-[var(--muted)]">No runs yet</div>
      ) : (
        runs.map((run) => (
          <div key={run.id} className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full shrink-0',
                run.status === 'completed' && 'bg-green-500',
                run.status === 'running' && 'bg-blue-400 animate-pulse',
                run.status === 'failed' && 'bg-[var(--error)]',
                run.status === 'pending' && 'bg-[var(--muted)]',
              )}
            />
            <span className="text-[var(--text)]">{new Date(run.started_at).toLocaleString()}</span>
            <span className="text-[var(--muted)] capitalize">{run.status}</span>
            {run.completed_at && (
              <span className="text-[var(--muted)]">
                ({Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)}
                s)
              </span>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-[var(--muted)]">{label}</label>
      <input
        type="text"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full mt-1 px-2 py-1 text-sm border border-[var(--border)] rounded bg-transparent text-[var(--text)] outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
      />
    </div>
  );
}

function ToggleOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = `toggle-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-xs text-[var(--text)] cursor-pointer">
      <input
        id={id}
        type="checkbox"
        aria-label={label}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded"
      />
      {label}
    </label>
  );
}
