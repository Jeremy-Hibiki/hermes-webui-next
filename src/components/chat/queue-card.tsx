'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSessionQueue, clearSessionQueue } from '@/atoms/streaming';
import { X, ChevronDown, ListStart } from 'lucide-react';

interface QueueCardProps {
  sessionId: string;
  visible: boolean;
  onVisibilityChange?: (visible: boolean) => void;
}

export function QueueCard({ sessionId, visible, onVisibilityChange }: QueueCardProps) {
  const [entries, setEntries] = useState(getSessionQueue(sessionId));
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return sessionStorage.getItem(`hermes-queue-collapsed-${sessionId}`) === '1';
    } catch {
      return false;
    }
  });

  const refresh = useCallback(() => {
    setEntries(getSessionQueue(sessionId));
  }, [sessionId]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 300);
    return () => clearInterval(id);
  }, [refresh]);

  // Clear collapsed state when parent forces visible (user clicked pill)
  useEffect(() => {
    if (visible && collapsed) {
      setCollapsed(false);
      try {
        sessionStorage.removeItem(`hermes-queue-collapsed-${sessionId}`);
      } catch {
        /* ignore */
      }
    }
  }, [visible, collapsed, sessionId]);

  const handleDelete = (index: number) => {
    const q = getSessionQueue(sessionId);
    q.splice(index, 1);
    if (!q.length) {
      clearSessionQueue(sessionId);
      onVisibilityChange?.(false);
    } else {
      try {
        sessionStorage.setItem(`hermes-queue-${sessionId}`, JSON.stringify(q));
      } catch {
        /* ignore */
      }
    }
    refresh();
  };

  const handleClear = () => {
    clearSessionQueue(sessionId);
    onVisibilityChange?.(false);
    refresh();
  };

  const handleHide = () => {
    setCollapsed(true);
    try {
      sessionStorage.setItem(`hermes-queue-collapsed-${sessionId}`, '1');
    } catch {
      /* ignore */
    }
    onVisibilityChange?.(false);
  };

  if (!entries.length) {
    if (visible) onVisibilityChange?.(false);
    return null;
  }

  const isVisible = visible && !collapsed;

  return (
    <div
      id="queueCard"
      className={cn('queue-card', isVisible && 'visible')}
      role="region"
      aria-label="Queued messages"
      aria-live="polite"
    >
      <div className="queue-card-inner">
        {entries.length > 1 && (
          <div className="queue-card-header">
            <span title="Sends automatically after the current response completes">{entries.length} queued</span>
            <span className="queue-card-header-actions">
              <button
                className="queue-card-icon-btn"
                title="Clear all queued messages"
                aria-label="Clear all queued messages"
                onClick={handleClear}
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                className="queue-card-icon-btn"
                title="Hide queue (click the queue pill to show again)"
                aria-label="Hide queue panel"
                onClick={handleHide}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </span>
          </div>
        )}
        {entries.map((entry, i) => {
          const text = entry.text || '';
          const fileCount = entry.files?.length || 0;
          return (
            <div key={entry._queued_at || i} className="queue-card-row" role="listitem">
              <ListStart className="w-3.5 h-3.5 text-[var(--muted)] opacity-40 shrink-0" />
              <span className="queue-card-text">{text || '—'}</span>
              <span className="queue-card-badges">
                {fileCount > 0 && (
                  <span className="queue-card-file-badge">
                    <span className="text-[10px]">📎 {fileCount}</span>
                  </span>
                )}
              </span>
              <button
                className="queue-card-icon-btn"
                title="Delete queued message"
                aria-label="Delete queued message"
                onClick={() => handleDelete(i)}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface QueuePillProps {
  sessionId: string;
  onClick?: () => void;
}

export function QueuePill({ sessionId, onClick }: QueuePillProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () => setCount(getSessionQueue(sessionId).length);
    update();
    const id = setInterval(update, 300);
    return () => clearInterval(id);
  }, [sessionId]);

  if (!count) return null;

  return (
    <div className="queue-pill-outer show">
      <button id="queuePill" className="queue-pill" aria-label="Show queued messages" type="button" onClick={onClick}>
        <ListStart className="w-3.5 h-3.5" />
        <span>
          <span className="queue-pill-count">{count}</span> queued
        </span>
        <ChevronDown className="w-3.5 h-3.5 queue-pill-chevron" />
      </button>
    </div>
  );
}

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
