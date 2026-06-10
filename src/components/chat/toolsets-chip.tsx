'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAtom } from 'jotai';
import { Wrench } from 'lucide-react';
import { ChevronDown } from 'lucide-react';
import { activeSessionAtom } from '@/atoms/session';
import { apiPost } from '@/lib/api-client';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function ToolsetsChip() {
  const [session, setActiveSession] = useAtom(activeSessionAtom);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const currentToolsets = session?.enabled_toolsets ?? null;
  const hasCustom = Array.isArray(currentToolsets) && currentToolsets.length > 0;
  const label = hasCustom ? currentToolsets.join(', ') : t('session_toolsets_global');

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Sync input value with current toolsets when opening
  useEffect(() => {
    if (open) {
      setInputValue(hasCustom ? (currentToolsets as string[]).join(', ') : '');
    }
  }, [open, hasCustom, currentToolsets]);

  const handleApply = useCallback(async () => {
    if (!session?.session_id) return;
    const trimmed = inputValue
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    setLoading(true);
    try {
      await apiPost('/api/session/toolsets', {
        session_id: session.session_id,
        toolsets: trimmed.length ? trimmed : null,
      });
      setActiveSession((prev) => (prev ? { ...prev, enabled_toolsets: trimmed.length ? trimmed : null } : prev));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }, [session?.session_id, inputValue, setActiveSession]);

  const handleClear = useCallback(async () => {
    if (!session?.session_id) return;
    setLoading(true);
    try {
      await apiPost('/api/session/toolsets', {
        session_id: session.session_id,
        toolsets: null,
      });
      setActiveSession((prev) => (prev ? { ...prev, enabled_toolsets: null } : prev));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }, [session?.session_id, setActiveSession]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        setOpen(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        void handleApply();
      }
    },
    [handleApply],
  );

  return (
    <div ref={wrapRef} className="relative flex-shrink-0 hidden @container/composer:block">
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        title={hasCustom ? `${t('session_toolsets')}: ${label}` : t('session_toolsets')}
        className={cn(
          'inline-flex items-center gap-2 max-w-[180px] px-2.5 py-2 rounded-full border border-transparent bg-transparent font-medium cursor-pointer transition-colors text-xs',
          'hover:text-[var(--text)] hover:bg-[var(--hover-bg)]',
          open && 'text-[var(--text)] bg-[var(--accent-bg)] border-[var(--accent-bg)]',
          hasCustom && 'text-[var(--accent)] border-[var(--accent-bg)]',
        )}
        style={{ color: open || hasCustom ? undefined : 'var(--muted)' }}
      >
        <Wrench className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{label}</span>
        <ChevronDown className={cn('w-3 h-3 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          className="absolute bottom-[calc(100%+4px)] left-0 min-w-[260px] max-w-[320px] rounded-[10px] border border-[var(--border2)] bg-[var(--surface)] z-[200] p-3"
          style={{ boxShadow: '0 -4px 24px rgba(0,0,0,.4)' }}
        >
          <div className="text-xs text-[var(--muted)] mb-2 leading-relaxed">{t('session_toolsets_desc')}</div>
          <div className="text-xs text-[var(--text)] mb-2.5 px-2.5 py-1.5 bg-[var(--hover-bg)] rounded-md break-all">
            {hasCustom ? `🔧 ${label}` : `🌍 ${label}`}
          </div>
          <div className="mb-2.5">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('session_toolsets_placeholder')}
              className="w-full box-border px-2.5 py-2 rounded-md border border-[var(--border2)] bg-[var(--hover-bg)] text-[var(--text)] text-[13px] outline-none transition-colors focus:border-[var(--accent)]"
              disabled={loading}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => void handleClear()}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-md border border-[var(--border2)] bg-transparent text-[var(--muted)] text-xs font-medium cursor-pointer transition-colors hover:bg-[var(--hover-bg)] hover:text-[var(--text)] disabled:opacity-50"
            >
              {t('session_toolsets_clear')}
            </button>
            <button
              onClick={() => void handleApply()}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-md border-none bg-[var(--accent)] text-white text-xs font-medium cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {t('session_toolsets_apply')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
