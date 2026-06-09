'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api-client';
import { FileText, RefreshCw, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LogsResponse {
  files: string[];
  content?: string;
  file?: string;
}

export function LogsPanel() {
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [tailLines, setTailLines] = useState(100);
  const [level, setLevel] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: fileList } = useSWR<LogsResponse>('/logs', fetcher, { revalidateOnFocus: false });

  const { data: logContent } = useSWR<{ content: string }>(
    selectedFile ? `/logs?file=${encodeURIComponent(selectedFile)}&tail=${tailLines}` : null,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: autoRefresh ? 5000 : 0 },
  );

  useEffect(() => {
    if (fileList?.files?.length && !selectedFile) {
      setSelectedFile(fileList.files[0]);
    }
  }, [fileList, selectedFile]);

  const lines = (logContent?.content ?? '').split('\n');

  const filteredLines =
    level === 'all'
      ? lines
      : lines.filter((line) => {
          const upper = line.toUpperCase();
          if (level === 'ERROR') return upper.includes('ERROR') || upper.includes('CRITICAL');
          if (level === 'WARN') return upper.includes('WARN') || upper.includes('ERROR') || upper.includes('CRITICAL');
          return true;
        });

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(filteredLines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [filteredLines]);

  const getLineColor = (line: string) => {
    const upper = line.toUpperCase();
    if (upper.includes('ERROR') || upper.includes('CRITICAL')) return 'text-red-400';
    if (upper.includes('WARN') || upper.includes('WARNING')) return 'text-yellow-400';
    if (upper.includes('INFO')) return 'text-[var(--muted)]';
    if (upper.includes('DEBUG')) return 'text-[var(--muted)] opacity-60';
    return 'text-[var(--text)]';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Logs
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={tailLines}
            onChange={(e) => setTailLines(Number(e.target.value))}
            aria-label="Tail lines"
            className="text-xs bg-transparent border border-[var(--border)] rounded px-1.5 py-0.5 text-[var(--text)] outline-none"
          >
            <option value={100}>100</option>
            <option value={500}>500</option>
            <option value={1000}>1000</option>
          </select>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            aria-label="Log level"
            className="text-xs bg-transparent border border-[var(--border)] rounded px-1.5 py-0.5 text-[var(--text)] outline-none"
          >
            <option value="all">All</option>
            <option value="ERROR">Errors</option>
            <option value="WARN">Warnings+</option>
            <option value="INFO">Info</option>
          </select>
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-6 w-6 text-[var(--muted)]', autoRefresh && 'text-[var(--accent)]')}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? 'Stop auto-refresh' : 'Auto-refresh (5s)'}
          >
            <RefreshCw className={cn('w-3 h-3', autoRefresh && 'animate-spin')} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-[var(--muted)]"
            onClick={() => void handleCopy()}
            title="Copy"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* File selector */}
        <div className="w-36 border-r border-[var(--border)] overflow-y-auto p-1">
          {(fileList?.files ?? []).map((f) => (
            <button
              key={f}
              onClick={() => setSelectedFile(f)}
              className={cn(
                'w-full text-left px-2 py-1.5 text-xs rounded truncate transition-colors',
                selectedFile === f
                  ? 'bg-[var(--accent-bg)] text-[var(--accent)]'
                  : 'text-[var(--text)] hover:bg-[var(--hover-bg)]',
              )}
            >
              {f.split('/').pop()}
            </button>
          ))}
        </div>

        {/* Log content */}
        <div className="flex-1 overflow-auto p-2 font-mono text-xs leading-5">
          {filteredLines.map((line, i) => (
            <div key={i} className={cn('whitespace-pre-wrap break-all', getLineColor(line))}>
              {line}
            </div>
          ))}
          {filteredLines.length === 0 && <div className="text-[var(--muted)] text-center py-8">No log entries</div>}
        </div>
      </div>
    </div>
  );
}
