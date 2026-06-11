'use client';

import { useState } from 'react';
import type { ApprovalRequest } from '@/types';
import { Shield, ShieldCheck, ShieldX, Zap, ChevronDown, ChevronUp } from 'lucide-react';
interface ApprovalCardProps {
  request: ApprovalRequest;
  onRespond: (approvalId: string, choice: 'once' | 'session' | 'always' | 'deny') => void;
  onYoloToggle?: () => void;
  pendingCount?: number;
}

export function ApprovalCard({ request, onRespond, onYoloToggle, pendingCount }: ApprovalCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [responding, setResponding] = useState(false);

  const handleRespond = (choice: 'once' | 'session' | 'always' | 'deny') => {
    setResponding(true);
    onRespond(request.approval_id || request.id, choice);
  };

  return (
    <div
      className="approval-card bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg backdrop-blur-sm"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !responding) handleRespond('once');
      }}
    >
      <div className="p-4">
      <div className="approval-header flex items-center gap-2 mb-2.5 text-[13px] font-semibold text-[var(--error)]">
        <Shield className="w-4 h-4" />
        <span>Approval required</span>
        {pendingCount && pendingCount > 1 && (
          <span className="text-xs text-[var(--muted)]">{pendingCount} pending</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto inline-flex items-center justify-center w-6 h-6 border border-[var(--border2)] rounded-full bg-[var(--surface)] text-[var(--muted)] cursor-pointer hover:text-[var(--text)] hover:border-[var(--accent-bg-strong)]"
          aria-label={collapsed ? 'Expand approval' : 'Collapse approval'}
        >
          {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      {!collapsed && (
        <>
          {request.description && (
            <p className="text-xs text-[var(--muted)] mb-2 leading-relaxed">{request.description}</p>
          )}

          {request.command && (
            <pre className="text-xs p-2 rounded-lg bg-[var(--code-bg)] border border-[var(--border)] overflow-x-auto text-[var(--pre-text)] whitespace-pre-wrap break-all mb-3.5 max-h-[120px] overflow-y-auto">
              {request.command}
            </pre>
          )}

          {request.pattern_keys && request.pattern_keys.length > 0 && (
            <div className="flex gap-1 flex-wrap mb-2">
              {request.pattern_keys.map((key) => (
                <span key={key} className="text-xs px-1.5 py-0.5 rounded bg-[var(--accent-bg)] text-[var(--accent)]">
                  {key}
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2 flex-wrap items-center">
            <button
              onClick={() => handleRespond('once')}
              disabled={responding}
              className="approval-btn inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent-text)] cursor-pointer transition-all hover:bg-[var(--accent-bg-strong)] hover:-translate-y-[1px] hover:shadow-[0_2px_8px_rgba(0,0,0,0.2)] disabled:opacity-50"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Allow once
              <kbd className="approval-kbd hidden sm:inline-block ml-1 px-1 py-0.5 rounded bg-[var(--code-bg)] border border-[var(--border)] text-[10px] font-mono">
                ↵
              </kbd>
            </button>
            <button
              onClick={() => handleRespond('session')}
              disabled={responding}
              className="approval-btn inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-[var(--border2)] bg-[var(--hover-bg)] text-[var(--text)] cursor-pointer transition-all hover:bg-[rgba(255,255,255,0.12)] hover:-translate-y-[1px] hover:shadow-[0_2px_8px_rgba(0,0,0,0.2)] disabled:opacity-50"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Allow session
            </button>
            <button
              onClick={() => handleRespond('always')}
              disabled={responding}
              className="approval-btn inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-[var(--border2)] bg-[var(--hover-bg)] text-[var(--text)] cursor-pointer transition-all hover:bg-[rgba(255,255,255,0.12)] hover:-translate-y-[1px] hover:shadow-[0_2px_8px_rgba(0,0,0,0.2)] disabled:opacity-50"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Always allow
            </button>
            <button
              onClick={() => handleRespond('deny')}
              disabled={responding}
              className="approval-btn inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-[var(--error)] text-[var(--error)] cursor-pointer transition-all hover:bg-[rgba(239,83,80,0.08)] hover:-translate-y-[1px] hover:shadow-[0_2px_8px_rgba(0,0,0,0.2)] disabled:opacity-50"
            >
              <ShieldX className="w-3.5 h-3.5" />
              Deny
            </button>
            {onYoloToggle && (
              <button
                onClick={onYoloToggle}
                className="approval-btn inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-[var(--border2)] bg-[var(--hover-bg)] text-[var(--text)] cursor-pointer transition-all hover:bg-[rgba(255,255,255,0.12)] hover:-translate-y-[1px] hover:shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
              >
                <Zap className="w-3.5 h-3.5" />
                Skip all
              </button>
            )}
          </div>
        </>
      )}
      </div>
    </div>
  );
}
