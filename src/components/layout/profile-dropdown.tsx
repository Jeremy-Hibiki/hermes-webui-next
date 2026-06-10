'use client';

import { useState, useRef, useEffect } from 'react';
import useSWR from 'swr';
import { fetcher, apiPost } from '@/lib/api-client';
import { useAtom } from 'jotai';
import { activeProfileAtom, defaultModelAtom } from '@/atoms/settings';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfilesResponse {
  profiles: { name: string; model?: string; provider?: string }[];
  active: string;
}

export function ProfileDropdown() {
  const { data, mutate } = useSWR<ProfilesResponse>('/profiles', fetcher, { revalidateOnFocus: false });
  const [, setActiveProfile] = useAtom(activeProfileAtom);
  const [, setDefaultModel] = useAtom(defaultModelAtom);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const profiles = data?.profiles ?? [];
  const active = data?.active ?? 'default';

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSwitch = async (name: string) => {
    if (name === active) {
      setOpen(false);
      return;
    }
    try {
      const res = await apiPost<{ active: string; default_model?: string }>('/profile/switch', { name });
      setActiveProfile(res.active);
      if (res.default_model) setDefaultModel(res.default_model);
      void mutate();
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--text)] hover:bg-[var(--hover-bg)] border border-[var(--border)]"
      >
        <span className="truncate max-w-[120px]">{active}</span>
        <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg z-50 py-1">
          {profiles.map((p) => (
            <button
              key={p.name}
              onClick={() => void handleSwitch(p.name)}
              className={cn(
                'w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--hover-bg)]',
                p.name === active ? 'text-[var(--accent)]' : 'text-[var(--text)]',
              )}
            >
              <span className="w-3.5 shrink-0">{p.name === active && <Check className="w-3 h-3" />}</span>
              <span className="truncate">{p.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
