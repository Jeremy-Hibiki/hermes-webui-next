'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import type { ToolCall } from '@/types';

function getStatus(tc: ToolCall): string {
  if (tc.status) return tc.status;
  if (tc.done === false) return 'running';
  if (tc.is_error) return 'error';
  if (tc.done === true) return 'completed';
  return 'completed';
}

function renderArgsAsKeyValue(tc: ToolCall): React.ReactNode {
  let args: Record<string, unknown> | null = null;
  if (tc.args && typeof tc.args === 'object') {
    args = tc.args;
  } else if (tc.arguments) {
    try {
      args = JSON.parse(tc.arguments);
    } catch {
      return <code className="text-[var(--muted)]">{tc.arguments}</code>;
    }
  }
  if (!args || Object.keys(args).length === 0) return null;

  return (
    <div className="space-y-0.5">
      {Object.entries(args).map(([key, value]) => (
        <div key={key} className="flex gap-2 text-xs">
          <span className="text-[var(--blue,#3b82f6)] font-medium font-mono shrink-0">{key}:</span>
          <span className="font-mono text-[var(--code-text)] break-all">
            {typeof value === 'string' ? value : JSON.stringify(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function getResultDisplay(tc: ToolCall): string {
  return tc.result || tc.snippet || tc.preview || '';
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  completed: <CheckCircle className="w-3 h-3 text-[var(--success)]" />,
  error: <AlertCircle className="w-3 h-3 text-[var(--error)]" />,
  running: <Loader2 className="w-3 h-3 text-[var(--accent)] animate-spin" />,
  pending: <Loader2 className="w-3 h-3 text-[var(--muted)]" />,
  cancelled: <XCircle className="w-3 h-3 text-[var(--muted)]" />,
};

interface ToolCallCardProps {
  toolCall: ToolCall;
}

export function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);
  const status = getStatus(toolCall);
  const argsDisplay = renderArgsAsKeyValue(toolCall);
  const resultDisplay = getResultDisplay(toolCall);
  const isRunning = status === 'running';

  return (
    <div
      className="tool-card text-sm overflow-hidden my-1 border-l-[2px] border-[var(--border-subtle,var(--border))] bg-[var(--surface-subtle)] rounded-lg"
      style={{ marginLeft: 'var(--msg-rail, 0px)' }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        aria-label="Expand tool call"
        className="w-full flex items-center gap-[7px] px-2 py-[3px] rounded-[7px] hover:bg-[var(--hover-bg)] transition-colors"
      >
        {isRunning ? (
          <span className="tool-running-dot shrink-0 w-[7px] h-[7px] rounded-full bg-[var(--accent)]" />
        ) : (
          <ChevronRight
            className={cn('w-3 h-3 shrink-0 text-[var(--muted)] opacity-40', expanded && 'rotate-90')}
            style={{ transition: 'transform .18s ease' }}
          />
        )}
        <span
          className={cn(
            'truncate text-[13px]',
            isRunning ? 'text-[var(--accent)] font-semibold' : 'text-[var(--muted)] opacity-[.56]',
          )}
        >
          {toolCall.name}
        </span>
        {expanded && (
          <span className="ml-auto shrink-0 flex items-center gap-1">
            {toolCall.duration != null && (
              <span
                className="text-[10px] text-[var(--muted)] opacity-62"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {toolCall.duration.toFixed(1)}s
              </span>
            )}
            {STATUS_ICONS[status]}
          </span>
        )}
      </button>

      {expanded && (
        <div className="pl-[var(--space-3,12px)] pb-1 text-xs">
          {argsDisplay && <div className="py-1">{argsDisplay}</div>}
          {resultDisplay && (
            <pre className="tool-card-result p-2 rounded bg-[var(--code-bg)] overflow-x-auto text-[var(--code-text)] whitespace-pre-wrap text-xs max-h-[240px] overflow-y-auto">
              {resultDisplay}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
