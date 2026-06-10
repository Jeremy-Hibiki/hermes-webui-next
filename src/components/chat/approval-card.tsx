'use client';

import { useState } from 'react';
import type { ApprovalRequest } from '@/types';
import { Shield, ShieldCheck, ShieldX, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApprovalCardProps {
  request: ApprovalRequest;
  onRespond: (approvalId: string, choice: 'once' | 'session' | 'always' | 'deny') => void;
  onYoloToggle?: () => void;
  pendingCount?: number;
}

export function ApprovalCard({ request, onRespond, onYoloToggle, pendingCount }: ApprovalCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [responding, setResponding] = useState(false);

  const handleRespond = async (choice: 'once' | 'session' | 'always' | 'deny') => {
    setResponding(true);
    try {
      await onRespond(request.approval_id || request.id, choice);
    } finally {
      setResponding(false);
    }
  };

  return (
    <div
      className="border border-[var(--warning)] rounded-lg bg-[var(--surface)] p-3 space-y-2"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !responding) void handleRespond('once');
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[var(--warning)]" />
          <span className="font-medium text-sm text-[var(--text)]">Approval required</span>
          {pendingCount && pendingCount > 1 && (
            <span className="text-xs text-[var(--muted)]">{pendingCount} pending</span>
          )}
        </div>
        <button onClick={() => setCollapsed(!collapsed)} className="text-[var(--muted)] hover:text-[var(--text)]">
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {!collapsed && (
        <>
          {request.description && <p className="text-sm text-[var(--text)]">{request.description}</p>}

          {request.command && (
            <pre className="text-xs p-2 rounded bg-[var(--code-bg)] overflow-x-auto text-[var(--code-text)]">
              {request.command}
            </pre>
          )}

          {request.pattern_keys && request.pattern_keys.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {request.pattern_keys.map((key) => (
                <span key={key} className="text-xs px-1.5 py-0.5 rounded bg-[var(--accent-bg)] text-[var(--accent)]">
                  {key}
                </span>
              ))}
            </div>
          )}

          {Object.keys(request.tool_args).length > 0 && !request.command && (
            <pre className="text-xs p-2 rounded bg-[var(--code-bg)] overflow-x-auto text-[var(--code-text)]">
              {JSON.stringify(request.tool_args, null, 2)}
            </pre>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleRespond('once')}
              disabled={responding}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity',
                'bg-[var(--success)] text-white hover:opacity-90 disabled:opacity-50',
              )}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Allow once
            </button>
            <button
              onClick={() => handleRespond('session')}
              disabled={responding}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity',
                'bg-blue-600 text-white hover:opacity-90 disabled:opacity-50',
              )}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Allow session
            </button>
            <button
              onClick={() => handleRespond('always')}
              disabled={responding}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity',
                'bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50',
              )}
            >
              Always allow
            </button>
            <button
              onClick={() => handleRespond('deny')}
              disabled={responding}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity',
                'bg-[var(--error)] text-white hover:opacity-90 disabled:opacity-50',
              )}
            >
              <ShieldX className="w-3.5 h-3.5" />
              Deny
            </button>
            {onYoloToggle && (
              <button
                onClick={onYoloToggle}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity',
                  'bg-yellow-500 text-black hover:opacity-90',
                )}
              >
                <Zap className="w-3.5 h-3.5" />
                Skip all
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
