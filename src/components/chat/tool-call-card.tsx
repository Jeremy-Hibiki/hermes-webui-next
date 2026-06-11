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

/** Extract a short title/path preview from tool args */
function getToolTitlePreview(tc: ToolCall): string {
  let args: Record<string, unknown> | null = null;
  if (tc.args && typeof tc.args === 'object') args = tc.args;
  else if (tc.arguments) { try { args = JSON.parse(tc.arguments); } catch {} }
  if (!args) return '';
  // Common preview fields: file_path, path, command, query, url
  const previewKey = ['file_path', 'path', 'filepath', 'command', 'query', 'url', 'pattern', 'dir_path'].find(
    (k) => typeof args[k] === 'string' && (args[k] as string).length > 0,
  );
  if (previewKey) return args[previewKey] as string;
  // Fallback: first string arg
  const firstStr = Object.values(args).find((v) => typeof v === 'string' && (v as string).length > 0);
  if (firstStr) return firstStr as string;
  return '';
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
  const titlePreview = getToolTitlePreview(toolCall);
  const isRunning = status === 'running';

  return (
    <div
      className={cn(
        'tool-card text-sm overflow-hidden my-1 border-l-[2px] rounded-lg transition-[border-color,background] duration-150',
        isRunning
          ? 'tool-card-running border-transparent bg-transparent'
          : expanded
            ? 'border-[var(--border-subtle,var(--border))] bg-[var(--surface-subtle)]'
            : 'border-[var(--border-subtle,var(--border))] bg-[var(--surface-subtle)] hover:border-transparent hover:bg-transparent',
      )}
      style={{ marginLeft: 'var(--msg-rail, 0px)' }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        aria-label="Expand tool call"
        className="tool-card-header w-full flex items-center gap-[7px] px-2 py-[3px] rounded-[7px] hover:bg-[var(--hover-bg)] transition-colors"
      >
        {isRunning ? (
          <span className="tool-card-running-dot shrink-0 w-[7px] h-[7px] rounded-full bg-[var(--accent)]" />
        ) : (
          <ChevronRight
            className={cn('w-3 h-3 shrink-0 text-[var(--muted)] opacity-40', expanded && 'rotate-90')}
            style={{ transition: 'transform .18s ease' }}
          />
        )}
        <span
          className={cn(
            'tool-card-name truncate text-[13px] shrink-0',
            isRunning ? 'text-[var(--accent-text)] font-semibold opacity-100' : 'text-[var(--muted)] opacity-[.56]',
          )}
        >
          {toolCall.name}
        </span>
        {titlePreview && !isRunning && (
          <span className="tool-card-title min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[var(--muted)] font-mono text-[13px] opacity-[.42]">
            {titlePreview}
          </span>
        )}
        <span className="ml-auto shrink-0 flex items-center gap-1">
          {toolCall.duration != null && expanded && (
            <span
              className="text-[10px] text-[var(--muted)] opacity-62"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {toolCall.duration.toFixed(1)}s
            </span>
          )}
          {STATUS_ICONS[status]}
        </span>
      </button>

      {/* Animated expand/collapse container */}
      <div
        className={cn(
          'tool-card-detail overflow-hidden transition-[max-height,opacity] duration-260 ease-out rounded-lg',
        )}
        style={{
          maxHeight: expanded ? '320px' : '0',
          opacity: expanded ? 1 : 0,
          transition: 'max-height 0.26s ease, opacity 0.2s ease',
        }}
      >
        <div className="pl-[var(--space-3,12px)] pb-1 text-xs">
          {argsDisplay && <div className="py-1">{argsDisplay}</div>}
          {resultDisplay && (
            <pre className="tool-card-result p-2 rounded bg-[var(--code-bg)] overflow-x-auto text-[var(--code-text)] whitespace-pre-wrap text-xs max-h-[240px] overflow-y-auto">
              {resultDisplay}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
