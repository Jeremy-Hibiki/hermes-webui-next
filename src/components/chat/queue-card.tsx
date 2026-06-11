'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSessionQueue, clearSessionQueue } from '@/atoms/streaming';
import type { QueuedTurn } from '@/atoms/streaming';
import { X, ChevronDown, ListStart, Layers, GripVertical, Paperclip } from 'lucide-react';

interface QueueCardProps {
  sessionId: string;
  visible: boolean;
  onVisibilityChange?: (visible: boolean) => void;
}

function queueFingerprint(sid: string) {
  const q = getSessionQueue(sid);
  return q
    .map((e) => {
      const t = e?.text || '';
      return (e?._queued_at || 0) + ':' + t.length + ':' + t.slice(0, 20);
    })
    .join('|');
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
  const cardRef = useRef<HTMLDivElement>(null);
  const lastKeyRef = useRef('');
  const dragTsRef = useRef<number | null>(null);

  const refresh = useCallback(() => {
    // Skip refresh if user is actively editing inside the queue panel
    const card = cardRef.current;
    if (card && card.contains(document.activeElement) && document.activeElement !== card) {
      return;
    }
    const key = queueFingerprint(sessionId);
    if (key === lastKeyRef.current && key !== '') return;
    lastKeyRef.current = key;
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

  const persistAndRefresh = useCallback(() => {
    const liveQ = getSessionQueue(sessionId);
    if (!liveQ.length) {
      clearSessionQueue(sessionId);
      onVisibilityChange?.(false);
    } else {
      try {
        sessionStorage.setItem(`hermes-queue-${sessionId}`, JSON.stringify(liveQ));
      } catch {
        /* ignore */
      }
    }
    lastKeyRef.current = '';
    refresh();
  }, [sessionId, refresh, onVisibilityChange]);

  const handleDelete = (ts: number) => {
    const q = getSessionQueue(sessionId);
    const idx = q.findIndex((e) => e?._queued_at === ts);
    if (idx !== -1) q.splice(idx, 1);
    persistAndRefresh();
  };

  const handleClear = () => {
    clearSessionQueue(sessionId);
    onVisibilityChange?.(false);
    lastKeyRef.current = '';
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

  const handleMerge = () => {
    const snapshot = [...getSessionQueue(sessionId)];
    const hasFiles = snapshot.some((e) => Array.isArray(e?.files) && e.files.length > 0);
    if (hasFiles) {
      // Toast would go here; for now we silently merge
    }
    const combined = snapshot
      .map((e) => e?.text || '')
      .filter(Boolean)
      .join('\n\n');
    const first = (snapshot.find((e) => e) || {}) as QueuedTurn;
    const firstFiles = (snapshot.find((e) => Array.isArray(e?.files) && e.files.length)?.files || []) as File[];
    const q = getSessionQueue(sessionId);
    q.length = 0;
    q.push({
      text: combined,
      files: firstFiles,
      model: first.model || '',
      model_provider: first.model_provider || null,
      _queued_at: Date.now(),
    });
    persistAndRefresh();
  };

  const handleDragStart = (e: React.DragEvent, ts: number) => {
    dragTsRef.current = ts;
    (e.currentTarget as HTMLElement).style.opacity = '0.4';
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).style.background = 'var(--hover-bg)';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.background = '';
  };

  const handleDrop = (e: React.DragEvent, targetTs: number) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).style.background = '';
    const fromTs = dragTsRef.current;
    dragTsRef.current = null;
    if (fromTs == null || fromTs === targetTs) return;
    const q = getSessionQueue(sessionId);
    const fromIdx = q.findIndex((e) => e?._queued_at === fromTs);
    const toIdx = q.findIndex((e) => e?._queued_at === targetTs);
    if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
      const [moved] = q.splice(fromIdx, 1);
      q.splice(toIdx, 0, moved);
      persistAndRefresh();
    }
  };

  const handleEditBlur = (ts: number, originalText: string, newText: string, hasFiles: boolean) => {
    const trimmed = newText.trim();
    if (trimmed === '' && !hasFiles) return;
    if (trimmed !== originalText) {
      const q = getSessionQueue(sessionId);
      const idx = q.findIndex((e) => e?._queued_at === ts);
      if (idx !== -1) {
        q[idx] = { ...q[idx], text: trimmed };
        try {
          sessionStorage.setItem(`hermes-queue-${sessionId}`, JSON.stringify(q));
        } catch {
          /* ignore */
        }
        lastKeyRef.current = '';
        refresh();
      }
    }
  };

  if (!entries.length) {
    if (visible) onVisibilityChange?.(false);
    return null;
  }

  const isVisible = visible && !collapsed;

  return (
    <div
      ref={cardRef}
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
              <button className="queue-card-btn" title="Combine all into one message" onClick={handleMerge}>
                <Layers className="w-3 h-3" />
                <span>Combine</span>
              </button>
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
        {entries.map((entry) => {
          const text = entry.text || '';
          const fileCount = entry.files?.length || 0;
          const ts = entry._queued_at;
          const model = entry.model;
          return (
            <div
              key={ts}
              className="queue-card-row"
              role="listitem"
              draggable
              onDragStart={(e) => handleDragStart(e, ts)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, ts)}
            >
              <span className="queue-card-drag" aria-hidden="true">
                <GripVertical className="w-3.5 h-3.5 text-[var(--muted)] opacity-40" />
              </span>
              <span
                className="queue-card-text"
                contentEditable
                role="textbox"
                aria-label="Queued message — edit in place"
                draggable={false}
                suppressContentEditableWarning
                onFocus={(e) => {
                  const el = e.currentTarget;
                  el.style.overflow = 'auto';
                  el.style.whiteSpace = 'pre-wrap';
                  el.style.textOverflow = 'clip';
                }}
                onBlur={(e) => {
                  const el = e.currentTarget;
                  el.style.overflow = '';
                  el.style.whiteSpace = '';
                  el.style.textOverflow = '';
                  handleEditBlur(ts, text, el.textContent || '', fileCount > 0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    (e.currentTarget as HTMLElement).blur();
                  }
                  if (e.key === 'Escape') {
                    (e.currentTarget as HTMLElement).textContent = text || '—';
                    (e.currentTarget as HTMLElement).blur();
                  }
                }}
              >
                {text || '—'}
              </span>
              <span className="queue-card-badges">
                {fileCount > 0 && (
                  <span
                    className="queue-card-file-badge"
                    title={entry.files?.map((f) => (typeof f === 'string' ? f : f.name)).join(', ')}
                  >
                    <Paperclip className="w-3 h-3" />
                    <span className="text-[10px]">{fileCount}</span>
                  </span>
                )}
                {model && (
                  <span className="queue-card-model-badge" title={`Model: ${model}`}>
                    {model
                      .split('/')
                      .pop()
                      ?.replace(/^(gpt-|claude-3\.?5?-|claude-|gemini-)/, '')
                      .replace(/-\d{4}-\d{2}-\d{2}$/, '')
                      .slice(0, 12)}
                  </span>
                )}
              </span>
              <button
                className="queue-card-icon-btn"
                title="Delete queued message"
                aria-label="Delete queued message"
                draggable={false}
                onClick={() => handleDelete(ts)}
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
