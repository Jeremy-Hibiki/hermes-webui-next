"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/api-client";
import { BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  total_invocations: number;
  unique_skills_used: number;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatCost(n: number): string {
  return `$${n.toFixed(2)}`;
}

const PERIODS = [7, 30, 90, 365];

export function InsightsPanel() {
  const [period, setPeriod] = useState(30);

  const { data: insights, mutate: refreshInsights } = useSWR<InsightsData>(
    `/insights?days=${period}`,
    fetcher,
    { revalidateOnFocus: false },
  );

  const { data: skillUsage } = useSWR<SkillUsage>("/skills/usage", fetcher, {
    revalidateOnFocus: false,
  });

  const maxDailyTokens = Math.max(
    ...(insights?.daily_tokens.map((d) => d.input_tokens + d.output_tokens) || [1]),
  );

  const maxActivity = Math.max(...(insights?.activity_by_day.map((d) => d.sessions) || [1]));
  const maxHourly = Math.max(...(insights?.activity_by_hour.map((d) => d.sessions) || [1]));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Insights
        </h2>
        <div className="flex items-center gap-2">
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

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {!insights ? (
          <div className="text-sm text-[var(--muted)] text-center py-8">Loading...</div>
        ) : (
          <>
            {/* Overview cards */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Sessions" value={insights.total_sessions.toString()} />
              <StatCard label="Messages" value={formatTokens(insights.total_messages)} />
              <StatCard label="Tokens" value={formatTokens(insights.total_tokens)} />
              <StatCard label="Cost" value={formatCost(insights.total_cost)} />
            </div>

            {/* Token breakdown */}
            <div>
              <h3 className="text-xs font-medium text-[var(--muted)] mb-2">Token Breakdown</h3>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 text-center">
                  <div className="text-[var(--text)] font-medium">
                    {formatTokens(insights.total_input_tokens)}
                  </div>
                  <div className="text-[var(--muted)]">Input</div>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 text-center">
                  <div className="text-[var(--text)] font-medium">
                    {formatTokens(insights.total_output_tokens)}
                  </div>
                  <div className="text-[var(--muted)]">Output</div>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 text-center">
                  <div className="text-[var(--text)] font-medium">
                    {formatTokens(insights.total_tokens)}
                  </div>
                  <div className="text-[var(--muted)]">Total</div>
                </div>
              </div>
            </div>

            {/* Daily token chart */}
            {insights.daily_tokens.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-[var(--muted)] mb-2">Daily Tokens</h3>
                <div className="space-y-1">
                  {insights.daily_tokens.map((d) => {
                    const total = d.input_tokens + d.output_tokens;
                    const inputPct = total > 0 ? (d.input_tokens / total) * 100 : 0;
                    const widthPct = maxDailyTokens > 0 ? (total / maxDailyTokens) * 100 : 0;
                    return (
                      <div key={d.date} className="flex items-center gap-2 text-xs">
                        <span className="w-16 text-[var(--muted)] shrink-0">{d.date.slice(5)}</span>
                        <div className="flex-1 h-4 bg-[var(--surface)] rounded overflow-hidden">
                          <div className="h-full flex" style={{ width: `${widthPct}%` }}>
                            <div className="h-full bg-blue-400" style={{ width: `${inputPct}%` }} />
                            <div
                              className="h-full bg-purple-400"
                              style={{ width: `${100 - inputPct}%` }}
                            />
                          </div>
                        </div>
                        <span className="w-12 text-right text-[var(--muted)] shrink-0">
                          {formatTokens(total)}
                        </span>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-4 text-xs text-[var(--muted)] pt-1">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-blue-400" /> Input
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-purple-400" /> Output
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Models table */}
            {insights.models.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-[var(--muted)] mb-2">Models</h3>
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
                      {insights.models.map((m) => (
                        <tr key={m.model} className="border-b border-[var(--border)]">
                          <td className="py-1 text-[var(--text)] truncate max-w-24">{m.model}</td>
                          <td className="py-1 text-right text-[var(--text)]">{m.sessions}</td>
                          <td className="py-1 text-right text-[var(--text)]">
                            {formatTokens(m.total_tokens)}
                          </td>
                          <td className="py-1 text-right text-[var(--text)]">
                            {formatCost(m.cost)}
                          </td>
                          <td className="py-1 text-right text-[var(--muted)]">
                            {(m.token_share * 100).toFixed(0)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Activity by day of week */}
            {insights.activity_by_day.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-[var(--muted)] mb-2">Activity by Day</h3>
                <div className="space-y-1">
                  {insights.activity_by_day.map((d) => {
                    const widthPct = maxActivity > 0 ? (d.sessions / maxActivity) * 100 : 0;
                    return (
                      <div key={d.day} className="flex items-center gap-2 text-xs">
                        <span className="w-10 text-[var(--muted)] shrink-0">{d.day}</span>
                        <div className="flex-1 h-3 bg-[var(--surface)] rounded overflow-hidden">
                          <div
                            className="h-full bg-[var(--accent)] rounded"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-[var(--muted)] shrink-0">
                          {d.sessions}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Activity by hour */}
            {insights.activity_by_hour.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-[var(--muted)] mb-2">Activity by Hour</h3>
                <div className="flex items-end gap-px h-16">
                  {insights.activity_by_hour.map((d) => {
                    const heightPct = maxHourly > 0 ? (d.sessions / maxHourly) * 100 : 0;
                    const isPeak = d.sessions === maxHourly && d.sessions > 0;
                    return (
                      <div
                        key={d.hour}
                        className="flex-1 flex flex-col items-center justify-end"
                        title={`${d.hour}:00 — ${d.sessions} sessions`}
                      >
                        <div
                          className={cn(
                            "w-full rounded-t",
                            isPeak ? "bg-[var(--accent)]" : "bg-[var(--muted)]/30",
                          )}
                          style={{ height: `${heightPct}%`, minHeight: d.sessions > 0 ? 2 : 0 }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-[var(--muted)] mt-1">
                  <span>0h</span>
                  <span>6h</span>
                  <span>12h</span>
                  <span>18h</span>
                  <span>23h</span>
                </div>
              </div>
            )}

            {/* Skill usage */}
            {skillUsage && skillUsage.total_invocations > 0 && (
              <div>
                <h3 className="text-xs font-medium text-[var(--muted)] mb-2">
                  Skill Usage ({skillUsage.total_invocations} invocations,{" "}
                  {skillUsage.unique_skills_used} unique)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[var(--muted)] border-b border-[var(--border)]">
                        <th className="text-left py-1 font-medium">Skill</th>
                        <th className="text-right py-1 font-medium">Uses</th>
                        <th className="text-right py-1 font-medium">Views</th>
                        <th className="text-right py-1 font-medium">Patches</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(skillUsage.usage)
                        .sort(([, a], [, b]) => b.use_count - a.use_count)
                        .slice(0, 10)
                        .map(([name, u]) => (
                          <tr key={name} className="border-b border-[var(--border)]">
                            <td className="py-1 text-[var(--text)] truncate max-w-28">{name}</td>
                            <td className="py-1 text-right text-[var(--text)]">{u.use_count}</td>
                            <td className="py-1 text-right text-[var(--text)]">{u.view_count}</td>
                            <td className="py-1 text-right text-[var(--text)]">{u.patch_count}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className="text-lg font-semibold text-[var(--text)] mt-0.5">{value}</div>
    </div>
  );
}
