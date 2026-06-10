'use client';

import { useState, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api-client';
import { FileText, RefreshCw, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

const LOG_FILES = ['agent', 'errors', 'gateway'] as const;
const TAIL_OPTIONS = [100, 200, 500, 1000] as const;
const DEFAULT_TAIL = 200;

interface LogData {
  content?: string;
  lines?: string[];
  tail?: number;
  total_bytes?: number;
  mtime?: number;
  truncated?: boolean;
  hint?: string;
}

function severityForLine(line: string): 'error' | 'warning' | 'debug' | 'info' | 'other' {
  const text = line.toUpperCase();
  if (/\b(ERROR|CRITICAL|TRACEBACK)\b/.test(text)) return 'error';
  if (/\b(WARNING|WARN)\b/.test(text)) return 'warning';
  if (/\b(DEBUG)\b/.test(text)) return 'debug';
  if (/\b(INFO)\b/.test(text)) return 'info';
  return 'other';
}

export function LogsPanel() {
  const [selectedFile, setSelectedFile] = useState<string>('agent');
  const [tailLines, setTailLines] = useState(DEFAULT_TAIL);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [wrapLines, setWrapLines] = useState(false);
  const [copied, setCopied] = useState(false);
  const { t: t18n } = useTranslation();

  const { data: logData, mutate: refreshLogs } = useSWR<LogData>(
    `/logs?file=${encodeURIComponent(selectedFile)}&tail=${tailLines}`,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: autoRefresh ? 5000 : 0 },
  );

  const lines = useMemo(() => {
    if (logData?.lines) return logData.lines;
    if (logData?.content) return logData.content.split('\n');
    return [];
  }, [logData]);

  const filteredLines = useMemo(() => {
    if (severityFilter === 'all') return lines;
    return lines.filter((line) => {
      const sev = severityForLine(line);
      if (severityFilter === 'errors') return sev === 'error';
      if (severityFilter === 'warnings') return sev === 'warning' || sev === 'error';
      return true;
    });
  }, [lines, severityFilter]);

  const getLineColor = useCallback((line: string) => {
    const sev = severityForLine(line);
    switch (sev) {
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      case 'debug':
        return 'text-[var(--muted)] opacity-60';
      case 'info':
        return 'text-[var(--muted)]';
      default:
        return 'text-[var(--text)]';
    }
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(filteredLines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard write failed silently
    }
  }, [filteredLines]);

  const statusText = useMemo(() => {
    if (!logData) return '';
    const bytes = Number(logData.total_bytes || 0);
    const when = logData.mtime ? new Date(logData.mtime * 1000).toLocaleString() : '';
    const parts = [`${lines.length} / ${logData.tail || tailLines} lines`];
    if (bytes) parts.push(`${bytes.toLocaleString()} bytes`);
    if (when) parts.push(when);
    return parts.join(' · ');
  }, [logData, lines.length, tailLines]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
          <FileText className="w-4 h-4" />
          {t18n('logs.title')}
        </h2>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-[var(--muted)]"
            onClick={() => void refreshLogs()}
            title="Refresh"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-[var(--muted)]"
            onClick={() => void handleCopy()}
            title="Copy all"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[var(--border)] flex-wrap">
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-[var(--muted)]" htmlFor="logsFile">
            File
          </label>
          <select
            id="logsFile"
            value={selectedFile}
            onChange={(e) => setSelectedFile(e.target.value)}
            className="text-xs bg-transparent border border-[var(--border)] rounded px-1.5 py-0.5 text-[var(--text)] outline-none"
          >
            {LOG_FILES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-xs text-[var(--muted)]" htmlFor="logsTail">
            Tail
          </label>
          <select
            id="logsTail"
            value={tailLines}
            onChange={(e) => setTailLines(Number(e.target.value))}
            className="text-xs bg-transparent border border-[var(--border)] rounded px-1.5 py-0.5 text-[var(--text)] outline-none"
          >
            {TAIL_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-xs text-[var(--muted)]" htmlFor="logsSeverity">
            Severity
          </label>
          <select
            id="logsSeverity"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="text-xs bg-transparent border border-[var(--border)] rounded px-1.5 py-0.5 text-[var(--text)] outline-none"
          >
            <option value="all">All</option>
            <option value="errors">Errors</option>
            <option value="warnings">Warnings+</option>
          </select>
        </div>

        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="rounded border-[var(--border)]"
          />
          <span className="text-xs text-[var(--muted)]">Auto-refresh (5s)</span>
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={wrapLines}
            onChange={(e) => setWrapLines(e.target.checked)}
            className="rounded border-[var(--border)]"
          />
          <span className="text-xs text-[var(--muted)]">Wrap lines</span>
        </label>
      </div>

      {/* Log content */}
      <div className="flex-1 overflow-auto p-2 font-mono text-xs leading-5">
        {logData?.truncated && <div className="text-xs text-yellow-500 mb-1">Output truncated</div>}
        {logData?.hint && <div className="text-xs text-[var(--muted)] mb-1">{logData.hint}</div>}
        {severityFilter !== 'all' && (
          <div className="text-xs text-[var(--muted)] mb-1">
            {filteredLines.length} / {lines.length} filter active
          </div>
        )}
        {filteredLines.map((line, i) => (
          <div
            key={i}
            className={cn(wrapLines ? 'whitespace-pre-wrap break-all' : 'whitespace-pre', getLineColor(line))}
          >
            {line}
          </div>
        ))}
        {filteredLines.length === 0 && <div className="text-[var(--muted)] text-center py-8">No log entries</div>}
      </div>

      {/* Status bar */}
      {statusText && (
        <div className="px-4 py-1.5 border-t border-[var(--border)] text-xs text-[var(--muted)]">{statusText}</div>
      )}
    </div>
  );
}
