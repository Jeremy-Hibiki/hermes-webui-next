'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import type { ToolCall } from '@/types';

const STATUS_ICONS: Record<string, React.ReactNode> = {
  completed: <CheckCircle className="w-3.5 h-3.5 text-[var(--success)]" />,
  error: <AlertCircle className="w-3.5 h-3.5 text-[var(--error)]" />,
  running: <Loader2 className="w-3.5 h-3.5 text-[var(--accent)] animate-spin" />,
  pending: <Loader2 className="w-3.5 h-3.5 text-[var(--muted)]" />,
  cancelled: <XCircle className="w-3.5 h-3.5 text-[var(--muted)]" />,
};

interface ToolCallCardProps {
  toolCall: ToolCall;
}

export function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-[var(--border)] rounded-lg bg-[var(--surface)] text-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        aria-label="Expand tool call"
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--hover-bg)] transition-colors"
      >
        <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', expanded && 'rotate-90')} />
        <span className="font-medium text-[var(--text)]">{toolCall.name}</span>
        <span className="ml-auto text-xs text-[var(--muted)]">{toolCall.status}</span>
        {STATUS_ICONS[toolCall.status]}
      </button>

      {expanded && (
        <div className="px-3 pb-2 space-y-2 text-xs">
          <div>
            <span className="text-[var(--muted)]">Arguments:</span>
            <pre className="mt-1 p-2 rounded bg-[var(--code-bg)] overflow-x-auto text-[var(--code-text)]">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(toolCall.arguments), null, 2);
                } catch {
                  return toolCall.arguments;
                }
              })()}
            </pre>
          </div>
          {toolCall.result && (
            <div>
              <span className="text-[var(--muted)]">Result:</span>
              <pre className="mt-1 p-2 rounded bg-[var(--code-bg)] overflow-x-auto text-[var(--code-text)] max-h-48 overflow-y-auto">
                {toolCall.result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
