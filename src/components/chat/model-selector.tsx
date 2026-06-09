'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api-client';
import { useAtom } from 'jotai';
import { defaultModelAtom } from '@/atoms/settings';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModelEntry {
  id: string;
  name: string;
  provider: string;
}

interface ModelsResponse {
  models: ModelEntry[];
}

export function ModelSelector() {
  const [model, setModel] = useAtom(defaultModelAtom);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data } = useSWR<ModelsResponse>('/models', fetcher, {
    revalidateOnFocus: false,
  });

  const models = useMemo(() => data?.models ?? [], [data]);

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

  const selectedName = useMemo(() => {
    if (!model) return 'Model';
    const found = models.find((m) => m.id === model);
    return found?.name || model;
  }, [model, models]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors px-2 py-1 rounded hover:bg-[var(--hover-bg)]"
      >
        <span className="truncate max-w-24">{selectedName}</span>
        <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-64 max-h-64 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg z-50 flex flex-col">
          <div className="p-2 border-b border-[var(--border)]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search models..."
              className="w-full text-xs bg-transparent text-[var(--text)] placeholder:text-[var(--muted)] outline-none"
              aria-label="Search models"
            />
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            {filtered.map(([provider, entries]) => (
              <div key={provider}>
                <div className="px-2 py-1 text-[10px] font-medium text-[var(--muted)] uppercase">{provider}</div>
                {entries.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setModel(m.id);
                      setOpen(false);
                      setSearch('');
                      try {
                        localStorage.setItem('hermes-default-model', m.id);
                      } catch {}
                    }}
                    className={cn(
                      'w-full text-left px-2 py-1 text-xs rounded hover:bg-[var(--hover-bg)] flex items-center gap-2 transition-colors',
                      model === m.id && 'text-[var(--accent)]',
                    )}
                  >
                    <span className="truncate flex-1">{m.name}</span>
                    {model === m.id && <Check className="w-3 h-3 shrink-0" />}
                  </button>
                ))}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-2 py-3 text-xs text-[var(--muted)] text-center">No models found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
