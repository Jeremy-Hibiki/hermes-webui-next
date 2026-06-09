'use client';

import { useEffect, useCallback } from 'react';

interface ShortcutMap {
  [key: string]: () => void;
}

function formatShortcut(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.metaKey || e.ctrlKey) parts.push('mod');
  if (e.shiftKey) parts.push('shift');
  if (e.altKey) parts.push('alt');
  parts.push(e.key.toLowerCase());
  return parts.join('+');
}

export function useKeyboardShortcuts(handlers: ShortcutMap) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore when typing in inputs/textareas (except escape)
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      const combo = formatShortcut(e);

      // Escape always works
      if (e.key === 'Escape') {
        if (handlers['escape']) {
          handlers['escape']();
          e.preventDefault();
        }
        return;
      }

      // Skip other shortcuts when typing in inputs
      if (isInput) return;

      if (handlers[combo]) {
        handlers[combo]();
        e.preventDefault();
      }

      // Simple key shortcuts (no modifiers)
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        if (handlers[e.key]) {
          handlers[e.key]();
          e.preventDefault();
        }
      }
    },
    [handlers],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export function KeyboardHelpPanel({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { keys: 'Cmd/Ctrl + K', action: 'New session' },
    { keys: 'Cmd/Ctrl + Shift + P', action: 'Command palette' },
    { keys: 'Escape', action: 'Close modal / dropdown' },
    { keys: '↑ / ↓', action: 'Navigate session list' },
    { keys: '/', action: 'Slash commands' },
    { keys: '?', action: 'Show keyboard shortcuts' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="w-80 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-xl p-4"
        role="document"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Keyboard Shortcuts</h3>
        <div className="space-y-2">
          {shortcuts.map((s) => (
            <div key={s.keys} className="flex items-center justify-between text-xs">
              <span className="text-[var(--muted)]">{s.action}</span>
              <kbd className="px-1.5 py-0.5 rounded border border-[var(--border)] bg-[var(--surface)] font-mono text-[var(--text)]">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-2 border-t border-[var(--border)] text-[10px] text-[var(--muted)] text-center">
          Press Escape to close
        </div>
      </div>
    </div>
  );
}
