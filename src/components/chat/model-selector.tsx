'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api-client';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModelEntry {
  id: string;
  name: string;
  provider: string;
}

interface ModelGroup {
  provider: string;
  provider_id?: string;
  models: { id: string; label?: string }[];
}

interface ModelsResponse {
  active_provider?: string;
  default_model?: string;
  groups: ModelGroup[];
  models?: { id: string; name: string; provider: string }[];
}

function useModels() {
  const { data } = useSWR<ModelsResponse>('/models', fetcher, {
    revalidateOnFocus: false,
  });

  return useMemo(() => {
    if (!data) return [];
    if (data.models?.length) return data.models;
    if (data.groups?.length) {
      return data.groups.flatMap((g) =>
        (g.models || []).map((m) => ({
          id: m.id,
          name: m.label || m.id,
          provider: g.provider_id || g.provider,
        })),
      );
    }
    return [];
  }, [data]);
}

export function ModelSelectorTrigger({
  model,
  open,
  onToggle,
}: {
  model: string | null;
  open: boolean;
  onToggle: () => void;
}) {
  const models = useModels();
  const selectedName = useMemo(() => {
    if (!model) return 'Model';
    const found = models.find((m) => m.id === model);
    return found?.name || model;
  }, [model, models]);

  return (
    <button
      onClick={onToggle}
      className="inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors px-2 py-1 rounded hover:bg-[var(--hover-bg)]"
    >
      <span className="truncate max-w-24">{selectedName}</span>
      <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
    </button>
  );
}

export function ModelDropdownPopover({
  selectedModel,
  onSelect,
  onClose,
  style,
}: {
  selectedModel: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  style?: React.CSSProperties;
}) {
  const models = useModels();
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const grouped = useMemo(() => {
    const map: Record<string, ModelEntry[]> = {};
    for (const m of models) {
      const provider = m.provider || 'Other';
      if (!map[provider]) map[provider] = [];
      map[provider].push(m);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [models]);

  const filtered = useMemo(() => {
    if (!search) return grouped;
    const q = search.toLowerCase();
    return grouped
      .map(([provider, entries]) => [
        provider,
        entries.filter(
          (e) =>
            e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q) || provider.toLowerCase().includes(q),
        ),
      ])
      .filter(([, entries]) => (entries as ModelEntry[]).length > 0) as [string, ModelEntry[]][];
  }, [grouped, search]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-1 w-64 max-h-64 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg z-[200] flex flex-col"
      style={{ boxShadow: '0 -4px 24px rgba(0,0,0,.4)', ...style }}
    >
      <div className="p-2 border-b border-[var(--border)]">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search models..."
          className="w-full text-xs bg-transparent text-[var(--text)] placeholder:text-[var(--muted)] outline-none"
          aria-label="Search models"
          autoFocus
        />
      </div>
      <div className="overflow-y-auto flex-1 p-1">
        {filtered.map(([provider, entries]) => (
          <div key={provider}>
            <div className="px-2 py-1 text-[10px] font-medium text-[var(--muted)] uppercase">{provider}</div>
            {entries.map((m) => (
              <button
                key={m.id}
                onClick={() => onSelect(m.id)}
                className={cn(
                  'w-full text-left px-2 py-1 text-xs rounded hover:bg-[var(--hover-bg)] flex items-center gap-2 transition-colors',
                  selectedModel === m.id && 'text-[var(--accent)]',
                )}
              >
                <span className="truncate flex-1">{m.name}</span>
                {selectedModel === m.id && <Check className="w-3 h-3 shrink-0" />}
              </button>
            ))}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="px-2 py-3 text-xs text-[var(--muted)] text-center">No models found</div>
        )}
      </div>
    </div>
  );
}

// Keep the original ModelSelector for backward compat
export function ModelSelector() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ModelSelectorTrigger model={null} open={open} onToggle={() => setOpen(!open)} />
      {open && (
        <ModelDropdownPopover selectedModel={null} onSelect={() => setOpen(false)} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
