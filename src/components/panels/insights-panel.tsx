'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api-client';
import { BarChart3, RefreshCw, MessageSquare, Hash, Cpu, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

interface InsightsData {
  total_sessions: number;
  total_messages: number;
  total_tokens: number;
  total_cost: number;
  total_input_tokens: number;
  total_output_tokens: number;
  daily_tokens: DailyTokenEntry[];
  models: ModelUsage[];
  activity_by_day: ActivityEntry[];
  activity_by_hour: ActivityEntry[];
  period_days: number;
}

interface DailyTokenEntry {
  date: string;
  input_tokens: number;
  output_tokens: number;
  sessions: number;
  cost: number;
}

interface BucketedEntry extends DailyTokenEntry {
  label: string;
  title: string;
}

interface ModelUsage {
  model: string;
  sessions: number;
  total_tokens: number;
  cost: number;
  cost_share: number;
  token_share: number;
  session_share: number;
  input_tokens: number;
  output_tokens: number;
}

interface ActivityEntry {
  day?: string;
  hour?: number;
  sessions: number;
}

interface SkillUsage {
  usage: Record<string, { use_count: number; view_count: number; patch_count: number }>;
  skill_names?: string[];
  total_invocations: number;
  unique_skills_used: number;
}

interface WikiStatus {
  available: boolean;
  status: string;
  enabled: boolean;
  entry_count: number;
  page_count: number;
  raw_source_count: number;
  last_updated: string;
  last_writer: string;
  toggle_available: boolean;
  toggle_reason?: string;
  error?: string;
  docs_url?: string;
}

interface SystemHealth {
  cpu: number;
  memory: number;
  disk: number;
}

function formatTokens(n: number): string {
  const v = Number(n || 0);
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toLocaleString();
}

function formatCost(c: number): string {
  const v = Number(c || 0);
  if (v <= 0) return '--';
  return '$' + v.toFixed(v < 1 ? 4 : 2);
}

const PERIODS = [7, 30, 90, 365];

function bucketDailyTokens(rows: DailyTokenEntry[]): BucketedEntry[] {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const len = rows.length;
  if (len <= 30) {
    return rows.map((r) => ({
      ...r,
      label: r.date.slice(5),
      title: r.date,
    }));
  }

  let bucketSize: number;
  if (len <= 90) bucketSize = 2;
  else if (len <= 180) bucketSize = 3;
  else bucketSize = 8;

  const result: BucketedEntry[] = [];
  for (let i = 0; i < len; i += bucketSize) {
    const slice = rows.slice(i, i + bucketSize);
    const input_tokens = slice.reduce((s, r) => s + Number(r.input_tokens || 0), 0);
    const output_tokens = slice.reduce((s, r) => s + Number(r.output_tokens || 0), 0);
    const sessions = slice.reduce((s, r) => s + Number(r.sessions || 0), 0);
    const cost = slice.reduce((s, r) => s + Number(r.cost || 0), 0);
    const firstDate = slice[0].date;
    const lastDate = slice[slice.length - 1].date;
    const firstLabel = firstDate.slice(5);
    const lastLabel = lastDate.slice(5);
    const label = firstDate === lastDate ? firstLabel : `${firstLabel}–${lastLabel}`;

    result.push({
      date: firstDate,
      label,
      title: firstDate !== lastDate ? `${firstDate} – ${lastDate}` : firstDate,
      input_tokens,
      output_tokens,
      sessions,
      cost,
    });
  }
  return result;
}

export function InsightsPanel() {
  const [period, setPeriod] = useState(30);
  const { t: t18n } = useTranslation();

  const {
    data: insights,
    mutate: refreshInsights,
    error: insightsError,
  } = useSWR<InsightsData>(`/insights?days=${period}`, fetcher, {
    revalidateOnFocus: false,
    onErrorRetry: (_err, _key, _cfg, revalidate, { retryCount }) => {
      if (retryCount >= 2) return;
      setTimeout(() => void revalidate(), 5000);
    },
  });

  const { data: skillUsage } = useSWR<SkillUsage>('/skills/usage', fetcher, {
    revalidateOnFocus: false,
  });

  const { data: wikiStatus } = useSWR<WikiStatus>('/wiki/status', fetcher, {
    revalidateOnFocus: false,
  });

  const { data: health } = useSWR<SystemHealth>('/system/health', fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 30000,
  });

  const chartRows = useMemo(() => bucketDailyTokens(insights?.daily_tokens ?? []), [insights?.daily_tokens]);

  const maxDailyTokens = Math.max(...chartRows.map((r) => r.input_tokens + r.output_tokens), 1);

  const maxActivity = Math.max(...(insights?.activity_by_day.map((d) => d.sessions) || [1]));
  const maxHourly = Math.max(...(insights?.activity_by_hour.map((d) => d.sessions) || [1]));

  const peakHour = useMemo(() => {
    const hours = insights?.activity_by_hour ?? [];
    return hours.reduce((a, b) => (b.sessions > a.sessions ? b : a), { hour: 0, sessions: 0 });
  }, [insights?.activity_by_hour]);

  const labelEvery = Math.max(Math.ceil(chartRows.length / 7), 1);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          {t18n('insights.title')}
        </h2>
        <div className="flex items-center gap-2">
          {insightsError && <span className="text-xs text-[var(--error)]">Failed to load insights</span>}
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="text-xs bg-transparent border border-[var(--border)] rounded px-2 py-1 text-[var(--text)] outline-none"
            aria-label="Period"
          >
            {PERIODS.map((p) => (
              <option key={p} value={p}>
                {p} days
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-[var(--muted)]"
            onClick={() => void refreshInsights()}
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!insights ? (
          <div className="text-sm text-[var(--muted)] text-center py-8">Loading...</div>
        ) : (
          <>
            {/* System Health */}
            <SystemHealthCard health={health} />

            {/* LLM Wiki Status */}
            <WikiStatusCard status={wikiStatus} />

            {/* Skill Usage */}
            <SkillUsageCard data={skillUsage} />

            {/* Overview cards */}
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
              <StatCard
                icon={<MessageSquare className="w-[18px] h-[18px] text-[var(--muted)]" />}
                label="Sessions"
                value={insights.total_sessions.toLocaleString()}
              />
              <StatCard
                icon={<Hash className="w-[18px] h-[18px] text-[var(--muted)]" />}
                label="Messages"
                value={formatTokens(insights.total_messages)}
              />
              <StatCard
                icon={<Cpu className="w-[18px] h-[18px] text-[var(--muted)]" />}
                label="Tokens"
                value={formatTokens(insights.total_tokens)}
              />
              <StatCard
                icon={<DollarSign className="w-[18px] h-[18px] text-[var(--muted)]" />}
                label="Cost"
                value={formatCost(insights.total_cost)}
              />
            </div>

            {/* Daily token chart - vertical bars */}
            {chartRows.length > 0 && (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                <div className="text-xs font-medium text-[var(--text)] mb-2">Daily Tokens</div>
                <div className="flex items-end gap-[2px]" style={{ height: 180 }}>
                  {chartRows.map((r, idx) => {
                    const inputPct = Math.max((r.input_tokens / maxDailyTokens) * 100, r.input_tokens ? 2 : 0);
                    const outputPct = Math.max((r.output_tokens / maxDailyTokens) * 100, r.output_tokens ? 2 : 0);
                    const showLabel = idx === 0 || idx === chartRows.length - 1 || idx % labelEvery === 0;
                    return (
                      <div
                        key={r.label + idx}
                        className="flex-1 flex flex-col items-center justify-end min-w-0"
                        title={`${r.title} · ${formatTokens(r.input_tokens)} input · ${formatTokens(r.output_tokens)} output · ${formatCost(r.cost)} · ${r.sessions} sessions`}
                      >
                        <div className="w-full flex flex-col justify-end" style={{ height: 150 }}>
                          <div
                            className="w-full"
                            style={{
                              height: `${outputPct}%`,
                              background: 'color-mix(in srgb, var(--accent) 55%, var(--text))',
                              borderRadius: '2px 2px 0 0',
                            }}
                          />
                          <div
                            className="w-full"
                            style={{
                              height: `${inputPct}%`,
                              background: 'var(--accent)',
                              borderRadius: '0 0 2px 2px',
                            }}
                          />
                        </div>
                        <span className="text-[9px] text-[var(--muted)] truncate w-full text-center mt-0.5">
                          {showLabel ? r.label : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 text-xs text-[var(--muted)] mt-2">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm" style={{ background: 'var(--accent)' }} /> Input
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-sm"
                      style={{ background: 'color-mix(in srgb, var(--accent) 55%, var(--text))' }}
                    />{' '}
                    Output
                  </span>
                </div>
              </div>
            )}

            {/* Token breakdown + Models side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Token breakdown */}
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                <div className="text-xs font-medium text-[var(--text)] mb-2">Token Breakdown</div>
                <div className="space-y-1.5">
                  <TokenRow label="Input" value={formatTokens(insights.total_input_tokens)} />
                  <TokenRow label="Output" value={formatTokens(insights.total_output_tokens)} />
                  <TokenRow label="Total" value={formatTokens(insights.total_tokens)} bold />
                </div>
              </div>

              {/* Models table */}
              {insights.models.length > 0 && (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                  <div className="text-xs font-medium text-[var(--text)] mb-2">Models</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[var(--muted)] border-b border-[var(--border)]">
                          <th className="text-left py-1 font-medium">Model</th>
                          <th className="text-right py-1 font-medium">Sessions</th>
                          <th className="text-right py-1 font-medium">Tokens</th>
                          <th className="text-right py-1 font-medium">Cost</th>
                          <th className="text-right py-1 font-medium">Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {insights.models.map((m) => {
                          const share = Number(m.cost_share || m.token_share || m.session_share || 0);
                          return (
                            <tr key={m.model} className="border-b border-[var(--border)]">
                              <td className="py-1 text-[var(--text)] truncate max-w-24" title={m.model}>
                                {m.model}
                              </td>
                              <td className="py-1 text-right text-[var(--text)]">{m.sessions}</td>
                              <td className="py-1 text-right text-[var(--text)]">{formatTokens(m.total_tokens)}</td>
                              <td className="py-1 text-right text-[var(--text)]">{formatCost(m.cost)}</td>
                              <td className="py-1 text-right text-[var(--muted)]">{share.toFixed(1)}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Activity by day */}
            {insights.activity_by_day.length > 0 && (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                <div className="text-xs font-medium text-[var(--text)] mb-2">Activity by Day</div>
                <div className="space-y-1">
                  {insights.activity_by_day.map((d) => {
                    const pct = maxActivity > 0 ? (d.sessions / maxActivity) * 100 : 0;
                    return (
                      <div key={d.day} className="flex items-center gap-2 text-xs">
                        <span className="w-10 text-[var(--muted)] shrink-0 text-right">{d.day}</span>
                        <div className="flex-1 h-3 bg-[var(--input-bg)] rounded overflow-hidden">
                          <div className="h-full bg-[var(--accent)] rounded" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-8 text-right text-[var(--muted)] shrink-0">{d.sessions}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Activity by hour - horizontal bars with peak highlight */}
            {insights.activity_by_hour.length > 0 && (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                <div className="text-xs font-medium text-[var(--text)] mb-1">
                  Activity by Hour{' '}
                  {peakHour.sessions > 0 && (
                    <span className="font-normal text-[var(--muted)]">
                      Peak: {String(peakHour.hour).padStart(2, '0')}:00
                    </span>
                  )}
                </div>
                <div className="space-y-0.5">
                  {insights.activity_by_hour.map((d) => {
                    const pct = maxHourly > 0 ? (d.sessions / maxHourly) * 100 : 0;
                    const isPeak = d.hour === peakHour.hour && peakHour.sessions > 0;
                    return (
                      <div key={d.hour} className="flex items-center gap-2 text-xs">
                        <span className="w-6 text-[var(--muted)] shrink-0 text-right">
                          {String(d.hour).padStart(2, '0')}
                        </span>
                        <div className="flex-1 h-2.5 bg-[var(--input-bg)] rounded overflow-hidden">
                          <div
                            className={cn('h-full rounded', isPeak ? 'bg-[#f6ad55]' : 'bg-[var(--accent)]')}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-6 text-right text-[var(--muted)] shrink-0">{d.sessions}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-[10px] text-[var(--muted)] opacity-60">
              Data covers the last {insights.period_days} days
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 flex items-center gap-3">
      <div className="shrink-0">{icon}</div>
      <div>
        <div className="text-[22px] font-bold leading-tight text-[var(--text)]">{value}</div>
        <div className="text-xs text-[var(--muted)]">{label}</div>
      </div>
    </div>
  );
}

function TokenRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      className={cn('flex items-center justify-between py-1', bold && 'border-t border-[var(--border)] mt-1 pt-1.5')}
    >
      <span className="text-xs text-[var(--muted)]">{label}</span>
      <span className={cn('text-xs', bold ? 'font-semibold text-[var(--text)]' : 'text-[var(--text)]')}>{value}</span>
    </div>
  );
}

function SystemHealthCard({ health }: { health?: SystemHealth }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-xs font-medium text-[var(--text)]">System Health</div>
          <div className="text-[10px] text-[var(--muted)]">Current VPS resource usage</div>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
          <span className={cn('w-1.5 h-1.5 rounded-full', health ? 'bg-green-500' : 'bg-[var(--muted)]')} />
          {health ? 'Available' : 'Loading...'}
        </span>
      </div>
      <div className="space-y-2">
        <HealthBar label="CPU" value={health?.cpu} />
        <HealthBar label="RAM" value={health?.memory} />
        <HealthBar label="Disk" value={health?.disk} />
      </div>
      <div className="text-[10px] text-[var(--muted)] mt-2 opacity-60">Live snapshot only</div>
    </div>
  );
}

function HealthBar({ label, value }: { label: string; value?: number | string }) {
  const pct = Number(value ?? 0);
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-0.5">
        <span className="text-[var(--muted)]">{label}</span>
        <span className="text-[var(--text)]">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-[5px] bg-[var(--input-bg)] rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            pct > 80 ? 'bg-red-500' : pct > 60 ? 'bg-yellow-500' : 'bg-green-500',
          )}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

function WikiStatusCard({ status }: { status?: WikiStatus }) {
  if (!status) return null;

  const isReady = status.available && status.status === 'ready';
  const isEmpty = status.available && status.status === 'empty';
  const isError = status.status === 'error';
  const badgeClass = isReady
    ? 'bg-green-500/15 text-green-400'
    : isError
      ? 'bg-red-500/15 text-red-400'
      : isEmpty
        ? 'bg-yellow-500/15 text-yellow-400'
        : 'bg-[var(--input-bg)] text-[var(--muted)]';
  const badgeText = isReady ? 'Available' : isError ? 'Error' : isEmpty ? 'Empty' : 'Unavailable';
  const statusNote = isReady
    ? 'LLM Wiki is configured and page metadata is visible.'
    : isEmpty
      ? 'LLM Wiki exists but has no pages yet.'
      : isError
        ? `Unable to inspect LLM Wiki status${status.error ? ': ' + status.error : ''}.`
        : 'No LLM Wiki directory was found.';

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-xs font-medium text-[var(--text)]">LLM Wiki</div>
          <div className="text-[10px] text-[var(--muted)]">Knowledge-base observability</div>
        </div>
        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', badgeClass)}>{badgeText}</span>
      </div>
      <div className="text-xs text-[var(--muted)] mb-2">{statusNote}</div>
      <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-[var(--muted)]">Enabled</span>
          <span className="text-[var(--text)]">{status.enabled ? 'Yes' : 'No'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--muted)]">Entries</span>
          <span className="text-[var(--text)]">{(status.entry_count || 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--muted)]">Pages</span>
          <span className="text-[var(--text)]">{(status.page_count || 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--muted)]">raw/ files</span>
          <span className="text-[var(--text)]">{(status.raw_source_count || 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--muted)]">Updated</span>
          <span className="text-[var(--text)]">
            {status.last_updated ? new Date(status.last_updated).toLocaleString() : 'Never'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--muted)]">Writer</span>
          <span className="text-[var(--text)]">{status.last_writer || 'N/A'}</span>
        </div>
      </div>
    </div>
  );
}

function SkillUsageCard({ data }: { data?: SkillUsage }) {
  if (!data || data.total_invocations === 0) return null;

  const entries = Object.entries(data.usage)
    .map(([name, meta]) => ({
      name,
      useCount: meta.use_count,
      viewCount: meta.view_count,
      patchCount: meta.patch_count,
    }))
    .sort((a, b) => b.useCount - a.useCount)
    .slice(0, 10);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="text-xs font-medium text-[var(--text)] mb-2">Skill Usage</div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="text-xs">
          <span className="text-[var(--muted)]">Total</span>{' '}
          <span className="text-[var(--text)] font-medium">{data.total_invocations.toLocaleString()}</span>
        </div>
        <div className="text-xs">
          <span className="text-[var(--muted)]">Unique</span>{' '}
          <span className="text-[var(--text)] font-medium">
            {data.unique_skills_used}/{(data.skill_names ?? []).length || data.unique_skills_used}
          </span>
        </div>
      </div>
      {entries.length > 0 && (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[var(--muted)] border-b border-[var(--border)]">
              <th className="text-left py-1 font-medium">Skill</th>
              <th className="text-right py-1 font-medium">Uses</th>
              <th className="text-right py-1 font-medium">Views</th>
              <th className="text-right py-1 font-medium">Patches</th>
              <th className="text-right py-1 font-medium">Share</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const share =
                data.total_invocations > 0 ? ((e.useCount / data.total_invocations) * 100).toFixed(1) : '0.0';
              return (
                <tr key={e.name} className="border-b border-[var(--border)]">
                  <td className="py-1 text-[var(--text)] truncate max-w-24" title={e.name}>
                    {e.name}
                  </td>
                  <td className="py-1 text-right text-[var(--text)]">{e.useCount}</td>
                  <td className="py-1 text-right text-[var(--text)]">{e.viewCount}</td>
                  <td className="py-1 text-right text-[var(--text)]">{e.patchCount}</td>
                  <td className="py-1 text-right text-[var(--muted)]">{share}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <div className="text-[10px] text-[var(--muted)] mt-2 opacity-60">Top 10 skills by invocation count</div>
    </div>
  );
}
