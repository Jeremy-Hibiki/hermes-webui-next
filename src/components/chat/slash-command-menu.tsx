'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface CommandEntry {
  name: string;
  description?: string;
  args?: string[];
  usage?: string;
}

interface CommandsResponse {
  commands: CommandEntry[];
}

interface SlashCommandMenuProps {
  input: string;
  onSelect: (command: string) => void;
  onClose: () => void;
}

export function SlashCommandMenu({ input, onSelect, onClose }: SlashCommandMenuProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const { data } = useSWR<CommandsResponse>('/commands', fetcher, { revalidateOnFocus: false });
  const commands = useMemo(() => data?.commands ?? [], [data]);

  const query = input.startsWith('/') ? input.slice(1).toLowerCase() : '';

  const filtered = useMemo(() => {
    if (!query) return commands.slice(0, 15);
    return commands
      .filter((c) => c.name.toLowerCase().includes(query) || c.description?.toLowerCase().includes(query))
      .slice(0, 15);
  }, [commands, query]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.children[selectedIdx] as HTMLElement;
      selected?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIdx]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (filtered.length === 0) return false;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx((i) => (i + 1) % filtered.length);
        return true;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx((i) => (i - 1 + filtered.length) % filtered.length);
        return true;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const cmd = filtered[selectedIdx];
        if (cmd) onSelect(`/${cmd.name} `);
        return true;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return true;
      }
      return false;
    },
    [filtered, selectedIdx, onSelect, onClose],
  );

  // Expose keydown handler via ref pattern
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      handleKeyDown(e);
    };
    // The parent needs to call this — we use a custom event pattern
    document.addEventListener('slash-command-keydown', handler as EventListener);
    return () => document.removeEventListener('slash-command-keydown', handler as EventListener);
  }, [handleKeyDown]);

  if (filtered.length === 0 || !input.startsWith('/')) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 max-h-64 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg z-50">
      <div ref={listRef} className="overflow-y-auto max-h-64 p-1">
        {filtered.map((cmd, i) => (
          <button
            key={cmd.name}
            onClick={() => onSelect(`/${cmd.name} `)}
            className={cn(
              'w-full text-left px-3 py-2 rounded text-sm flex items-start gap-3 transition-colors',
              i === selectedIdx ? 'bg-[var(--hover-bg)]' : 'hover:bg-[var(--hover-bg)]',
            )}
            onMouseEnter={() => setSelectedIdx(i)}
          >
            <span className="text-[var(--accent)] font-mono shrink-0">/{cmd.name}</span>
            <div className="min-w-0">
              {cmd.description && <div className="text-xs text-[var(--muted)] truncate">{cmd.description}</div>}
              {cmd.usage && <div className="text-[10px] text-[var(--muted)] font-mono mt-0.5">{cmd.usage}</div>}
              {cmd.args && cmd.args.length > 0 && (
                <div className="text-[10px] text-[var(--muted)] mt-0.5">{cmd.args.map((a) => `<${a}>`).join(' ')}</div>
              )}
            </div>
          </button>
        ))}
      </div>
      <div className="border-t border-[var(--border)] px-3 py-1 text-[10px] text-[var(--muted)] flex gap-3">
        <span>↑↓ navigate</span>
        <span>↵ select</span>
        <span>esc dismiss</span>
      </div>
    </div>
  );
}
