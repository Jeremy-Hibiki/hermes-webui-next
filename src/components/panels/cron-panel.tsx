'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useCron } from '@/hooks/use-cron';
import { MarkdownRenderer } from '@/components/chat/markdown-renderer';
import {
  Clock,
  Plus,
  Trash2,
  Play,
  Pause,
  X,
  Pencil,
  Copy,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Bot,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { useTranslation } from '@/lib/i18n';
import useSWR from 'swr';
import { fetcher } from '@/lib/api-client';
import type { CronJob, CronRunFile, CronRunContent, CronRunUsage, CronStatusMeta, GatewayStatus } from '@/types';

// ── Status helpers ────────────────────────────────────────────────────────────

function isRecurringCronJob(job: CronJob): boolean {
  const schedule = job.schedule;
  if (typeof schedule === 'string') {
    const lower = schedule.toLowerCase().trim();
    if (lower.startsWith('every ') || lower.startsWith('@')) return true;
    const parts = lower.split(/\s+/);
    if (parts.length >= 5 && parts.slice(0, 5).every((p) => /^[\d*\-,/]+$/.test(p))) return true;
    return false;
  }
  if (typeof schedule === 'object' && schedule !== null) {
    const kind = (schedule as { kind?: string }).kind;
    return kind === 'cron' || kind === 'interval';
  }
  return false;
}

function hasUnlimitedRepeat(job: CronJob): boolean {
  return !!(job.repeat && job.repeat.times == null);
}

function isCronNeedsAttention(job: CronJob): boolean {
  return (
    isRecurringCronJob(job) &&
    hasUnlimitedRepeat(job) &&
    job.enabled === false &&
    job.state === 'completed' &&
    !job.next_run_at
  );
}

function isCronScheduleError(job: CronJob): boolean {
  return isRecurringCronJob(job) && !job.next_run_at && (job.state === 'error' || job.last_status === 'error');
}

function getCronStatusMeta(job: CronJob): CronStatusMeta {
  if (isCronNeedsAttention(job)) {
    return {
      state: 'needs_attention',
      label: 'Needs Attention',
      color: 'text-amber-600',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    };
  }
  if (isCronScheduleError(job)) {
    return {
      state: 'schedule_error',
      label: 'Schedule Error',
      color: 'text-amber-600',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    };
  }
  if (job.state === 'paused') {
    return {
      state: 'paused',
      label: 'Paused',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    };
  }
  if (job.enabled === false) {
    return { state: 'off', label: 'Off', color: 'text-[var(--muted)]', bgColor: 'bg-[var(--muted)]/10' };
  }
  if (job.last_status === 'error') {
    return { state: 'error', label: 'Error', color: 'text-[var(--error)]', bgColor: 'bg-red-100 dark:bg-red-900/30' };
  }
  return { state: 'active', label: 'Active', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' };
}

function getScheduleDisplay(job: CronJob): string {
  if (job.schedule_display) return job.schedule_display;
  if (typeof job.schedule === 'object' && job.schedule !== null) {
    return (job.schedule as { expression?: string }).expression || '';
  }
  return typeof job.schedule === 'string' ? job.schedule : '';
}

function getProfileLabel(profile?: string): string {
  return (profile || '').toString().trim() || 'server default';
}

// Detect once-style schedules (e.g. "30m", "2025-01-01T09:00")
function detectScheduleKind(schedule: string): 'once' | '' {
  const s = schedule.trim();
  if (!s) return '';
  if (s.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(s)) return 'once';
  if (/^\d+\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)$/i.test(s)) return 'once';
  return '';
}

// Format elapsed seconds into "0s", "1m 30s", etc.
function formatElapsed(seconds: number): string {
  if (seconds < 60) return Math.round(seconds) + 's';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m + 'm ' + s + 's';
}

function formatUsageStrip(usage?: CronRunUsage | null): string {
  if (!usage || typeof usage !== 'object') return '';
  const parts: string[] = [];
  const fmt = (n: number | undefined): string => {
    const value = Number(n || 0);
    if (!Number.isFinite(value) || value <= 0) return '';
    if (value >= 1000000) return (value / 1000000).toFixed(value >= 10000000 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (value >= 1000) return (value / 1000).toFixed(value >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k';
    return String(Math.round(value));
  };
  const input = fmt(usage.input_tokens);
  const output = fmt(usage.output_tokens);
  const total = fmt(usage.total_tokens);
  if (input || output) parts.push(`${input || '0'} in · ${output || '0'} out`);
  else if (total) parts.push(`${total} tokens`);
  const cost = Number(usage.estimated_cost_usd);
  if (Number.isFinite(cost) && cost > 0) parts.push(`$${cost < 0.01 ? cost.toFixed(4) : cost.toFixed(3)}`);
  if (usage.model) parts.push(String(usage.model));
  return parts.join(' · ');
}

function getCronDiagnostics(job: CronJob): string {
  const fields = {
    id: job.id,
    name: job.name || null,
    schedule: job.schedule || null,
    schedule_display: job.schedule_display || null,
    enabled: job.enabled,
    state: job.state || null,
    next_run_at: job.next_run_at || null,
    last_run_at: job.last_run_at || null,
    last_status: job.last_status || null,
    last_error: job.last_error || null,
    last_delivery_error: job.last_delivery_error || null,
    repeat: job.repeat || null,
    deliver: job.deliver || null,
    profile: job.profile || null,
    no_agent: job.no_agent || null,
    model: job.model || null,
    provider: job.provider || null,
  };
  return JSON.stringify(fields, null, 2);
}

function deduplicateName(baseName: string, existingJobs: CronJob[]): string {
  let dupName = baseName + ' (copy)';
  const taken = new Set(existingJobs.filter((j) => j.name).map((j) => j.name));
  if (taken.has(dupName)) {
    let n = 2;
    while (taken.has(baseName + ' (copy ' + n + ')')) n++;
    dupName = baseName + ' (copy ' + n + ')';
  }
  return dupName;
}

// ── Gateway notice ────────────────────────────────────────────────────────────

function GatewayNotice({ status }: { status: GatewayStatus | null }) {
  if (!status || (status.configured && status.running)) return null;

  const reason = status.health?.reason?.trim() || '';
  const isStaleMetadata = reason === 'gateway_stale_running_state';
  const isRemoteUnreachable = reason === 'remote_gateway_unreachable';
  const notConfigured = !status.configured;

  const title = notConfigured
    ? 'Gateway not configured'
    : isStaleMetadata
      ? 'Gateway metadata stale'
      : isRemoteUnreachable
        ? 'Gateway endpoint not reachable'
        : 'Gateway not running';

  const body = notConfigured
    ? 'Scheduled jobs require the Hermes gateway daemon. Jobs can be created and run manually here, but scheduled ticks need a gateway container or `hermes gateway` running outside the WebUI.'
    : isStaleMetadata
      ? 'The gateway is marked as configured, but its health metadata has gone stale. Scheduled jobs require a live gateway daemon that refreshes runtime metadata while ticking cron.'
      : isRemoteUnreachable
        ? 'The gateway health endpoint is not reachable from WebUI. Verify the configured gateway URL env var points to a reachable gateway service and network path before relying on cron ticking.'
        : 'Scheduled jobs require the Hermes gateway daemon to be running. Start the gateway container or `hermes gateway` before relying on offline scheduled runs.';

  return (
    <div className="mx-2 mt-2 px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-xs space-y-1">
      <div className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        {title}
      </div>
      <p className="text-amber-600 dark:text-amber-300">{body}</p>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function CronPanel() {
  const {
    jobs,
    loading,
    fetchJobs,
    createJob,
    updateJob,
    deleteJob,
    pauseJob,
    resumeJob,
    runJob,
    fetchHistory,
    fetchRunContent,
    fetchGatewayStatus,
    fetchRunningStatus,
    fetchRecentCompletions,
  } = useCron();
  const { toast } = useToast();
  const { t: t18n } = useTranslation();

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [createMode, setCreateMode] = useState(false);
  const [editJob, setEditJob] = useState<string | null>(null);
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus | null>(null);

  // Running job watcher state
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const [runningElapsed, setRunningElapsed] = useState(0);
  const runningStartRef = useRef<number>(0);
  const runningPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runningTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Unread completion badges
  const [unreadJobIds, setUnreadJobIds] = useState<Set<string>>(new Set());
  const cronPollSinceRef = useRef<number>(Date.now() / 1000);
  const cronPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [form, setForm] = useState({
    name: '',
    schedule: '',
    prompt: '',
    profile: '',
    no_agent: false,
    script: '',
    skills: [] as string[],
    model: '',
    model_provider: '',
    toast_notifications: true,
  });

  // Fetch profiles and skills for form dropdowns
  const { data: profilesData } = useSWR<{ profiles: { name: string }[] }>('/profiles', fetcher, {
    revalidateOnFocus: false,
  });
  const profiles = profilesData?.profiles ?? [];
  const { data: skillsData } = useSWR<{ skills: { name: string }[] }>('/skills', fetcher, {
    revalidateOnFocus: false,
  });
  const availableSkills = skillsData?.skills ?? [];

  // Schedule validation warning
  const scheduleWarning = detectScheduleKind(form.schedule);

  useEffect(() => {
    void fetchJobs();
    fetchGatewayStatus()
      .then(setGatewayStatus)
      .catch(() => {});
  }, [fetchJobs, fetchGatewayStatus]);

  // --- Running job watcher ---
  const stopWatch = useCallback(() => {
    if (runningPollRef.current) {
      clearInterval(runningPollRef.current);
      runningPollRef.current = null;
    }
    if (runningTickRef.current) {
      clearInterval(runningTickRef.current);
      runningTickRef.current = null;
    }
    runningStartRef.current = 0;
    setRunningJobId(null);
    setRunningElapsed(0);
  }, []);

  const startWatch = useCallback(
    (jobId: string, serverElapsed?: number) => {
      stopWatch();
      setRunningJobId(jobId);
      runningStartRef.current = Date.now() - (serverElapsed ?? 0) * 1000;
      setRunningElapsed(serverElapsed ?? 0);
      // Poll server every 3s to check if still running
      runningPollRef.current = setInterval(async () => {
        try {
          const data = await fetchRunningStatus(jobId);
          if (!data.running) {
            stopWatch();
            void fetchJobs();
            if (selectedJobId === jobId) {
              void fetchHistory(jobId);
            }
            return;
          }
          if (data.elapsed != null) {
            runningStartRef.current = Date.now() - data.elapsed * 1000;
            setRunningElapsed(data.elapsed);
          }
        } catch {
          /* ignore */
        }
      }, 3000);
      // Tick every second for local elapsed display
      runningTickRef.current = setInterval(() => {
        if (runningStartRef.current) {
          setRunningElapsed((Date.now() - runningStartRef.current) / 1000);
        }
      }, 1000);
    },
    [stopWatch, fetchRunningStatus, fetchJobs, fetchHistory, selectedJobId],
  );

  // Check if selected job is already running when detail opens
  useEffect(() => {
    if (!selectedJobId) {
      stopWatch();
      return;
    }
    fetchRunningStatus(selectedJobId)
      .then((data) => {
        if (data.running) startWatch(selectedJobId, data.elapsed);
      })
      .catch(() => {});
    // Clear unread for this job when viewing
    setUnreadJobIds((prev) => {
      const next = new Set(prev);
      next.delete(selectedJobId);
      return next;
    });
  }, [selectedJobId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(
    () => () => {
      stopWatch();
      if (cronPollRef.current) clearInterval(cronPollRef.current);
    },
    [stopWatch],
  );

  // --- Unread completion polling ---
  useEffect(() => {
    if (cronPollRef.current) return;
    cronPollRef.current = setInterval(async () => {
      if (document.hidden) return;
      try {
        const data = await fetchRecentCompletions(cronPollSinceRef.current);
        if (data.completions?.length) {
          const newIds = new Set<string>();
          let latestSince = cronPollSinceRef.current;
          for (const c of data.completions) {
            if (c.job_id) newIds.add(String(c.job_id));
            if (c.completed_at > latestSince) latestSince = c.completed_at;
            if (c.toast_notifications !== false) {
              toast(
                `Cron: ${c.name} ${c.status === 'error' ? 'failed' : 'completed'}`,
                c.status === 'error' ? 'error' : 'success',
              );
            }
          }
          cronPollSinceRef.current = latestSince;
          setUnreadJobIds((prev) => {
            const next = new Set(prev);
            newIds.forEach((id) => next.add(id));
            return next;
          });
        }
      } catch {
        /* ignore */
      }
    }, 30000);
  }, [fetchRecentCompletions, toast]);

  const unreadCount = unreadJobIds.size;

  const selectedJob = useMemo(() => jobs.find((j) => j.id === selectedJobId) ?? null, [jobs, selectedJobId]);

  const resetForm = useCallback(() => {
    setForm({
      name: '',
      schedule: '',
      prompt: '',
      profile: '',
      no_agent: false,
      script: '',
      skills: [],
      model: '',
      model_provider: '',
      toast_notifications: true,
    });
    setCreateMode(false);
    setEditJob(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    try {
      if (editJob) {
        const updates: Record<string, unknown> = {
          job_id: editJob,
          schedule: form.schedule,
          profile: form.profile || undefined,
        };
        if (form.prompt) updates.prompt = form.prompt;
        if (form.name) updates.name = form.name;
        if (form.no_agent) updates.no_agent = true;
        if (form.script) updates.script = form.script;
        if (form.skills.length > 0) updates.skills = form.skills;
        if (form.model) updates.model = form.model;
        if (form.model_provider) updates.model_provider = form.model_provider;
        await updateJob(updates);
        toast('Job updated', 'success');
      } else {
        const result = await createJob({
          name: form.name || undefined,
          schedule: form.schedule,
          prompt: form.prompt,
          profile: form.profile || undefined,
          no_agent: form.no_agent || undefined,
          script: form.script || undefined,
          skills: form.skills.length > 0 ? form.skills : undefined,
          model: form.model || undefined,
          model_provider: form.model_provider || undefined,
        });
        toast('Job created', 'success');
        if (result.id) setSelectedJobId(result.id);
      }
      resetForm();
      await fetchJobs();
    } catch (err) {
      toast(`Error: ${err instanceof Error ? err.message : 'Failed'}`, 'error');
    }
  }, [form, editJob, createJob, updateJob, resetForm, fetchJobs, toast]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('Delete this cron job?')) return;
      try {
        await deleteJob(id);
        toast('Job deleted', 'success');
        if (selectedJobId === id) setSelectedJobId(null);
        void fetchJobs();
      } catch (err) {
        toast(`Error: ${err instanceof Error ? err.message : 'Failed'}`, 'error');
      }
    },
    [deleteJob, fetchJobs, selectedJobId, toast],
  );

  const handleDuplicate = useCallback(
    (job: CronJob) => {
      const dupName = deduplicateName(job.name || '', jobs);
      setEditJob(null);
      setCreateMode(true);
      setForm({
        name: dupName,
        schedule: getScheduleDisplay(job),
        prompt: job.prompt || '',
        profile: job.profile || '',
        no_agent: !!job.no_agent,
        script: '',
        skills: Array.isArray(job.skills) ? job.skills : [],
        model: job.model || '',
        model_provider: job.model_provider || '',
        toast_notifications: true,
      });
    },
    [jobs],
  );

  const handleCopyDiagnostics = useCallback(
    async (job: CronJob) => {
      try {
        await navigator.clipboard.writeText(getCronDiagnostics(job));
        toast('Diagnostics copied', 'success');
      } catch {
        toast('Copy failed', 'error');
      }
    },
    [toast],
  );

  const startEdit = useCallback(
    (jobId: string) => {
      const job = jobs.find((j) => j.id === jobId);
      if (!job) return;
      setEditJob(jobId);
      setCreateMode(true);
      setForm({
        name: job.name,
        schedule: getScheduleDisplay(job),
        prompt: job.prompt,
        profile: job.profile || '',
        no_agent: !!job.no_agent,
        script: '',
        skills: Array.isArray(job.skills) ? job.skills : [],
        model: job.model || '',
        model_provider: job.model_provider || '',
        toast_notifications: true,
      });
    },
    [jobs],
  );

  return (
    <div className="flex h-full">
      {/* ── Job list ── */}
      <div className={cn('flex flex-col h-full', selectedJobId ? 'w-[40%] min-w-[200px]' : 'w-full')}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {t18n('cron.title')}
            {unreadCount > 0 && (
              <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[var(--accent)] text-white text-[10px] font-bold px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-[var(--muted)] hover:text-[var(--text)]"
              onClick={() => void fetchJobs()}
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
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
        </div>

        <GatewayNotice status={gatewayStatus} />

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading && <div className="p-4 text-sm text-[var(--muted)] text-center">Loading...</div>}

          {!loading && jobs.length === 0 && !createMode && (
            <div className="p-4 text-sm text-[var(--muted)] text-center">No cron jobs configured</div>
          )}

          {jobs.map((job) => (
            <CronJobListItem
              key={job.id}
              job={job}
              isSelected={selectedJobId === job.id}
              isRunning={runningJobId === job.id}
              hasNewRun={unreadJobIds.has(job.id)}
              runningElapsed={runningJobId === job.id ? runningElapsed : 0}
              onClick={() => setSelectedJobId(selectedJobId === job.id ? null : job.id)}
            />
          ))}

          {createMode && (
            <div className="rounded-lg border border-[var(--accent)] bg-[var(--surface)] p-3 space-y-3 mt-2">
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
                placeholder="0 9 * * 1-5 or every 1h"
              />
              {scheduleWarning === 'once' && (
                <div className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded px-2.5 py-1.5">
                  Duration forms like &quot;30m&quot; run once and are removed after running. Use &quot;every 30m&quot;
                  to keep a recurring job.
                </div>
              )}
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
              {/* Profile dropdown */}
              <div>
                <label className="text-xs font-medium text-[var(--muted)]">Profile</label>
                <select
                  value={form.profile}
                  onChange={(e) => setForm((f) => ({ ...f, profile: e.target.value }))}
                  className="w-full mt-1 px-2 py-1 text-sm border border-[var(--border)] rounded bg-transparent text-[var(--text)] outline-none"
                >
                  <option value="">(server default)</option>
                  {profiles.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              {/* No-agent mode */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="cron-no-agent"
                  checked={form.no_agent}
                  onChange={(e) => setForm((f) => ({ ...f, no_agent: e.target.checked }))}
                  className="accent-[var(--accent)]"
                />
                <label htmlFor="cron-no-agent" className="text-xs text-[var(--muted)]">
                  No-agent mode (script only)
                </label>
              </div>
              {form.no_agent && (
                <div>
                  <label className="text-xs font-medium text-[var(--muted)]">Script</label>
                  <textarea
                    value={form.script}
                    onChange={(e) => setForm((f) => ({ ...f, script: e.target.value }))}
                    rows={3}
                    className="w-full mt-1 px-2 py-1 text-sm border border-[var(--border)] rounded bg-transparent text-[var(--text)] outline-none resize-none font-mono"
                    placeholder="#!/bin/bash&#10;echo 'Hello'"
                  />
                </div>
              )}
              {/* Skills picker */}
              <div>
                <label className="text-xs font-medium text-[var(--muted)]">Skills</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {form.skills.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full bg-[var(--accent-bg)] text-[var(--accent-text)] border border-[var(--accent-bg-strong)]"
                    >
                      {s}
                      <button onClick={() => setForm((f) => ({ ...f, skills: f.skills.filter((x) => x !== s) }))}>
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value && !form.skills.includes(e.target.value)) {
                        setForm((f) => ({ ...f, skills: [...f.skills, e.target.value] }));
                      }
                    }}
                    className="px-1 py-0.5 text-[11px] border border-[var(--border)] rounded bg-transparent text-[var(--muted)] outline-none"
                  >
                    <option value="">+ Add skill</option>
                    {availableSkills
                      .filter((s) => !form.skills.includes(s.name))
                      .map((s) => (
                        <option key={s.name} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              {/* Model/Provider */}
              <div className="grid grid-cols-2 gap-2">
                <Field
                  label="Model"
                  value={form.model}
                  onChange={(v) => setForm((f) => ({ ...f, model: v }))}
                  placeholder="(default)"
                />
                <Field
                  label="Provider"
                  value={form.model_provider}
                  onChange={(v) => setForm((f) => ({ ...f, model_provider: v }))}
                  placeholder="(default)"
                />
              </div>
              {/* Toast notifications */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="cron-toast"
                  checked={form.toast_notifications}
                  onChange={(e) => setForm((f) => ({ ...f, toast_notifications: e.target.checked }))}
                  className="accent-[var(--accent)]"
                />
                <label htmlFor="cron-toast" className="text-xs text-[var(--muted)]">
                  Show toast on completion
                </label>
              </div>
              <Button size="sm" onClick={() => void handleSubmit()} disabled={!form.schedule.trim()}>
                {editJob ? 'Update' : 'Create'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Detail pane ── */}
      {selectedJob && (
        <div className="w-[60%] border-l border-[var(--border)] flex flex-col h-full bg-[var(--surface)]">
          <CronJobDetail
            job={selectedJob}
            jobs={jobs}
            isRunning={runningJobId === selectedJob.id}
            runningElapsed={runningJobId === selectedJob.id ? runningElapsed : 0}
            onClose={() => setSelectedJobId(null)}
            onRun={() => {
              void runJob(selectedJob.id).then(() => {
                toast('Job triggered', 'success');
                startWatch(selectedJob.id, 0);
                void fetchJobs();
              });
            }}
            onPause={() => {
              void pauseJob(selectedJob.id).then(() => {
                toast('Job paused', 'success');
                void fetchJobs();
              });
            }}
            onResume={() => {
              void resumeJob(selectedJob.id).then(() => {
                toast('Job resumed', 'success');
                void fetchJobs();
              });
            }}
            onEdit={() => startEdit(selectedJob.id)}
            onDuplicate={() => handleDuplicate(selectedJob)}
            onDelete={() => void handleDelete(selectedJob.id)}
            onCopyDiagnostics={() => void handleCopyDiagnostics(selectedJob)}
            fetchHistory={fetchHistory}
            fetchRunContent={fetchRunContent}
          />
        </div>
      )}
    </div>
  );
}

// ── Job list item ─────────────────────────────────────────────────────────────

function CronJobListItem({
  job,
  isSelected,
  isRunning,
  hasNewRun,
  runningElapsed,
  onClick,
}: {
  job: CronJob;
  isSelected: boolean;
  isRunning?: boolean;
  hasNewRun?: boolean;
  runningElapsed?: number;
  onClick: () => void;
}) {
  const status = getCronStatusMeta(job);
  const isAgentMode = !job.no_agent;
  const profileLabel = getProfileLabel(job.profile);

  return (
    <button
      type="button"
      className={cn(
        'rounded-lg border cursor-pointer transition-colors text-left w-full',
        isSelected
          ? 'border-[var(--accent)] bg-[var(--accent)]/10'
          : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface)]/80',
      )}
      onClick={onClick}
      aria-label="Select run"
    >
      <div className="flex items-center gap-2 p-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {isAgentMode && (
              <span title="Agent mode" className="text-xs leading-none">
                <Bot className="w-3.5 h-3.5 text-blue-500" />
              </span>
            )}
            <span className="text-sm font-medium text-[var(--text)] truncate">{job.name || '(unnamed)'}</span>
            {hasNewRun && (
              <span
                title="New completion"
                className="w-[7px] h-[7px] rounded-full bg-green-500 shrink-0 animate-pulse"
              />
            )}
            {job.profile && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--border)]/50 text-[var(--muted)] truncate max-w-[100px]"
                title={`Profile: ${profileLabel}`}
              >
                {profileLabel}
              </span>
            )}
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', status.color, status.bgColor)}>
              {status.label}
            </span>
          </div>
          <div className="text-xs text-[var(--muted)] mt-0.5 flex items-center gap-1.5">
            <span>{job.schedule_display || getScheduleDisplay(job)}</span>
            {isRunning && runningElapsed != null && runningElapsed > 0 && (
              <span className="inline-flex items-center gap-1 text-blue-500 dark:text-blue-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                {formatElapsed(runningElapsed)}
              </span>
            )}
          </div>
          {job.next_run_at && (
            <div className="text-[10px] text-[var(--muted)] mt-0.5">
              Next: <Countdown target={job.next_run_at} fallback={new Date(job.next_run_at).toLocaleString()} />
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Detail pane ───────────────────────────────────────────────────────────────

function CronJobDetail({
  job,
  jobs: _jobs,
  isRunning,
  runningElapsed,
  onClose,
  onRun,
  onPause,
  onResume,
  onEdit,
  onDuplicate,
  onDelete,
  onCopyDiagnostics,
  fetchHistory,
  fetchRunContent,
}: {
  job: CronJob;
  jobs: CronJob[];
  isRunning?: boolean;
  runningElapsed?: number;
  onClose: () => void;
  onRun: () => void;
  onPause: () => void;
  onResume: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onCopyDiagnostics: () => void;
  fetchHistory: (jobId: string) => Promise<{ runs: CronRunFile[]; total: number }>;
  fetchRunContent: (jobId: string, filename: string) => Promise<CronRunContent>;
}) {
  const status = getCronStatusMeta(job);
  const schedule = getScheduleDisplay(job);
  const nextRun = job.next_run_at ? (
    <Countdown target={job.next_run_at} fallback={new Date(job.next_run_at).toLocaleString()} />
  ) : (
    'N/A'
  );
  const lastRun = job.last_run_at ? new Date(job.last_run_at).toLocaleString() : 'Never';
  const deliver = job.deliver || 'local';
  const isNoAgent = !!job.no_agent;
  const cronJobMode = isNoAgent ? 'no-agent' : 'agent';
  const profileLabel = getProfileLabel(job.profile);
  const modelProvider = [job.provider, job.model].filter(Boolean).join('/') || (isNoAgent ? '' : 'default');
  const skills = Array.isArray(job.skills) && job.skills.length ? job.skills.join(', ') : null;
  const attention = status.state === 'needs_attention' || status.state === 'schedule_error';
  const isResumable = job.state === 'paused' || attention;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
        <Button variant="ghost" size="icon" className="h-7 w-7 text-[var(--muted)] shrink-0" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
        <h3 className="text-sm font-semibold text-[var(--text)] truncate flex-1">
          {job.name || job.schedule_display || '(unnamed)'}
        </h3>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-[var(--muted)]" onClick={onRun} title="Run now">
            <Play className="w-3.5 h-3.5" />
          </Button>
          {isResumable ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-[var(--muted)]"
              onClick={onResume}
              title="Resume"
            >
              <Play className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-[var(--muted)]" onClick={onPause} title="Pause">
              <Pause className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-[var(--muted)]" onClick={onEdit} title="Edit">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[var(--muted)]"
            onClick={onDuplicate}
            title="Duplicate"
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[var(--muted)]"
            onClick={onCopyDiagnostics}
            title="Copy diagnostics"
          >
            <ClipboardIcon className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-[var(--error)]" onClick={onDelete} title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Attention banner */}
        {attention && (
          <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 space-y-2">
            <div className="font-semibold text-amber-700 dark:text-amber-400 text-sm flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              Needs Attention
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-300">
              This recurring job has stopped firing. Resume it or run it once to re-establish the schedule.
            </p>
            {job.last_error && /croniter/i.test(job.last_error) && (
              <p className="text-xs text-amber-600 dark:text-amber-300">
                The schedule expression may not be valid. Try editing the schedule to fix the cron expression.
              </p>
            )}
            <div className="flex gap-2 flex-wrap">
              {isResumable && (
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={onResume}>
                  Resume
                </Button>
              )}
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={onRun}>
                Run once
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={onCopyDiagnostics}>
                Copy diagnostics
              </Button>
            </div>
          </div>
        )}

        {/* Status card */}
        <div className="rounded-lg border border-[var(--border)] p-3 space-y-2">
          <div className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Status</div>
          <DetailRow label="Status">
            <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', status.color, status.bgColor)}>
              {status.label}
            </span>
          </DetailRow>
          <DetailRow label="Schedule">
            <code className="text-xs">{schedule}</code>
          </DetailRow>
          <DetailRow label="Next run">{nextRun}</DetailRow>
          <DetailRow label="Last run">{lastRun}</DetailRow>
          <DetailRow label="Deliver">{deliver}</DetailRow>
          <DetailRow label="Mode">
            <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--border)]/50 text-[var(--text)]">
              {cronJobMode}
            </span>
            {modelProvider && <code className="text-[10px] text-[var(--muted)] ml-1.5">{modelProvider}</code>}
          </DetailRow>
          {isNoAgent && (
            <DetailRow label="No-agent script">
              <code className="text-xs">{job.script || '--'}</code>
            </DetailRow>
          )}
          <DetailRow label="Profile">
            <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--border)]/50 text-[var(--text)]">
              {profileLabel}
            </span>
          </DetailRow>
          <DetailRow label="Completion toasts">
            <span className="text-xs">{job.toast_notifications !== false ? 'Enabled' : 'Disabled'}</span>
          </DetailRow>
          {skills && <DetailRow label="Skills">{skills}</DetailRow>}
          {job.last_error && (
            <DetailRow label="Error">
              <span className="text-xs text-[var(--error)]">{job.last_error}</span>
            </DetailRow>
          )}
        </div>

        {/* Prompt card */}
        <PromptCard prompt={job.prompt} />

        {/* Running watcher */}
        {isRunning && (
          <div className="rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Running</span>
            {runningElapsed != null && runningElapsed > 0 && (
              <span className="text-sm text-blue-600 dark:text-blue-400 font-mono">
                {formatElapsed(runningElapsed)}
              </span>
            )}
          </div>
        )}

        {/* Run history */}
        <RunHistoryCard jobId={job.id} fetchHistory={fetchHistory} fetchRunContent={fetchRunContent} />
      </div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <div className="text-xs text-[var(--muted)] w-24 shrink-0">{label}</div>
      <div className="text-xs text-[var(--text)] min-w-0 flex-1">{children}</div>
    </div>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </svg>
  );
}

// ── Prompt card with expand/collapse ──────────────────────────────────────────

function PromptCard({ prompt }: { prompt?: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!prompt) return null;
  return (
    <div className="rounded-lg border border-[var(--border)] p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Prompt</div>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-[var(--muted)]"
          onClick={() => setExpanded((e) => !e)}
          title={expanded ? 'Collapse prompt' : 'Expand prompt'}
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </Button>
      </div>
      <div
        className={cn(
          'text-xs text-[var(--text)] whitespace-pre-wrap break-words',
          !expanded && 'max-h-[60px] overflow-hidden relative',
        )}
      >
        <div className={!expanded ? 'relative' : ''}>
          {prompt}
          {!expanded && prompt.length > 200 && (
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-[var(--surface)] to-transparent" />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Run history card ──────────────────────────────────────────────────────────

function RunHistoryCard({
  jobId,
  fetchHistory,
  fetchRunContent,
}: {
  jobId: string;
  fetchHistory: (jobId: string) => Promise<{ runs: CronRunFile[]; total: number }>;
  fetchRunContent: (jobId: string, filename: string) => Promise<CronRunContent>;
}) {
  const { data, isLoading } = useSWR(`/crons/history?job_id=${jobId}&limit=50`, () => fetchHistory(jobId), {
    revalidateOnFocus: false,
  });
  const runs = data?.runs ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="rounded-lg border border-[var(--border)] p-3 space-y-2">
      <div className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">
        Last Output{total > 0 ? ` (${total} run${total !== 1 ? 's' : ''})` : ''}
      </div>
      {isLoading && <div className="text-xs text-[var(--muted)]">Loading...</div>}
      {!isLoading && runs.length === 0 && <div className="text-xs text-[var(--muted)]">No runs yet</div>}
      {runs.map((run) => (
        <RunItem key={run.filename} run={run} jobId={jobId} fetchRunContent={fetchRunContent} />
      ))}
    </div>
  );
}

function RunItem({
  run,
  jobId,
  fetchRunContent,
}: {
  run: CronRunFile;
  jobId: string;
  fetchRunContent: (jobId: string, filename: string) => Promise<CronRunContent>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState<CronRunContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFull, setShowFull] = useState(false);

  const ts = run.filename.replace('.md', '').replace(/_/g, ' ');
  const sizeStr = run.size > 1024 ? (run.size / 1024).toFixed(1) + ' KB' : run.size + ' B';
  const dateStr = new Date(run.modified * 1000).toLocaleString();
  const usageStr = formatUsageStrip(run.usage);

  const handleToggle = useCallback(async () => {
    if (!expanded && !content) {
      setLoading(true);
      try {
        const data = await fetchRunContent(jobId, run.filename);
        setContent(data);
      } catch {
        setContent({ error: 'Failed to load run content' });
      } finally {
        setLoading(false);
      }
    }
    setExpanded((e) => !e);
  }, [expanded, content, fetchRunContent, jobId, run.filename]);

  const output = content
    ? showFull
      ? content.content || content.snippet || ''
      : content.snippet || content.content || ''
    : '';
  const canExpand = content?.content && content.snippet && content.content.length > content.snippet.length;

  return (
    <div className={cn('rounded border border-[var(--border)]', expanded && 'bg-[var(--surface)]')}>
      <button
        type="button"
        className="flex items-center justify-between px-2.5 py-1.5 cursor-pointer hover:bg-[var(--border)]/20 rounded w-full text-left"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2 text-xs min-w-0">
          <span className="text-[var(--text)] opacity-70 truncate">{ts}</span>
          <span className="text-[var(--muted)] opacity-60 text-[11px] shrink-0">{sizeStr}</span>
          <span className="text-[var(--muted)] opacity-60 text-[11px] shrink-0">{dateStr}</span>
          {usageStr && (
            <span className="text-[10px] text-[var(--muted)] bg-[var(--border)]/30 px-1.5 py-0.5 rounded shrink-0">
              {usageStr}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-[var(--muted)]"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((prev) => !prev);
            }}
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-[var(--border)] px-3 py-2">
          {loading && <div className="text-xs text-[var(--muted)]">Loading...</div>}
          {!loading && content?.error && <div className="text-xs text-[var(--error)]">{content.error}</div>}
          {!loading && output && (
            <div className="text-xs">
              <MarkdownRenderer content={output} />
            </div>
          )}
          {!loading && content?.usage && (
            <div className="mt-2 text-[10px] text-[var(--muted)] bg-[var(--border)]/20 px-2 py-1 rounded">
              {formatUsageStrip(content.usage)}
            </div>
          )}
          {!loading && !showFull && canExpand && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-xs h-6 text-[var(--muted)]"
              onClick={() => setShowFull(true)}
            >
              View full output
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Form helpers ──────────────────────────────────────────────────────────────

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

// ── Countdown: shows relative time to a target date ──────────────────────────

function Countdown({ target, fallback }: { target: string; fallback: string }) {
  const [text, setText] = useState(fallback);

  useEffect(() => {
    const ts = new Date(target).getTime();
    if (!Number.isFinite(ts)) {
      setText(fallback);
      return;
    }

    const update = () => {
      const diff = ts - Date.now();
      if (diff <= 0) {
        setText('Now');
        return;
      }
      const mins = Math.floor(diff / 60000);
      const hrs = Math.floor(mins / 60);
      const days = Math.floor(hrs / 24);
      if (days > 0) setText(`in ${days}d ${hrs % 24}h`);
      else if (hrs > 0) setText(`in ${hrs}h ${mins % 60}m`);
      else if (mins > 0) setText(`in ${mins}m ${Math.floor((diff % 60000) / 1000)}s`);
      else setText(`in ${Math.floor(diff / 1000)}s`);
    };

    update();
    const id = setInterval(update, 15000);
    return () => clearInterval(id);
  }, [target, fallback]);

  return <>{text}</>;
}
